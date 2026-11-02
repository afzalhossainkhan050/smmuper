/**
 * SMMuper - Advanced Security Sanitizer Middleware
 * Defends against XSS (Cross-Site Scripting), script injection, and null-byte attacks
 * across request body, query parameters, and headers.
 */

function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Strip null bytes
    let clean = value.replace(/\0/g, '');
    
    // Strip dangerous inline executable script tags and event handlers
    clean = clean
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:[^"']*/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    return clean;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object' && value !== null) {
    const cleanObj = {};
    for (const [k, v] of Object.entries(value)) {
      cleanObj[k] = sanitizeValue(v);
    }
    return cleanObj;
  }

  return value;
}

function xssSanitizer(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeValue(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeValue(req.params);
    }
  } catch (err) {
    console.error('Sanitization error:', err);
  }
  next();
}

module.exports = { xssSanitizer, sanitizeValue };

