const QuestionRepository = require('../repositories/questionRepository');
const Question = require('../models/Question');
const { updatePoints } = require('../utils/pointsEngine');
const AppError = require('../utils/AppError');
const { AUTO_HIDE_NET_DOWNVOTES } = require('../config/constants');

const defaultQuestionRepo = new QuestionRepository(Question);

const toggleLike = async (questionId, userId, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const question = await qRepo.findById(questionId);
  if (!question) throw new AppError('Question not found', 404);
  if (question.author.toString() === userId) throw new AppError('Cannot vote on your own question', 403);

  const hasLiked = question.likes.some(id => id.toString() === userId);
  const hasDownvoted = question.downvotes.some(id => id.toString() === userId);

  if (hasLiked) {
    question.likes.pull(userId);
    question.likeCount -= 1;
    await qRepo.save(question);
    await updatePoints(question.author, 'LIKE_REMOVED');
  } else {
    if (hasDownvoted) {
      question.downvotes.pull(userId);
      question.downvoteCount -= 1;
      await updatePoints(question.author, 'DOWNVOTE_REMOVED');
    }
    question.likes.push(userId);
    question.likeCount += 1;
    await qRepo.save(question);
    await updatePoints(question.author, 'QUESTION_LIKED');
  }
  return question;
};

const toggleDownvote = async (questionId, userId, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const question = await qRepo.findById(questionId);
  if (!question) throw new AppError('Question not found', 404);
  if (question.author.toString() === userId) throw new AppError('Cannot vote on your own question', 403);

  const hasDownvoted = question.downvotes.some(id => id.toString() === userId);
  const hasLiked = question.likes.some(id => id.toString() === userId);

  if (hasDownvoted) {
    question.downvotes.pull(userId);
    question.downvoteCount -= 1;
    await qRepo.save(question);
    await updatePoints(question.author, 'DOWNVOTE_REMOVED');
  } else {
    if (hasLiked) {
      question.likes.pull(userId);
      question.likeCount -= 1;
      await updatePoints(question.author, 'LIKE_REMOVED');
    }
    question.downvotes.push(userId);
    question.downvoteCount += 1;
    await qRepo.save(question);
    await updatePoints(question.author, 'QUESTION_DOWNVOTED');

    const netDownvotes = question.downvoteCount - question.likeCount;
    if (netDownvotes >= AUTO_HIDE_NET_DOWNVOTES && !question.isHidden) {
      question.isHidden = true;
      await qRepo.save(question);
      await updatePoints(question.author, 'QUESTION_AUTO_HIDDEN');
    }
  }
  return question;
};

const toggleApproval = async (questionId, userId, { questionRepository } = {}) => {
  const qRepo = questionRepository || defaultQuestionRepo;
  const question = await qRepo.findById(questionId);
  if (!question) throw new AppError('Question not found', 404);
  if (question.author.toString() === userId) throw new AppError('Cannot vote on your own question', 403);

  const hasApproved = question.approvals.some(id => id.toString() === userId);

  if (hasApproved) {
    question.approvals.pull(userId);
    question.approvalCount -= 1;
    await qRepo.save(question);
    await updatePoints(question.author, 'APPROVAL_REMOVED');
  } else {
    question.approvals.push(userId);
    question.approvalCount += 1;
    await qRepo.save(question);
    await updatePoints(question.author, 'QUESTION_APPROVED');
  }
  return question;
};

module.exports = { toggleLike, toggleDownvote, toggleApproval };
