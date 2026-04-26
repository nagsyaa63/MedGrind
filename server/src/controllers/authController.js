const authService = require('../services/authService');

const firebaseAuth = async (req, res, next) => {
  try {
    const result = await authService.firebaseAuth(req.body.firebaseIdToken);
    res.json(result);
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json(user);
  } catch (err) { next(err); }
};

module.exports = { firebaseAuth, getMe };
