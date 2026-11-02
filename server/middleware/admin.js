const { errorResponse } = require('../utils/helpers');

/**
 * Admin Role Middleware
 * Must be used after authenticate middleware
 */
function isAdmin(req, res, next) {
  if (!req.user) {
    return errorResponse(res, 'Authentication required.', 401);
  }

  if (req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied. Admin privileges required.', 403);
  }

  next();
}

module.exports = { isAdmin };
