const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse, sanitizeUser, generateApiKey, generateReferralCode } = require('../utils/helpers');
const crypto = require('crypto');
const { sendMail, isMailConfigured, buildPasswordResetEmail } = require('../utils/mailer');
const { getGoogleSettings, verifyGoogleIdToken, normalizeGmail } = require('../utils/googleAuth');
const { generateBase32Secret, generateTOTP, verifyTOTP, generateOtpauthUri } = require('../utils/totp');

// ──────────────── POST /api/auth/register ────────────────
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('ref').optional().trim(),
  body('referral_code').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      if (existingUser.username === username) {
        return errorResponse(res, 'Username already taken.', 409);
      }
      return errorResponse(res, 'Email already registered.', 409);
    }

    // Hash password
    const salt = bcrypt.genSaltSync(12);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Generate API key & unique referral code
    const apiKey = generateApiKey();
    const referralCode = generateReferralCode(username);

    // Check referral link
    let referredBy = null;
    const refParam = req.body.ref || req.body.referral_code;
    if (refParam) {
      const cleanRef = refParam.trim();
      const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ? OR username = ?').get(cleanRef, cleanRef);
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    // Insert user
    const result = db.prepare(`
      INSERT INTO users (username, email, password, api_key, referral_code, referred_by, balance)
      VALUES (?, ?, ?, ?, ?, ?, 0.00)
    `).run(username, email, hashedPassword, apiKey, referralCode, referredBy);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return successResponse(res, {
      token,
      user: sanitizeUser(user)
    }, 'Registration successful', 201);

  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, 'Registration failed. Please try again.', 500);
  }
});

/** Session length: "Remember me" = 30 days for customers (7 for admin/staff), otherwise 1 day. */
function sessionExpiry(role, remember) {
  const privileged = role === 'admin' || role === 'staff';
  if (remember) return privileged ? '7d' : '30d';
  return '1d';
}

function publicBaseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
  const first = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean)[0];
  if (first) return first.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

// ──────────────── POST /api/auth/forgot-password ────────────────
router.post('/forgot-password', [
  body('email').isString().trim().isLength({ min: 3, max: 254 }).withMessage('Enter your email address')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 422, errors.array());
  }

  // Same answer whether or not the account exists, so this cannot be used to find customers.
  const GENERIC = 'If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.';

  let user = null;
  try {
    const identifier = String(req.body.email).trim();
    if (identifier.includes('@')) {
      const lowered = identifier.toLowerCase();
      user = db.prepare('SELECT * FROM users WHERE email IN (?, ?)').get(lowered, normalizeGmail(lowered));
    } else {
      user = db.prepare('SELECT * FROM users WHERE username = ?').get(identifier);
    }
  } catch (error) {
    console.error('Forgot password lookup error:', error);
  }

  successResponse(res, {}, GENERIC);

  try {
    if (!user || user.status !== 'active' || !user.email) return;
    const recent = db.prepare("SELECT COUNT(*) AS c FROM password_resets WHERE user_id = ? AND created_at > datetime('now', '-1 hour')").get(user.id).c;
    if (recent >= 3) return;
    if (!isMailConfigured()) {
      console.warn('Password reset requested but email (SMTP) is not configured in Admin > Email Settings.');
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    db.prepare("INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+1 hour'))").run(user.id, tokenHash);

    const resetUrl = `${publicBaseUrl(req)}/reset-password?token=${token}`;
    const mail = buildPasswordResetEmail({ username: user.username, resetUrl });
    sendMail({ to: user.email, ...mail }).catch((err) => console.error('Password reset email failed:', err.message));
  } catch (error) {
    console.error('Forgot password error:', error);
  }
});

// ──────────────── POST /api/auth/reset-password ────────────────
router.post('/reset-password', [
  body('token').isString().isLength({ min: 64, max: 64 }).matches(/^[a-f0-9]+$/).withMessage('Invalid reset link'),
  body('password').isString().isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg || 'Validation failed', 422, errors.array());
    }

    const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const row = db.prepare("SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')").get(tokenHash);
    const user = row ? db.prepare('SELECT id, status FROM users WHERE id = ?').get(row.user_id) : null;
    if (!row || !user || user.status !== 'active') {
      return errorResponse(res, 'This reset link is invalid or has expired. Please request a new one.', 400);
    }

    const hashed = bcrypt.hashSync(req.body.password, 10);
    db.transaction(() => {
      db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, user.id);
      db.prepare('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL').run(user.id);
    })();

    return successResponse(res, {}, 'Password updated. You can now sign in with your new password.');
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse(res, 'Could not reset your password. Please try again.', 500);
  }
});

