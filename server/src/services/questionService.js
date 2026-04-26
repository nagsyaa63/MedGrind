const QuestionRepository = require('../repositories/questionRepository');
const UserRepository = require('../repositories/userRepository');
const Question = require('../models/Question');
const User = require('../models/User');
const { updatePoints } = require('../utils/pointsEngine');
const AppError = require('../utils/AppError');
const taxonomyService = require('./taxonomyService');
const {
  OPTION_KEYS,
  MAX_QUESTION_TEXT_LENGTH,
  MAX_OPTION_TEXT_LENGTH,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DIFFICULTY_LEVELS,
} = require('../config/constants');

const defaultQuestionRepo = new QuestionRepository(Question);
const defaultUserRepo = new UserRepository(User);

// ─── Shared validation helpers ────────────────────────────────────────────────

const validateOptions = (options) => {
  const optionKeys = Object.keys(options);
  if (optionKeys.length !== 4 || !OPTION_KEYS.every(k => optionKeys.includes(k))) {
    throw new AppError('Options must have exactly keys A, B, C, D', 400);
  }
  for (const key of OPTION_KEYS) {
    if (!options[key] || options[key].length > MAX_OPTION_TEXT_LENGTH) {
      throw new AppError(`Option ${key} must be provided and not exceed ${MAX_OPTION_TEXT_LENGTH} characters`, 400);
    }
  }
};

const validateCorrectOptions = (correctOptions) => {
  if (!Array.isArray(correctOptions) || correctOptions.length === 0) {
    throw new AppError('At least one correct option is required', 400);
  }
  if (!correctOptions.every(o => OPTION_KEYS.includes(o))) {
    throw new AppError('Correct options must be A, B, C, or D', 400);
  }
};

const resolveAndValidateSubtopic = (subtopic) => {
  const resolved = taxonomyService.resolveSubtopic(subtopic);
  if (!resolved) throw new AppError(`Invalid subtopic: "${subtopic}"`, 400);
  return resolved; // { subject, topic }
};

// ─── createQuestion ───────────────────────────────────────────────────────────

const createQuestion = async (data, userId, { questionRepository, userRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const uRepo = userRepository || defaultUserRepo;
  const { questionText, options, correctOptions, subtopic, difficulty, explanation } = data;

  if (!questionText || !options || !correctOptions || !subtopic || !difficulty) {
    throw new AppError('Missing required fields: questionText, options, correctOptions, subtopic, difficulty', 400);
  }

  if (questionText.length > MAX_QUESTION_TEXT_LENGTH) {
    throw new AppError(`Question text must not exceed ${MAX_QUESTION_TEXT_LENGTH} characters`, 400);
  }

  validateOptions(options);
  validateCorrectOptions(correctOptions);

  if (!DIFFICULTY_LEVELS.includes(difficulty)) {
    throw new AppError('Difficulty must be Easy, Medium, or Hard', 400);
  }

  const { subject, topic } = resolveAndValidateSubtopic(subtopic);
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

// ─── getQuestions (user feed — excludes hidden) ───────────────────────────────

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

// ─── getQuestionsAdmin (admin feed — includes hidden) ─────────────────────────

const getQuestionsAdmin = async (filters, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const { subject, topic, subtopic, difficulty, sortBy = 'newest', page = 1, limit = DEFAULT_PAGE_SIZE } = filters;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(limit)));

  const { questions, total } = await qRepo.findWithFiltersAdmin(
    { subject, topic, subtopic, difficulty, sortBy, page: pageNum, limit: limitNum }
  );

  return { questions, total, page: pageNum, limit: limitNum };
};

// ─── getQuestionById ──────────────────────────────────────────────────────────

const getQuestionById = async (id, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const question = await qRepo.findByIdWithPopulate(id, [
    { path: 'author', select: 'name collegeName currentYear points' },
    { path: 'challenges.user', select: 'name' },
  ]);
  if (!question) throw new AppError('Question not found', 404);
  return question;
};

// ─── deleteQuestion (admin only) ──────────────────────────────────────────────

const deleteQuestion = async (id, userId, userRole, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;

  if (userRole !== 'admin') {
    throw new AppError('Only admins can delete questions', 403);
  }

  const question = await qRepo.findById(id);
  if (!question) throw new AppError('Question not found', 404);

  await qRepo.deleteById(id);
  return { message: 'Question deleted' };
};

// ─── updateQuestion (admin only) ──────────────────────────────────────────────

const updateQuestion = async (id, data, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const { questionText, options, correctOptions, subtopic, difficulty, explanation, isHidden } = data;

  const updateFields = {};

  if (questionText !== undefined) {
    if (!questionText.trim()) throw new AppError('Question text cannot be empty', 400);
    if (questionText.length > MAX_QUESTION_TEXT_LENGTH) {
      throw new AppError(`Question text must not exceed ${MAX_QUESTION_TEXT_LENGTH} characters`, 400);
    }
    updateFields.questionText = questionText;
  }

  if (options !== undefined) {
    validateOptions(options);
    updateFields.options = options;
  }

  if (correctOptions !== undefined) {
    validateCorrectOptions(correctOptions);
    updateFields.correctOptions = correctOptions;
    updateFields.questionType = correctOptions.length === 1 ? 'single' : 'multiple';
  }

  if (subtopic !== undefined) {
    const { subject, topic } = resolveAndValidateSubtopic(subtopic);
    updateFields.subject = subject;
    updateFields.topic = topic;
    updateFields.subtopic = subtopic;
  }

  if (difficulty !== undefined) {
    if (!DIFFICULTY_LEVELS.includes(difficulty)) throw new AppError('Difficulty must be Easy, Medium, or Hard', 400);
    updateFields.difficulty = difficulty;
  }

  if (explanation !== undefined) updateFields.explanation = explanation;
  if (isHidden !== undefined) updateFields.isHidden = Boolean(isHidden);

  if (Object.keys(updateFields).length === 0) throw new AppError('No fields to update', 400);

  const question = await qRepo.updateById(id, updateFields);
  if (!question) throw new AppError('Question not found', 404);
  return question;
};

// ─── getChallengedQuestions ───────────────────────────────────────────────────

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

module.exports = {
  createQuestion,
  getQuestions,
  getQuestionsAdmin,
  getQuestionById,
  deleteQuestion,
  updateQuestion,
  getChallengedQuestions,
};
