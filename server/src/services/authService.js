const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/userRepository');
const User = require('../models/User');
const config = require('../config');
const AppError = require('../utils/AppError');
const { JWT_EXPIRY, FIREBASE_TOKEN_MISSING_ERROR, FIREBASE_TOKEN_INVALID_ERROR } = require('../config/constants');

const defaultUserRepo = new UserRepository(User);

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, firebaseUid: user.firebaseUid, role: user.role || 'user' },
    config.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

const firebaseAuth = async (firebaseIdToken, { userRepository } = {}) => {
  const repo = userRepository || defaultUserRepo;

  if (!firebaseIdToken) {
    throw new AppError(FIREBASE_TOKEN_MISSING_ERROR, 400);
  }

  // Lazy-require to allow mocking in tests
  const admin = require('../config/firebase');

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(firebaseIdToken);
  } catch {
    throw new AppError(FIREBASE_TOKEN_INVALID_ERROR, 401);
  }

  const { uid, email, name } = decoded;

  // 1. Look up by firebaseUid
  let user = await repo.findByFirebaseUid(uid);

  if (!user) {
    // 2. Legacy migration: look up by email and atomically set firebaseUid
    const legacyUser = await repo.findByEmailAndSetFirebaseUid(email, uid);

    if (legacyUser) {
      // If legacy user already has both profile fields, mark as onboarded
      if (legacyUser.collegeName && legacyUser.currentYear) {
        user = await repo.updateById(legacyUser._id, { isOnboarded: true });
      } else {
        user = legacyUser;
      }
    } else {
      // 3. Brand-new user — isOnboarded defaults to false via schema
      user = await repo.create({ firebaseUid: uid, email, name });
    }
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

module.exports = { firebaseAuth, getMe };
