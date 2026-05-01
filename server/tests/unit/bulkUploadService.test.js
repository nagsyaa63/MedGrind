/**
 * bulkUploadService unit tests
 * Tests row validation and deduplication logic without hitting MongoDB.
 */

// Mock Question model — include generateContentHash using real crypto
jest.mock('../../src/models/Question', () => {
  const crypto = require('crypto');
  return {
    insertMany: jest.fn().mockResolvedValue([]),
    generateContentHash: (text) => {
      const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
      return crypto.createHash('sha256').update(normalized).digest('hex');
    },
  };
});

// Mock taxonomyService
jest.mock('../../src/services/taxonomyService', () => ({
  resolveSubtopic: jest.fn((subtopic) => {
    if (subtopic === 'Brachial Plexus') return { subject: 'Anatomy', topic: 'Upper Limb' };
    return null;
  }),
}));

const { processBulkUpload } = require('../../src/services/bulkUploadService');
const Question = require('../../src/models/Question');

const ADMIN_ID = 'admin123';

const buildCsv = (rows) => {
  const header = 'action,question_text,option_a,option_b,option_c,option_d,correct_options,subtopic,difficulty,explanation';
  return Buffer.from([header, ...rows].join('\n'));
};

const validRow = 'add,What is the brachial plexus?,Nerve network,Artery,Vein,Bone,A,Brachial Plexus,Easy,It is a nerve network';

describe('bulkUploadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Question.insertMany.mockResolvedValue([]);
  });

  it('inserts a valid row successfully', async () => {
    const csv = buildCsv([validRow]);
    const result = await processBulkUpload(csv, ADMIN_ID);
    expect(result.inserted).toBe(1);
    expect(result.failed).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(Question.insertMany).toHaveBeenCalledTimes(1);
  });

  it('result always includes skipped array', async () => {
    const csv = buildCsv([validRow]);
    const result = await processBulkUpload(csv, ADMIN_ID);
    expect(result).toHaveProperty('skipped');
    expect(Array.isArray(result.skipped)).toBe(true);
  });

  it('attaches contentHash (64-char SHA-256 hex) to each inserted document', async () => {
    const csv = buildCsv([validRow]);
    await processBulkUpload(csv, ADMIN_ID);
    const insertedDoc = Question.insertMany.mock.calls[0][0][0];
    expect(insertedDoc).toHaveProperty('contentHash');
    expect(typeof insertedDoc.contentHash).toBe('string');
    expect(insertedDoc.contentHash).toHaveLength(64);
  });

  it('counts duplicate key errors (code 11000) as skipped, not failed', async () => {
    const dupError = new Error('E11000 duplicate key error');
    dupError.writeErrors = [{
      index: 0,
      code: 11000,
      errmsg: 'E11000 duplicate key error collection: medgrind.questions index: contentHash_1',
    }];
    Question.insertMany.mockRejectedValueOnce(dupError);

    const csv = buildCsv([validRow]);
    const result = await processBulkUpload(csv, ADMIN_ID);
    expect(result.inserted).toBe(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toMatch(/Duplicate/);
    expect(result.failed).toHaveLength(0);
  });

  it('rejects row with invalid action', async () => {
    const csv = buildCsv(['update,Q text,A,B,C,D,A,Brachial Plexus,Easy,']);
    const result = await processBulkUpload(csv, ADMIN_ID);
    expect(result.inserted).toBe(0);
    expect(result.failed[0].error).toMatch(/action must be/);
  });

  it('rejects row with missing question_text', async () => {
    const csv = buildCsv(['add,,A,B,C,D,A,Brachial Plexus,Easy,']);
    const result = await processBulkUpload(csv, ADMIN_ID);
    expect(result.failed[0].error).toMatch(/question_text is required/);
  });

  it('rejects row with invalid subtopic', async () => {
    const csv = buildCsv(['add,Q text,A,B,C,D,A,Unknown Subtopic,Easy,']);
    const result = await processBulkUpload(csv, ADMIN_ID);
    expect(result.failed[0].error).toMatch(/Invalid subtopic/);
  });

  it('rejects row with invalid difficulty', async () => {
    const csv = buildCsv(['add,Q text,A,B,C,D,A,Brachial Plexus,Extreme,']);
    const result = await processBulkUpload(csv, ADMIN_ID);
    expect(result.failed[0].error).toMatch(/difficulty must be/);
  });

  it('rejects row with invalid correct_options', async () => {
    const csv = buildCsv(['add,Q text,A,B,C,D,E,Brachial Plexus,Easy,']);
    const result = await processBulkUpload(csv, ADMIN_ID);
    expect(result.failed[0].error).toMatch(/correct_options/);
  });

  it('handles multiple correct options (comma-separated)', async () => {
    const csv = buildCsv(['add,Q text,A,B,C,D,"A,C",Brachial Plexus,Easy,']);
    const result = await processBulkUpload(csv, ADMIN_ID);
    expect(result.inserted).toBe(1);
    const insertedDoc = Question.insertMany.mock.calls[0][0][0];
    expect(insertedDoc.correctOptions).toEqual(['A', 'C']);
    expect(insertedDoc.questionType).toBe('multiple');
  });

  it('processes mixed valid and invalid rows', async () => {
    const csv = buildCsv([
      validRow,
      'add,,A,B,C,D,A,Brachial Plexus,Easy,', // invalid — missing question_text
      validRow,
    ]);
    const result = await processBulkUpload(csv, ADMIN_ID);
    expect(result.inserted).toBe(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].row).toBe(3);
  });

  it('explanation is optional — empty string is accepted', async () => {
    const csv = buildCsv(['add,Q text,A,B,C,D,A,Brachial Plexus,Easy,']);
    const result = await processBulkUpload(csv, ADMIN_ID);
    expect(result.inserted).toBe(1);
    expect(result.failed).toHaveLength(0);
  });
});
