const QuestionRepository = require('../repositories/questionRepository');
const Question = require('../models/Question');
const { updatePoints } = require('../utils/pointsEngine');
const AppError = require('../utils/AppError');
const { MAX_CHALLENGE_REASONING_LENGTH, OPTION_KEYS, RESOLUTION_THRESHOLD } = require('../config/constants');

const defaultQuestionRepo = new QuestionRepository(Question);

const createChallenge = async (questionId, userId, { reasoning, suggestedCorrectOptions }, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;

  if (reasoning && reasoning.length > MAX_CHALLENGE_REASONING_LENGTH) {
    throw new AppError(`Reasoning must not exceed ${MAX_CHALLENGE_REASONING_LENGTH} characters`, 400);
  }

  if (!Array.isArray(suggestedCorrectOptions) || suggestedCorrectOptions.length === 0) {
    throw new AppError('Suggested correct options are required', 400);
  }
  if (!suggestedCorrectOptions.every(o => OPTION_KEYS.includes(o))) {
    throw new AppError('Suggested correct options must be A, B, C, or D', 400);
  }

  const challenge = await qRepo.addChallenge(questionId, {
    user: userId,
    reasoning: reasoning || '',
    suggestedCorrectOptions,
  });

  if (!challenge) throw new AppError('Question not found', 404);
  return challenge;
};

const voteChallenge = async (questionId, challengeId, userId, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const result = await qRepo.findChallengeById(questionId, challengeId);
  if (!result) throw new AppError('Question or challenge not found', 404);

  const { question, challenge } = result;

  // Check if any challenge on this question is already resolved
  const hasResolved = question.challenges.some(c => c.resolved);
  if (hasResolved) {
    throw new AppError('A challenge on this question has already been resolved', 400);
  }

  // Check duplicate vote
  if (challenge.votes.some(id => id.toString() === userId)) {
    throw new AppError('You have already voted on this challenge', 409);
  }

  // Record vote
  challenge.votes.push(userId);
  challenge.voteCount += 1;

  // Check if any suggestion group has reached the resolution threshold
  // Group all challenges by sorted suggestedCorrectOptions
  const groups = {};
  for (const c of question.challenges) {
    const key = [...c.suggestedCorrectOptions].sort().join(',');
    groups[key] = (groups[key] || 0) + c.voteCount;
  }

  // Find winning group
  let resolved = false;
  for (const [key, totalVotes] of Object.entries(groups)) {
    if (totalVotes >= RESOLUTION_THRESHOLD) {
      const winningOptions = key.split(',');

      // Update question correct options
      question.correctOptions = winningOptions;
      question.questionType = winningOptions.length === 1 ? 'single' : 'multiple';

      // Mark all matching challenges as resolved
      for (const c of question.challenges) {
        const cKey = [...c.suggestedCorrectOptions].sort().join(',');
        if (cKey === key) {
          c.resolved = true;
        }
      }

      // Award points to the first challenger with this suggestion
      const firstChallenger = question.challenges.find(
        c => [...c.suggestedCorrectOptions].sort().join(',') === key
      );
      if (firstChallenger) {
        await updatePoints(firstChallenger.user, 'CHALLENGE_ACCEPTED');
      }

      resolved = true;
      break;
    }
  }

  await qRepo.save(question);
  return { challenge, resolved };
};

module.exports = { createChallenge, voteChallenge };
