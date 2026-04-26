const rateLimit = require('express-rate-limit');
const { AUTH_RATE_LIMIT_WINDOW_MS, AUTH_RATE_LIMIT_MAX } = require('../config/constants');

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter };
