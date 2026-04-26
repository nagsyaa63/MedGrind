const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/userRepository');
const User = require('../models/User');
const config = require('../config');
const AppError = require('../utils/AppError');
const { JWT_EXPIRY } = require('../config/constants');

const defaultUserRepo = new UserRepository(User);

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email },
    config.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

const register = async ({ name, email, password, collegeName, currentYear }, { userRepository } = {}) => {
  const repo = userRepository || defaultUserRepo;

  if (!name || !email || !password || !collegeName || currentYear === undefined) {
    throw new AppError('All fields are required: name, email, password, collegeName, currentYear', 400);
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Please provide a valid email address', 400);
  }

  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }
  if (currentYear < 1 || currentYear > 6) {
    throw new AppError('Current year must be between 1 and 6', 400);
  }

  const existingUser = await repo.findByEmail(email);
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  const user = await repo.create({ name, email, password, collegeName, currentYear });
  const token = generateToken(user);
  return { user: user.toJSON(), token };
};

const login = async (email, password, { userRepository } = {}) => {
  const repo = userRepository || defaultUserRepo;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await repo.findByEmail(email);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = generateToken(user);
  return { user: user.toJSON(), token };
};

const getMe = async (userId, { userRepository } = {}) => {
  const repo = userRepository || defaultUserRepo;
  const user = await repo.findById(userId, '-password');
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

module.exports = { register, login, getMe };
