const challengeService = require('../services/challengeService');

const createChallenge = async (req, res, next) => {
  try {
    const challenge = await challengeService.createChallenge(req.params.id, req.user.id, req.body);
    res.status(201).json(challenge);
  } catch (err) { next(err); }
};

const voteChallenge = async (req, res, next) => {
  try {
    const result = await challengeService.voteChallenge(req.params.id, req.params.challengeId, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = { createChallenge, voteChallenge };