// ──────────────── GET /api/auth/google/config (public) ────────────────
router.get('/google/config', (req, res) => {
  try {
    const g = getGoogleSettings();
    return successResponse(res, { enabled: g.enabled, client_id: g.enabled ? g.client_id : '' }, 'Google login config');
  } catch (error) {
    return successResponse(res, { enabled: false, client_id: '' }, 'Google login config');
  }
});

// ──────────────── POST /api/auth/google ────────────────
router.post('/google', [
  body('credential').isString().isLength({ min: 20, max: 4096 }).withMessage('Google credential is required'),
  body('ref').optional().isString().trim().isLength({ max: 60 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const g = getGoogleSettings();
    if (!g.enabled) {
      return errorResponse(res, 'Google login is not enabled.', 403);
    }

    let info;
    try {
      info = await verifyGoogleIdToken(req.body.credential, g.client_id);
    } catch (err) {
      return errorResponse(res, 'Google sign-in could not be verified. Please try again.', 401);
    }

    const normalized = normalizeGmail(info.email);
    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(info.sub)
      || db.prepare('SELECT * FROM users WHERE email IN (?, ?)').get(info.email, normalized);

    if (user) {
      if (user.google_id && user.google_id !== info.sub) {
        return errorResponse(res, 'This account is linked to a different Google account.', 403);
      }
      if (user.status !== 'active') {
        return errorResponse(res, `Account is ${user.status}. Please contact support.`, 403);
      }
      if ((user.role === 'admin' || user.role === 'staff') && !g.allow_staff) {
        return errorResponse(res, 'Admin and staff accounts must sign in with email and password.', 403);
      }
      if (!user.google_id) {
        db.prepare('UPDATE users SET google_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(info.sub, user.id);
        user.google_id = info.sub;
      }
    } else {
      const regRow = db.prepare("SELECT value FROM system_settings WHERE key = 'user_registration'").get();
      const registrationClosed = regRow && ['0', 'false'].includes(String(regRow.value).toLowerCase());
      if (!g.allow_signup || registrationClosed) {
        return errorResponse(res, 'No account found for this Google email. New registrations are currently closed.', 403);
      }

      // Build a unique username from the email's local part
      let base = normalized.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24);
      if (base.length < 3) base = (base + 'user').slice(0, 24);
      let username = base;
      while (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
        username = base + crypto.randomInt(100, 99999);
      }

      let referredBy = null;
      const refParam = (req.body.ref || '').trim();
      if (refParam) {
        const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ? OR username = ?').get(refParam, refParam);
        if (referrer) referredBy = referrer.id;
      }

      const randomPassword = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10);
      const result = db.prepare(`
        INSERT INTO users (username, email, password, api_key, referral_code, referred_by, balance, avatar, google_id)
        VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, ?)
      `).run(username, normalized, randomPassword, generateApiKey(), generateReferralCode(username), referredBy, info.picture, info.sub);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    // Respect Two-Factor Authentication
    if (user.two_factor_enabled === 1) {
      const tempToken = jwt.sign(
        { id: user.id, username: user.username, stage: '2fa_challenge' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return successResponse(res, {
        requires_2fa: true,
        temp_token: tempToken,
        user: { username: user.username }
      }, 'Two-Factor Authentication code required.');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    return successResponse(res, { token, user: sanitizeUser(user) }, 'Login successful');
  } catch (error) {
    console.error('Google login error:', error);
    return errorResponse(res, 'Google sign-in failed. Please try again.', 500);
  }
});

// ──────────────── POST /api/auth/login ────────────────
router.post('/login', [
  // Accepts an email address OR a username (the login form allows both)
  body('email').trim().notEmpty().withMessage('Email address or username is required').isLength({ max: 254 }).withMessage('Email address or username is too long'),
  body('password').notEmpty().withMessage('Password is required'),
  body('code').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { email: identifier, password, code } = req.body;
    const remember = req.body.remember === true || req.body.remember === 'true';

    // Find user by email (stored in normalized form) or by username
    let user;
    if (String(identifier).includes('@')) {
      const lowered = String(identifier).toLowerCase();
      user = db.prepare('SELECT * FROM users WHERE email IN (?, ?)').get(lowered, normalizeGmail(lowered));
    } else {
      user = db.prepare('SELECT * FROM users WHERE username = ?').get(identifier)
        || db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(identifier);
    }
    if (!user) {
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    // Check status
    if (user.status !== 'active') {
      return errorResponse(res, `Account is ${user.status}. Please contact support.`, 403);
    }

    // Verify password
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    // Check if Two-Factor Authentication is enabled
    if (user.two_factor_enabled === 1) {
      // If code was already provided in initial login request, verify directly
      if (code && code.trim().length === 6) {
        const isValidTOTP = verifyTOTP(user.two_factor_secret, code);
        if (!isValidTOTP) {
          return errorResponse(res, 'Invalid 2FA authentication code. Please check your authenticator app.', 401);
        }
      } else {
        // Return 2FA challenge with a temporary short-lived challenge token
        const tempToken = jwt.sign(
          { id: user.id, username: user.username, stage: '2fa_challenge', remember },
          process.env.JWT_SECRET,
          { expiresIn: '5m' }
        );

        return successResponse(res, {
          requires_2fa: true,
          temp_token: tempToken
        }, 'Two-Factor Authentication code required.');
      }
    }

    // Generate JWT auth session
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: sessionExpiry(user.role, remember) }
    );

    return successResponse(res, {
      token,
      user: sanitizeUser(user)
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Login failed. Please try again.', 500);
  }
});

// ──────────────── POST /api/auth/2fa/verify-login ────────────────
// Completes login when 2FA is required
router.post('/2fa/verify-login', [
  body('temp_token').notEmpty().withMessage('Temporary challenge token is required'),
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit code is required')
], (req, res) => {
  try {
    const { temp_token, code } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
    } catch (e) {
      return errorResponse(res, '2FA challenge session expired. Please log in again.', 401);
    }

    if (decoded.stage !== '2fa_challenge') {
      return errorResponse(res, 'Invalid verification token stage.', 401);
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user || user.two_factor_enabled !== 1 || !user.two_factor_secret) {
      return errorResponse(res, '2FA is not active on this account.', 400);
    }

    const isValid = verifyTOTP(user.two_factor_secret, code);
    if (!isValid) {
      return errorResponse(res, 'Invalid 2FA authentication code. Please check your authenticator app.', 401);
    }

    // Generate final session JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: sessionExpiry(user.role, decoded.remember === true) }
    );

    return successResponse(res, {
      token,
      user: sanitizeUser(user)
    }, '2FA verification successful. Logged in.');

  } catch (error) {
    console.error('2FA verify login error:', error);
    return errorResponse(res, 'Verification failed.', 500);
  }
});

// ──────────────── POST /api/auth/2fa/generate ────────────────
// Generate 2FA secret and setup URI for Google Authenticator / Authy
router.post('/2fa/generate', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, two_factor_enabled, two_factor_secret FROM users WHERE id = ?').get(req.user.id);
    const secret = generateBase32Secret(20);
    const otpauthUrl = generateOtpauthUri(user.username, secret, 'SMMuper');
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUrl)}`;

    return successResponse(res, {
      secret,
      otpauth_url: otpauthUrl,
      qr_code_url: qrCodeUrl,
      two_factor_enabled: !!user.two_factor_enabled
    }, '2FA setup credentials generated');
  } catch (error) {
    console.error('Generate 2FA error:', error);
    return errorResponse(res, 'Failed to generate 2FA setup details.', 500);
  }
});

// ──────────────── POST /api/auth/2fa/enable ────────────────
// Verifies code and activates 2FA
router.post('/2fa/enable', authenticate, [
  body('secret').trim().notEmpty().withMessage('Secret is required'),
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit code is required')
], (req, res) => {
  try {
    const { secret, code } = req.body;
    const isValid = verifyTOTP(secret, code);

    if (!isValid) {
      return errorResponse(res, 'Invalid 6-digit verification code. Please ensure your device clock is accurate.', 400);
    }

    db.prepare(`
      UPDATE users SET
        two_factor_enabled = 1,
        two_factor_secret = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(secret, req.user.id);

    return successResponse(res, { two_factor_enabled: true }, 'Two-Factor Authentication enabled successfully!');
  } catch (error) {
    console.error('Enable 2FA error:', error);
    return errorResponse(res, 'Failed to enable 2FA.', 500);
  }
});

