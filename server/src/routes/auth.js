const express = require('express');
const router = express.Router();
const { firebaseAuth, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/firebase', authLimiter, firebaseAuth);
router.get('/me', auth, getMe);

module.exports = router;
