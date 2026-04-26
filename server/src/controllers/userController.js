const userService = require('../services/userService');

const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.params.id);
    res.json(user);
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.json(user);
  } catch (err) { next(err); }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const users = await userService.getLeaderboard(req.query.limit);
    res.json(users);
  } catch (err) { next(err); }
};

module.exports = { getProfile, updateProfile, getLeaderboard };
