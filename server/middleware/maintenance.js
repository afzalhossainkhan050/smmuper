const db = require('../db/database');
const jwt = require('jsonwebtoken');

/**
 * SMMuper - Platform Maintenance Mode Enforcer
 * Pauses transactional operations (orders, deposits, child panel purchases)
 * when maintenance_mode is toggled on in settings.
 * Allows administrators and read-only operations through.
 */
function maintenanceCheck(req, res, next) {
  try {
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'maintenance_mode'").get();
    const isMaintenance = row && row.value === '1';

    if (!isMaintenance) {
      return next();
    }

    // Always exempt health check, system status, login, and admin endpoints
    if (
      req.path.startsWith('/api/health') ||
      req.path.startsWith('/api/system') ||
      req.path.startsWith('/api/auth/login') ||
      req.path.startsWith('/api/admin') ||
      req.path === '/sitemap.xml' ||
      req.path === '/robots.txt'
    ) {
      return next();
    }

    // Allow read-only GET requests (e.g. browsing services, FAQs, terms)
    if (req.method === 'GET') {
      return next();
    }

    // Check if requester is an admin by inspecting token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(decoded.id);
        if (user && user.role === 'admin') {
          return next();
        }
      } catch (e) {
        // Token invalid, proceed to maintenance block
      }
    }

    // Block non-admin state-changing requests during maintenance
    return res.status(503).json({
      success: false,
      maintenance: true,
      message: 'SMMuper is currently undergoing scheduled platform maintenance. Transactional operations are temporarily paused. Please check back shortly.'
    });

  } catch (error) {
    console.error('Maintenance middleware error:', error);
    next();
  }
}

module.exports = { maintenanceCheck };

