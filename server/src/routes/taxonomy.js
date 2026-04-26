const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getAll, getTopics, getSubtopics } = require('../controllers/taxonomyController');

// All taxonomy endpoints require auth (same as all other API routes)
router.get('/', auth, getAll);
router.get('/:subject/topics', auth, getTopics);
router.get('/:subject/topics/:topic/subtopics', auth, getSubtopics);

module.exports = router;
