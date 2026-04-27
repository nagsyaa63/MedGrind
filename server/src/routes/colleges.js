const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getAll } = require('../controllers/collegeController');

// Auth required — same as all other API routes
router.get('/', auth, getAll);

module.exports = router;
