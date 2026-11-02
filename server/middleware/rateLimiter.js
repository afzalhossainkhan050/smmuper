const rateLimit = require('express-rate-limit');

/**
 * SMMuper - Security Rate Limiters
 * Defends against brute force authentication, volumetric DDoS attacks,
 * and runaway automated reseller API scripts.
 */

// 1. Strict Limiter for Authentication (Login / Register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 30, // 30 attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please wait 15 minutes before trying again.'
  }
});

// 2. General Limiter for standard API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 5000 : 600, // 600 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please slow down.'
  }
});

// 3. High-throughput Limiter for Reseller API v2
const resellerApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 1200, // 1200 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded: Max 1200 requests per 15-minute window allowed.'
  }
});

module.exports = {
  authLimiter,
  generalLimiter,
  resellerApiLimiter
};

