/**
 * requireAdmin middleware
 *
 * Must be used AFTER the `auth` middleware (which sets req.user).
 * Rejects with 403 if the authenticated user is not an admin.
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = requireAdmin;
