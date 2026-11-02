const db = require('../db/database');

/**
 * Log an administrative action to the admin_activity_logs table
 * @param {number} adminId - ID of the admin performing the action
 * @param {string} action - Action identifier (e.g. 'user_created', 'balance_adjusted')
 * @param {object|string} details - Metadata or description
 * @param {object} req - Express request object for IP and User-Agent
 */
function logAdminActivity(adminId, action, details = {}, req = null) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const userAgent = req ? (req.headers['user-agent'] || 'Unknown') : 'System';
    const detailString = typeof details === 'string' ? details : JSON.stringify(details);

    db.prepare(`
      INSERT INTO admin_activity_logs (admin_id, action, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId || null, action, ip, userAgent, detailString);
  } catch (err) {
    console.error('Failed to log admin activity:', err);
  }
}

module.exports = { logAdminActivity };

