const dotenv = require('dotenv');

dotenv.config();

const config = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/medgrind',
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// JWT_SECRET is required in production
if (!config.JWT_SECRET) {
  if (config.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  config.JWT_SECRET = 'dev-secret-do-not-use-in-production';
}

module.exports = config;
