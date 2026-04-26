const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { getQuestions, createQuestion, getQuestion, deleteQuestion, updateQuestion, getChallengedQuestions } = require('../controllers/questionController');
const { submitAnswer } = require('../controllers/answerController');
const { toggleLike, toggleDownvote, toggleApproval } = require('../controllers/votingController');
const { createChallenge, voteChallenge } = require('../controllers/challengeController');

router.get('/', auth, getQuestions);
router.post('/', auth, createQuestion);
router.get('/challenged', auth, getChallengedQuestions);
router.get('/:id', auth, getQuestion);

// Admin-only mutations
router.patch('/:id', auth, requireAdmin, updateQuestion);
router.delete('/:id', auth, requireAdmin, deleteQuestion);

router.post('/:id/answer', auth, submitAnswer);

router.post('/:id/like', auth, toggleLike);
router.post('/:id/downvote', auth, toggleDownvote);
router.post('/:id/approve', auth, toggleApproval);

router.post('/:id/challenge', auth, createChallenge);
router.post('/:id/challenge/:challengeId/vote', auth, voteChallenge);

module.exports = router;
