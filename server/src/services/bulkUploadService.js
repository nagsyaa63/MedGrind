/**
 * bulkUploadService.js
 *
 * Processes a CSV file stream and bulk-inserts questions into MongoDB.
 *
 * Design for scale (lakhs of rows):
 * - Streams the CSV — never loads the entire file into memory
 * - Validates each row before inserting
 * - Generates a SHA-256 contentHash per row for deduplication
 * - Batches inserts (BATCH_SIZE rows per insertMany call)
 * - Returns { inserted, skipped, failed } for full transparency
 *   - inserted: new questions added
 *   - skipped:  duplicates detected (same question already exists)
 *   - failed:   rows with validation errors or unexpected DB errors
 *
 * Deduplication strategy:
 *   A SHA-256 hash of the normalized questionText (lowercase + collapsed whitespace)
 *   is stored as `contentHash` on each Question document with a unique sparse index.
 *   When insertMany encounters a duplicate key error (code 11000) on contentHash,
 *   the row is counted as `skipped` (not `failed`) so the admin knows it was a
 *   duplicate, not a data error.
 *
 * CSV Headers (case-insensitive, trimmed):
 *   action          — must be "add" (extensible in future)
 *   question_text   — required, max 1000 chars
 *   option_a–d      — required, max 300 chars each
 *   correct_options — required, comma-separated subset of A,B,C,D
 *   subtopic        — required, must exist in taxonomy
 *   difficulty      — required, one of Easy/Medium/Hard
 *   explanation     — optional
 */

const { parse } = require('csv-parse');
const { Readable } = require('stream');
const { generateContentHash } = require('../models/Question');
const Question = require('../models/Question');
const taxonomyService = require('./taxonomyService');
const {
  OPTION_KEYS,
  MAX_QUESTION_TEXT_LENGTH,
  MAX_OPTION_TEXT_LENGTH,
  DIFFICULTY_LEVELS,
} = require('../config/constants');

const BATCH_SIZE = 500;
const SUPPORTED_ACTIONS = ['add'];
const MONGO_DUPLICATE_KEY = 11000;

// ─── Row validation ───────────────────────────────────────────────────────────

function validateRow(row) {
  const errors = [];

  const action = (row.action || '').trim().toLowerCase();
  if (!SUPPORTED_ACTIONS.includes(action)) {
    errors.push(`action must be one of: ${SUPPORTED_ACTIONS.join(', ')}`);
  }

  const questionText = (row.question_text || '').trim();
  if (!questionText) errors.push('question_text is required');
  else if (questionText.length > MAX_QUESTION_TEXT_LENGTH) errors.push(`question_text exceeds ${MAX_QUESTION_TEXT_LENGTH} chars`);

  const options = {};
  for (const key of OPTION_KEYS) {
    const val = (row[`option_${key.toLowerCase()}`] || '').trim();
    if (!val) errors.push(`option_${key.toLowerCase()} is required`);
    else if (val.length > MAX_OPTION_TEXT_LENGTH) errors.push(`option_${key.toLowerCase()} exceeds ${MAX_OPTION_TEXT_LENGTH} chars`);
    options[key] = val;
  }

  const rawCorrect = (row.correct_options || '').trim().toUpperCase();
  const correctOptions = rawCorrect ? rawCorrect.split(',').map(s => s.trim()).filter(Boolean) : [];
  if (correctOptions.length === 0) errors.push('correct_options is required');
  else if (!correctOptions.every(o => OPTION_KEYS.includes(o))) errors.push('correct_options must be comma-separated subset of A,B,C,D');

  const subtopic = (row.subtopic || '').trim();
  if (!subtopic) errors.push('subtopic is required');

  const difficulty = (row.difficulty || '').trim();
  if (!difficulty) errors.push('difficulty is required');
  else if (!DIFFICULTY_LEVELS.includes(difficulty)) errors.push(`difficulty must be one of: ${DIFFICULTY_LEVELS.join(', ')}`);

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }

  const resolved = taxonomyService.resolveSubtopic(subtopic);
  if (!resolved) {
    return { valid: false, error: `Invalid subtopic: "${subtopic}"` };
  }

  const explanation = (row.explanation || '').trim();
  const contentHash = generateContentHash(questionText);

  return {
    valid: true,
    doc: {
      questionText,
      contentHash,
      options,
      correctOptions,
      questionType: correctOptions.length === 1 ? 'single' : 'multiple',
      subject: resolved.subject,
      topic: resolved.topic,
      subtopic,
      difficulty,
      explanation,
    },
  };
}

// ─── Batch flush ──────────────────────────────────────────────────────────────

async function flushBatch(batchWithRows, results) {
  if (batchWithRows.length === 0) return;

  const docsForInsert = batchWithRows.map(({ _csvRow, ...rest }) => rest);

  try {
    await Question.insertMany(docsForInsert, { ordered: false });
    results.inserted += docsForInsert.length;
  } catch (err) {
    if (err.writeErrors) {
      const failedIndexes = new Set(err.writeErrors.map(e => e.index));
      results.inserted += docsForInsert.length - failedIndexes.size;

      for (const writeErr of err.writeErrors) {
        const csvRow = batchWithRows[writeErr.index]._csvRow;
        const isDuplicate =
          writeErr.code === MONGO_DUPLICATE_KEY ||
          writeErr.err?.code === MONGO_DUPLICATE_KEY ||
          (writeErr.errmsg || '').includes('contentHash');

        if (isDuplicate) {
          results.skipped.push({
            row: csvRow,
            reason: 'Duplicate question — already exists in the database',
          });
        } else {
          results.failed.push({
            row: csvRow,
            error: writeErr.errmsg || 'Database insert error',
          });
        }
      }
    } else {
      for (const doc of batchWithRows) {
        results.failed.push({ row: doc._csvRow, error: err.message });
      }
    }
  }
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * @param {Buffer} fileBuffer   — CSV file buffer from multer
 * @param {string} adminUserId  — ObjectId string of the admin performing the upload
 * @returns {Promise<{
 *   inserted: number,
 *   skipped:  Array<{ row: number, reason: string }>,
 *   failed:   Array<{ row: number, error: string }>
 * }>}
 */
async function processBulkUpload(fileBuffer, adminUserId) {
  return new Promise((resolve, reject) => {
    const results = { inserted: 0, skipped: [], failed: [] };
    let batch = [];
    let rowIndex = 1; // 1-based (header is row 1, first data row is 2)
    let processingPromise = Promise.resolve();

    const parser = parse({
      columns: (header) => header.map(h => h.trim().toLowerCase().replace(/\s+/g, '_')),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        rowIndex++;
        const currentRow = rowIndex;
        const { valid, doc, error } = validateRow(record);

        if (!valid) {
          results.failed.push({ row: currentRow, error });
          continue;
        }

        batch.push({ ...doc, author: adminUserId, _csvRow: currentRow });

        if (batch.length >= BATCH_SIZE) {
          const batchToFlush = batch.slice();
          batch = [];
          processingPromise = processingPromise.then(() => flushBatch(batchToFlush, results));
        }
      }
    });

    parser.on('error', (err) => {
      reject(new Error(`CSV parse error: ${err.message}`));
    });

    parser.on('end', () => {
      const remaining = batch.slice();
      processingPromise = processingPromise.then(() => flushBatch(remaining, results));
      processingPromise.then(() => resolve(results)).catch(reject);
    });

    Readable.from(fileBuffer).pipe(parser);
  });
}

module.exports = { processBulkUpload };
