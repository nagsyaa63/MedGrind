const questionService = require('../services/questionService');
const { processBulkUpload } = require('../services/bulkUploadService');

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
 * Returns { inserted, failed: [{ row, error }] }
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

module.exports = { getAdminQuestions, bulkUploadQuestions };
