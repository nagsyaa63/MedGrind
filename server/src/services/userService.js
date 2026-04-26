const UserRepository = require('../repositories/userRepository');
const User = require('../models/User');
const { updatePoints } = require('../utils/pointsEngine');
const AppError = require('../utils/AppError');
const { MAX_BIO_LENGTH, LEADERBOARD_DEFAULT_LIMIT, LEADERBOARD_MAX_LIMIT, MIN_YEAR, MAX_YEAR } = require('../config/constants');

const defaultUserRepo = new UserRepository(User);

const getProfile = async (userId, { userRepository } = {}) => {
  const repo = userRepository || defaultUserRepo;
  const user = await repo.findById(userId, '-password');
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const updateProfile = async (userId, data, { userRepository } = {}) => {
  const repo = userRepository || defaultUserRepo;
  const { name, collegeName, currentYear, bio } = data;

  if (bio !== undefined && bio.length > MAX_BIO_LENGTH) {
    throw new AppError(`Bio must not exceed ${MAX_BIO_LENGTH} characters`, 400);
  }
  if (currentYear !== undefined && (currentYear < MIN_YEAR || currentYear > MAX_YEAR)) {
    throw new AppError('Current year must be between 1 and 6', 400);
  }
  if (collegeName !== undefined && collegeName.trim() === '') {
    throw new AppError('College name is required', 400);
  }

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (collegeName !== undefined) updateFields.collegeName = collegeName;
  if (currentYear !== undefined) updateFields.currentYear = currentYear;
  if (bio !== undefined) updateFields.bio = bio;

  // Resolve merged state to determine if onboarding is complete
  const existingUser = await repo.findById(userId);
  if (!existingUser) throw new AppError('User not found', 404);
  const resolvedCollegeName = collegeName !== undefined ? collegeName : existingUser.collegeName;
  const resolvedYear = currentYear !== undefined ? currentYear : existingUser.currentYear;
  if (resolvedCollegeName && resolvedYear >= MIN_YEAR && resolvedYear <= MAX_YEAR) {
    updateFields.isOnboarded = true;
  }

  const user = await repo.updateById(userId, updateFields);
  if (!user) throw new AppError('User not found', 404);
  // Exclude password from response
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  return userObj;
};

const getLeaderboard = async (limit = LEADERBOARD_DEFAULT_LIMIT, { userRepository } = {}) => {
  const repo = userRepository || defaultUserRepo;
  const limitNum = Math.min(LEADERBOARD_MAX_LIMIT, Math.max(1, parseInt(limit) || LEADERBOARD_DEFAULT_LIMIT));
  return repo.findLeaderboard(limitNum);
};

const updateStreak = async (userId, { userRepository } = {}) => {
  const repo = userRepository || defaultUserRepo;
  const user = await repo.findById(userId);
  if (!user) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!user.lastActiveDate) {
    user.streak = 1;
    user.lastActiveDate = today;
    await repo.save(user);
    return;
  }

  const lastActive = new Date(user.lastActiveDate);
  const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
  const diffMs = today.getTime() - lastActiveDay.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return;
  } else if (diffDays === 1) {
    user.streak += 1;
    user.lastActiveDate = today;
    await repo.save(user);
    await updatePoints(userId, 'DAILY_STREAK');
  } else {
    user.streak = 1;
    user.lastActiveDate = today;
    await repo.save(user);
  }
};

module.exports = { getProfile, updateProfile, getLeaderboard, updateStreak };
