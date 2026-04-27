const collegeService = require('../services/collegeService');

/**
 * GET /api/colleges
 * Returns the full list of college name strings.
 */
const getAll = (req, res) => {
  res.json(collegeService.getAll());
};

module.exports = { getAll };
