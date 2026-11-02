const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique order ID with prefix
 */
function generateOrderId() {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

/**
 * Generate a unique transaction ID
 */
function generateTransactionId() {
  return 'TXN-' + uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
}

/**
 * Generate API key for users
 */
function generateApiKey() {
  return 'smm_' + uuidv4().replace(/-/g, '') + '_' + Date.now().toString(36);
}

/**
 * Generate unique referral code for users
 */
function generateReferralCode(username = '') {
  const clean = username.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return (clean || 'SMM') + rand;
}

/**
 * Calculate charge based on rate and quantity
 * Rate is price per 1000
 */
function calculateCharge(rate, quantity) {
  return parseFloat(((rate * quantity) / 1000).toFixed(4));
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return parseFloat(amount).toFixed(2);
}

/**
 * Paginate results helper
 */
function paginate(page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
}

/**
 * Build pagination metadata
 */
function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  };
}

/**
 * Sanitize user object - remove password, attach role permissions & balance
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  safeUser.balance = parseFloat(safeUser.balance || 0);
  if (safeUser.role === 'admin') {
    safeUser.permissions = ['*'];
    safeUser.role_title = 'Super Administrator';
  } else if (safeUser.role === 'staff') {
    safeUser.permissions = safeUser.permissions || ['tickets.*', 'orders.view', 'users.view'];
    safeUser.role_title = 'Staff Member';
  } else {
    safeUser.permissions = ['customer'];
    safeUser.role_title = 'Customer';
  }
  return safeUser;
}

/**
 * Standard API success response
 */
function successResponse(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
}

/**
 * Standard API error response
 */
function errorResponse(res, message = 'An error occurred', statusCode = 400, errors = null) {
  const response = {
    success: false,
    message
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
}

module.exports = {
  generateOrderId,
  generateTransactionId,
  generateApiKey,
  generateReferralCode,
  calculateCharge,
  formatCurrency,
  paginate,
  paginationMeta,
  sanitizeUser,
  successResponse,
  errorResponse
};
