const votingService = require('../services/votingService');

const toggleLike = async (req, res, next) => {
  try {
    const question = await votingService.toggleLike(req.params.id, req.user.id);
    res.json(question);
  } catch (err) { next(err); }
};

const toggleDownvote = async (req, res, next) => {
  try {
    const question = await votingService.toggleDownvote(req.params.id, req.user.id);
    res.json(question);
  } catch (err) { next(err); }
};

const toggleApproval = async (req, res, next) => {
  try {
    const question = await votingService.toggleApproval(req.params.id, req.user.id);
    res.json(question);
  } catch (err) { next(err); }
};

module.exports = { toggleLike, toggleDownvote, toggleApproval };
