const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getProfile, updateProfile, getLeaderboard } = require('../controllers/userController');

router.get('/leaderboard', auth, getLeaderboard);
router.get('/:id', auth, getProfile);
router.put('/profile', auth, updateProfile);

module.exports = router;
