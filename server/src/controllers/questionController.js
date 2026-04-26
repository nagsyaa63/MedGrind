const questionService = require('../services/questionService');

const getQuestions = async (req, res, next) => {
  try {
    const result = await questionService.getQuestions(req.query, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
};

const createQuestion = async (req, res, next) => {
  try {
    const question = await questionService.createQuestion(req.body, req.user.id);
    res.status(201).json(question);
  } catch (err) { next(err); }
};

const getQuestion = async (req, res, next) => {
  try {
    const question = await questionService.getQuestionById(req.params.id);
    res.json(question);
  } catch (err) { next(err); }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const result = await questionService.deleteQuestion(req.params.id, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
};

const getChallengedQuestions = async (req, res, next) => {
  try {
    const result = await questionService.getChallengedQuestions(req.query, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = { getQuestions, createQuestion, getQuestion, deleteQuestion, getChallengedQuestions };
