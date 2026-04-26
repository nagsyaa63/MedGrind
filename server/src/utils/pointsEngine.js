const UserRepository = require('../repositories/userRepository');
const User = require('../models/User');
const { POINTS } = require('../config/constants');

const defaultUserRepo = new UserRepository(User);

const updatePoints = async (userId, action, { userRepository } = {}) => {
  const repo = userRepository || defaultUserRepo;
  const delta = POINTS[action];
  if (delta === undefined) {
    throw new Error(`Unknown points action: ${action}`);
  }
  return repo.atomicPointsUpdate(userId, delta);
};

module.exports = { updatePoints, POINTS };
