const questionService = require('../services/questionService');
const { processBulkUpload } = require('../services/bulkUploadService');
const Question = require('../models/Question');

/**
 * GET /api/admin/questions
 * Admin feed — includes hidden questions, no isAnswered flag needed.
 */
const getAdminQuestions = async (req, res, next) => {
  try {
    const result = await questionService.getQuestionsAdmin(req.query);
    res.json(result);
  } catch (err) { next(err); }
};

/**
 * POST /api/admin/questions/bulk
 * Accepts multipart/form-data with field "file" (CSV).
 * Returns { inserted, skipped, failed }
 */
const bulkUploadQuestions = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required. Upload with field name "file".' });
    }
    const result = await processBulkUpload(req.file.buffer, req.user.id);
    res.status(200).json(result);
  } catch (err) { next(err); }
};

/**
 * DELETE /api/admin/questions/bulk
 * Body: { ids: string[] }
 * Deletes multiple questions in a single DB operation.
 * Returns { deleted: number }
 */
const bulkDeleteQuestions = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array of question IDs' });
    }

    // Cap at 1000 per request to prevent accidental mass-wipe
    if (ids.length > 1000) {
      return res.status(400).json({ error: 'Cannot delete more than 1000 questions in a single request' });
    }

    const result = await Question.deleteMany({ _id: { $in: ids } });
    res.json({ deleted: result.deletedCount });
  } catch (err) { next(err); }
};

module.exports = { getAdminQuestions, bulkUploadQuestions, bulkDeleteQuestions };
