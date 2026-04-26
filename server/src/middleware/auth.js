const jwt = require('jsonwebtoken');
const config = require('../config');
const { updateStreak } = require('../services/userService');

// Simple in-memory cache: userId -> last streak check date string (YYYY-MM-DD)
const streakCache = new Map();

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };

    // Only run streak update once per user per day
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = decoded.userId;
    if (streakCache.get(cacheKey) !== today) {
      streakCache.set(cacheKey, today);
      updateStreak(decoded.userId).catch(() => {});
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = auth;
