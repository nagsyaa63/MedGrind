/**
 * bulkUploadService.js
 *
 * Processes a CSV file stream and bulk-inserts questions into MongoDB.
 *
 * Design for scale (lakhs of rows):
 * - Streams the CSV — never loads the entire file into memory
 * - Validates each row before inserting
 * - Batches inserts (BATCH_SIZE rows per insertMany call)
 * - Returns { inserted, failed: [{ row, error }] } for full transparency
 *
 * CSV Headers (case-insensitive, trimmed):
 *   action          — must be "add" (extensible in future)
 *   question_text   — required, max 1000 chars
 *   option_a        — required, max 300 chars
 *   option_b        — required, max 300 chars
 *   option_c        — required, max 300 chars
 *   option_d        — required, max 300 chars
 *   correct_options — required, comma-separated subset of A,B,C,D (e.g. "A" or "A,C")
 *   subtopic        — required, must exist in taxonomy
 *   difficulty      — required, one of Easy/Medium/Hard
 *   explanation     — optional
 */

const { parse } = require('csv-parse');
const { Readable } = require('stream');
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

// ─── Row validation ───────────────────────────────────────────────────────────

function validateRow(row, rowIndex) {
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

  // Resolve taxonomy
  const resolved = taxonomyService.resolveSubtopic(subtopic);
  if (!resolved) {
    return { valid: false, error: `Invalid subtopic: "${subtopic}"` };
  }

  const explanation = (row.explanation || '').trim();

  return {
    valid: true,
    doc: {
      questionText,
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

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * @param {Buffer} fileBuffer   — CSV file buffer from multer
 * @param {string} adminUserId  — ObjectId string of the admin performing the upload
 * @returns {Promise<{ inserted: number, failed: Array<{ row: number, error: string }> }>}
 */
async function processBulkUpload(fileBuffer, adminUserId) {
  return new Promise((resolve, reject) => {
    const results = { inserted: 0, failed: [] };
    let batch = [];
    let rowIndex = 1; // 1-based (header is row 0)
    let processingPromise = Promise.resolve();

    const parser = parse({
      columns: (header) => header.map(h => h.trim().toLowerCase().replace(/\s+/g, '_')),
      skip_empty_lines: true,
      trim: true,
      bom: true, // handle Excel BOM
    });

    const flushBatch = async (batchToFlush) => {
      if (batchToFlush.length === 0) return;
      try {
        await Question.insertMany(batchToFlush, { ordered: false });
        results.inserted += batchToFlush.length;
      } catch (err) {
        // insertMany with ordered:false — some may succeed, some fail
        if (err.writeErrors) {
          // Count successful inserts
          const failedIndexes = new Set(err.writeErrors.map(e => e.index));
          results.inserted += batchToFlush.length - failedIndexes.size;
          for (const writeErr of err.writeErrors) {
            const doc = batchToFlush[writeErr.index];
            results.failed.push({
              row: doc._csvRow,
              error: writeErr.errmsg || 'Database insert error',
            });
          }
        } else {
          // Entire batch failed
          for (const doc of batchToFlush) {
            results.failed.push({ row: doc._csvRow, error: err.message });
          }
        }
      }
    };

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        rowIndex++;
        const currentRow = rowIndex;
        const { valid, doc, error } = validateRow(record, currentRow);

        if (!valid) {
          results.failed.push({ row: currentRow, error });
          continue;
        }

        // Attach metadata for error reporting; will be stripped before insert
        batch.push({
          ...doc,
          author: adminUserId,
          _csvRow: currentRow,
        });

        if (batch.length >= BATCH_SIZE) {
          const batchToFlush = batch.map(({ _csvRow, ...rest }) => rest);
          const rowMap = batch.map(d => d._csvRow);
          batch = [];

          // Chain promises to maintain order and avoid overwhelming the DB
          processingPromise = processingPromise.then(async () => {
            // Re-attach row numbers for error reporting
            const docsWithRows = batchToFlush.map((d, i) => ({ ...d, _csvRow: rowMap[i] }));
            await flushBatch(docsWithRows);
          });
        }
      }
    });

    parser.on('error', (err) => {
      reject(new Error(`CSV parse error: ${err.message}`));
    });

    parser.on('end', () => {
      // Flush remaining batch
      const remaining = batch.map(({ _csvRow, ...rest }) => ({ ...rest, _csvRow: batch.find(d => d.questionText === rest.questionText)?._csvRow }));
      const remainingWithRows = batch.slice();

      processingPromise = processingPromise.then(async () => {
        if (remainingWithRows.length > 0) {
          const docsForInsert = remainingWithRows.map(({ _csvRow, ...rest }) => rest);
          const rowMap = remainingWithRows.map(d => d._csvRow);
          const docsWithRows = docsForInsert.map((d, i) => ({ ...d, _csvRow: rowMap[i] }));
          await flushBatch(docsWithRows);
        }
      });

      processingPromise.then(() => resolve(results)).catch(reject);
    });

    // Feed the buffer into the parser
    const readable = Readable.from(fileBuffer);
    readable.pipe(parser);
  });
}

module.exports = { processBulkUpload };