// ──────────────── POST /api/auth/2fa/disable ────────────────
// Disables 2FA with current password and TOTP code confirmation
router.post('/2fa/disable', authenticate, [
  body('password').notEmpty().withMessage('Current password is required'),
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit code is required')
], (req, res) => {
  try {
    const { password, code } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!bcrypt.compareSync(password, user.password)) {
      return errorResponse(res, 'Incorrect account password.', 401);
    }

    const isValid = verifyTOTP(user.two_factor_secret, code);
    if (!isValid) {
      return errorResponse(res, 'Invalid 2FA verification code.', 400);
    }

    db.prepare(`
      UPDATE users SET
        two_factor_enabled = 0,
        two_factor_secret = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id);

    return successResponse(res, { two_factor_enabled: false }, 'Two-Factor Authentication disabled.');
  } catch (error) {
    console.error('Disable 2FA error:', error);
    return errorResponse(res, 'Failed to disable 2FA.', 500);
  }
});

// ──────────────── GET /api/auth/profile & /api/auth/me ────────────────
const getProfileHandler = (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    // Get order stats
    const orderStats = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(charge), 0) as total_spent,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status IN ('processing', 'in_progress') THEN 1 ELSE 0 END) as active_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
      FROM orders WHERE user_id = ?
    `).get(req.user.id);

    // Get ticket stats
    const ticketStats = db.prepare(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets
      FROM tickets WHERE user_id = ?
    `).get(req.user.id);

    // Get deposit stats
    const depositStats = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_deposited
      FROM payments WHERE user_id = ? AND status = 'completed'
    `).get(req.user.id);

    return successResponse(res, {
      user: sanitizeUser(user),
      stats: {
        ...orderStats,
        ...ticketStats,
        ...depositStats
      }
    }, 'Profile retrieved');

  } catch (error) {
    console.error('Profile error:', error);
    return errorResponse(res, 'Failed to retrieve profile.', 500);
  }
};

