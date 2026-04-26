const AnswerRepository = require('../repositories/answerRepository');
const QuestionRepository = require('../repositories/questionRepository');
const UserRepository = require('../repositories/userRepository');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const { updatePoints } = require('../utils/pointsEngine');
const AppError = require('../utils/AppError');
const { OPTION_KEYS } = require('../config/constants');

const defaultAnswerRepo = new AnswerRepository(Answer);
const defaultQuestionRepo = new QuestionRepository(Question);
const defaultUserRepo = new UserRepository(User);

const submitAnswer = async (questionId, userId, selectedOptions, { answerRepository, questionRepository, userRepository } = {}) => {
  const aRepo = answerRepository || defaultAnswerRepo;
  const qRepo = questionRepository || defaultQuestionRepo;
  const uRepo = userRepository || defaultUserRepo;

  if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) {
    throw new AppError('Selected options are required', 400);
  }
  if (!selectedOptions.every(o => OPTION_KEYS.includes(o))) {
    throw new AppError('Selected options must be A, B, C, or D', 400);
  }

  const question = await qRepo.findById(questionId);
  if (!question) throw new AppError('Question not found', 404);

  const correctSet = new Set(question.correctOptions);
  const selectedSet = new Set(selectedOptions);
  const isCorrect = correctSet.size === selectedSet.size && [...correctSet].every(o => selectedSet.has(o));

  let answer;
  try {
    answer = await aRepo.create({ user: userId, question: questionId, selectedOptions, isCorrect });
  } catch (err) {
    if (err.code === 11000) throw new AppError('You have already answered this question', 409);
    throw err;
  }

  const questionUpdate = { $inc: { totalAttempts: 1 } };
  if (isCorrect) questionUpdate.$inc.correctAttempts = 1;
  await qRepo.updateById(questionId, questionUpdate);

  const userUpdate = { questionsAnswered: 1 };
  if (isCorrect) userUpdate.correctAnswers = 1;
  await uRepo.incrementFields(userId, userUpdate);

  if (isCorrect) await updatePoints(userId, 'CORRECT_ANSWER');

  return { answer, isCorrect, correctOptions: question.correctOptions, explanation: question.explanation };
};

module.exports = { submitAnswer };
