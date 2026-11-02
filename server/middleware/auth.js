const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/helpers');

/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches user to request
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return errorResponse(res, 'Access denied. No token provided.', 401);
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return errorResponse(res, 'Access denied. Invalid token format. Use: Bearer <token>', 401);
    }

    const token = parts[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data from DB
    const db = require('../db/database');
    const user = db.prepare('SELECT id, username, email, balance, role, api_key, status, created_at FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return errorResponse(res, 'User not found. Token may be invalid.', 401);
    }

    if (user.status !== 'active') {
      return errorResponse(res, `Account is ${user.status}. Please contact support.`, 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token has expired. Please login again.', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token.', 401);
    }
    return errorResponse(res, 'Authentication failed.', 500);
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return next();

    const token = parts[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const db = require('../db/database');
    const user = db.prepare('SELECT id, username, email, balance, role, api_key, status, created_at FROM users WHERE id = ?').get(decoded.id);

    if (user && user.status === 'active') {
      req.user = user;
    }
  } catch (_) {
    // Silently continue without auth
  }
  next();
}

/**
 * API Key authentication middleware
 * For external API access
 */
function apiKeyAuth(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      return errorResponse(res, 'API key is required. Provide via X-API-Key header or api_key query parameter.', 401);
    }

    const db = require('../db/database');
    const user = db.prepare('SELECT id, username, email, balance, role, api_key, status, created_at FROM users WHERE api_key = ?').get(apiKey);

    if (!user) {
      return errorResponse(res, 'Invalid API key.', 401);
    }

    if (user.status !== 'active') {
      return errorResponse(res, `Account is ${user.status}. API access denied.`, 403);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'API authentication failed.', 500);
  }
}

module.exports = { authenticate, optionalAuth, apiKeyAuth };