router.get('/profile', authenticate, getProfileHandler);
router.get('/me', authenticate, getProfileHandler);

// ──────────────── PUT /api/auth/profile ────────────────
router.put('/profile', authenticate, [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('phone').optional().trim(),
  body('address').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { username, email, phone, address } = req.body;
    const updates = [];
    const values = [];

    if (username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
      if (existing) return errorResponse(res, 'Username already taken.', 409);
      updates.push('username = ?');
      values.push(username);
    }

    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
      if (existing) return errorResponse(res, 'Email already in use.', 409);
      updates.push('email = ?');
      values.push(email);
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }

    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }

    // Support password change directly in profile update if provided
    if (req.body.currentPassword && req.body.newPassword) {
      const { currentPassword, newPassword } = req.body;
      const userRecord = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
      if (!bcrypt.compareSync(currentPassword, userRecord.password)) {
        return errorResponse(res, 'Current password is incorrect.', 401);
      }
      if (newPassword.length < 6) {
        return errorResponse(res, 'New password must be at least 6 characters.', 422);
      }
      const salt = bcrypt.genSaltSync(12);
      const hashedPassword = bcrypt.hashSync(newPassword, salt);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return errorResponse(res, 'No fields to update.', 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.user.id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    return successResponse(res, { user: sanitizeUser(user) }, 'Profile updated successfully');

  } catch (error) {
    console.error('Update profile error:', error);
    return errorResponse(res, 'Failed to update profile.', 500);
  }
});

// ──────────────── PUT /api/auth/change-password ────────────────
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return errorResponse(res, 'Current password is incorrect.', 401);
    }

    const salt = bcrypt.genSaltSync(12);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, req.user.id);

    return successResponse(res, {}, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    return errorResponse(res, 'Failed to change password.', 500);
  }
});

module.exports = router;
