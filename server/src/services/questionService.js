const QuestionRepository = require('../repositories/questionRepository');
const UserRepository = require('../repositories/userRepository');
const Question = require('../models/Question');
const User = require('../models/User');
const { updatePoints } = require('../utils/pointsEngine');
const AppError = require('../utils/AppError');
const taxonomyService = require('./taxonomyService');
const {
  ALLOWED_SUBJECTS,
  OPTION_KEYS,
  MAX_QUESTION_TEXT_LENGTH,
  MAX_OPTION_TEXT_LENGTH,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DIFFICULTY_LEVELS,
} = require('../config/constants');

const defaultQuestionRepo = new QuestionRepository(Question);
const defaultUserRepo = new UserRepository(User);

const createQuestion = async (data, userId, { questionRepository, userRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const uRepo = userRepository || defaultUserRepo;
  const { questionText, options, correctOptions, subtopic, difficulty, explanation } = data;

  // subtopic is required; subject + topic are derived from taxonomy
  if (!questionText || !options || !correctOptions || !subtopic || !difficulty) {
    throw new AppError('Missing required fields: questionText, options, correctOptions, subtopic, difficulty', 400);
  }

  const optionKeys = Object.keys(options);
  if (optionKeys.length !== 4 || !OPTION_KEYS.every(k => optionKeys.includes(k))) {
    throw new AppError('Options must have exactly keys A, B, C, D', 400);
  }

  if (questionText.length > MAX_QUESTION_TEXT_LENGTH) {
    throw new AppError(`Question text must not exceed ${MAX_QUESTION_TEXT_LENGTH} characters`, 400);
  }
  for (const key of OPTION_KEYS) {
    if (!options[key] || options[key].length > MAX_OPTION_TEXT_LENGTH) {
      throw new AppError(`Option ${key} must be provided and not exceed ${MAX_OPTION_TEXT_LENGTH} characters`, 400);
    }
  }

  if (!Array.isArray(correctOptions) || correctOptions.length === 0) {
    throw new AppError('At least one correct option is required', 400);
  }
  if (!correctOptions.every(o => OPTION_KEYS.includes(o))) {
    throw new AppError('Correct options must be A, B, C, or D', 400);
  }

  if (!DIFFICULTY_LEVELS.includes(difficulty)) {
    throw new AppError('Difficulty must be Easy, Medium, or Hard', 400);
  }

  // Resolve subject + topic from subtopic via taxonomy
  const resolved = taxonomyService.resolveSubtopic(subtopic);
  if (!resolved) {
    throw new AppError(`Invalid subtopic: "${subtopic}"`, 400);
  }
  const { subject, topic } = resolved;

  const questionType = correctOptions.length === 1 ? 'single' : 'multiple';

  const question = await qRepo.create({
    author: userId,
    questionText,
    options,
    correctOptions,
    questionType,
    subject,
    topic,
    subtopic,
    difficulty,
    explanation: explanation || '',
  });

  await updatePoints(userId, 'ADD_QUESTION');
  await uRepo.incrementFields(userId, { questionsAdded: 1 });

  return question;
};

const getQuestions = async (filters, userId, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const { subject, topic, subtopic, difficulty, sortBy = 'newest', page = 1, limit = DEFAULT_PAGE_SIZE } = filters;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(limit)));

  const { questions, total } = await qRepo.findWithFilters(
    { subject, topic, subtopic, difficulty, sortBy, page: pageNum, limit: limitNum },
    userId
  );

  return { questions, total, page: pageNum, limit: limitNum };
};

const getQuestionById = async (id, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const question = await qRepo.findByIdWithPopulate(id, [
    { path: 'author', select: 'name collegeName currentYear points' },
    { path: 'challenges.user', select: 'name' },
  ]);
  if (!question) throw new AppError('Question not found', 404);
  return question;
};

const deleteQuestion = async (id, userId, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const question = await qRepo.findById(id);
  if (!question) throw new AppError('Question not found', 404);
  if (question.author.toString() !== userId) throw new AppError('Not authorized to delete this question', 403);
  await qRepo.deleteById(id);
  return { message: 'Question deleted' };
};

const getChallengedQuestions = async (filters = {}, userId, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const { subject, difficulty, sortBy = 'mostChallenged', page = 1, limit = DEFAULT_PAGE_SIZE } = filters;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(limit)));

  return qRepo.findChallengedQuestions({
    subject,
    difficulty,
    sortBy,
    page: pageNum,
    limit: limitNum,
  });
};

module.exports = { createQuestion, getQuestions, getQuestionById, deleteQuestion, getChallengedQuestions };
