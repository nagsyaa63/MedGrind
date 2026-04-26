const answerService = require('../services/answerService');

const submitAnswer = async (req, res, next) => {
  try {
    const result = await answerService.submitAnswer(req.params.id, req.user.id, req.body.selectedOptions);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

module.exports = { submitAnswer };
