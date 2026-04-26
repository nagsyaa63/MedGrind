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

  // Determine if this email is in the admin whitelist
  const isAdminEmail = config.ADMIN_EMAILS.includes(email.toLowerCase());

  // 1. Look up by firebaseUid
  let user = await repo.findByFirebaseUid(uid);

  if (!user) {
    // 2. Legacy migration: look up by email and atomically set firebaseUid
    const legacyUser = await repo.findByEmailAndSetFirebaseUid(email, uid);

    if (legacyUser) {
      const updates = {};
      // Promote to admin if email is whitelisted
      if (isAdminEmail && legacyUser.role !== 'admin') updates.role = 'admin';
      // Admins are always considered onboarded — no college/year needed
      if (isAdminEmail) updates.isOnboarded = true;
      // Regular legacy users: mark onboarded if profile is complete
      else if (legacyUser.collegeName && legacyUser.currentYear) updates.isOnboarded = true;

      user = Object.keys(updates).length > 0
        ? await repo.updateById(legacyUser._id, updates)
        : legacyUser;
    } else {
      // 3. Brand-new user
      user = await repo.create({
        firebaseUid: uid,
        email,
        name,
        // Admins skip onboarding entirely
        ...(isAdminEmail ? { role: 'admin', isOnboarded: true } : {}),
      });
    }
  } else {
    // Existing user — promote to admin if newly added to whitelist
    const updates = {};
    if (isAdminEmail && user.role !== 'admin') updates.role = 'admin';
    if (isAdminEmail && !user.isOnboarded) updates.isOnboarded = true;
    if (Object.keys(updates).length > 0) {
      user = await repo.updateById(user._id, updates);
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
