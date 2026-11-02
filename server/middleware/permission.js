const db = require('../db/database');
const { errorResponse } = require('../utils/helpers');

/**
 * Check if the authenticated user has a specific permission
 * @param {string} requiredPermission - Permission string (e.g. 'users.manage', 'currencies.manage')
 */
function hasPermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required.', 401);
    }

    // Super Admin has universal access
    if (req.user.role === 'admin' && (!req.user.permissions || req.user.permissions.includes('*'))) {
      return next();
    }

    // Check staff permissions from DB
    try {
      const staffMember = db.prepare(`
        SELECT s.*, r.permissions 
        FROM staff s
        JOIN roles r ON s.role_id = r.id
        WHERE s.user_id = ? AND s.status = 'active' AND r.status = 'active'
      `).get(req.user.id);

      if (!staffMember) {
        // If not in staff table but role is admin, allow
        if (req.user.role === 'admin') return next();
        return errorResponse(res, 'Access denied. You do not have staff permissions.', 403);
      }

      const permissions = JSON.parse(staffMember.permissions || '[]');
      
      if (permissions.includes('*')) {
        return next();
      }

      // Check direct permission match or wildcard module match (e.g. 'users.*' covers 'users.manage')
      const [moduleName] = requiredPermission.split('.');
      const hasDirect = permissions.includes(requiredPermission);
      const hasModuleWildcard = permissions.includes(`${moduleName}.*`);

      if (hasDirect || hasModuleWildcard) {
        return next();
      }

      return errorResponse(res, `Access denied. Requires permission: '${requiredPermission}'`, 403);
    } catch (err) {
      console.error('Permission check error:', err);
      return errorResponse(res, 'Permission verification failed.', 500);
    }
  };
}

module.exports = { hasPermission };

