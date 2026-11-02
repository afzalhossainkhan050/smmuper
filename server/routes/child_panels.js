const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');

// All child panel endpoints require customer authentication
router.use(authenticate);

// ──────────────── GET /api/child-panels ────────────────
// Customer's child panels, current pricing, and DNS configuration
router.get('/', (req, res) => {
  try {
    const panels = db.prepare(`
      SELECT * FROM child_panels
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    const priceRow = db.prepare("SELECT value FROM system_settings WHERE key = 'child_panel_monthly_price'").get();
    const nsRow = db.prepare("SELECT value FROM system_settings WHERE key = 'child_panel_nameservers'").get();
    const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'child_panel_system_enabled'").get();

    const monthlyPrice = priceRow ? parseFloat(priceRow.value) : 15.00;
    const nameservers = nsRow ? nsRow.value : 'ns1.smmuper.com, ns2.smmuper.com';
    const isEnabled = enabledRow ? enabledRow.value === '1' : true;

    // Check expiration on user's panels
    panels.forEach(p => {
      if (p.status === 'active' && p.expires_at && new Date(p.expires_at) < new Date()) {
        db.prepare("UPDATE child_panels SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(p.id);
        p.status = 'expired';
      }
    });

    return successResponse(res, {
      panels,
      monthly_price: monthlyPrice,
      nameservers: nameservers.split(',').map(s => s.trim()),
      is_enabled: isEnabled
    }, 'Child panels retrieved successfully');

  } catch (error) {
    console.error('Customer get child panels error:', error);
    return errorResponse(res, 'Failed to retrieve child panels.', 500);
  }
});

// ──────────────── POST /api/child-panels/order ────────────────
// Purchase a new whitelabel child panel
router.post('/order', [
  body('domain').trim().isLength({ min: 3, max: 255 }).withMessage('Valid domain is required'),
  body('admin_user').trim().isLength({ min: 3, max: 50 }).withMessage('Admin username must be 3-50 characters'),
  body('admin_password').isLength({ min: 6 }).withMessage('Admin password must be at least 6 characters'),
  body('currency').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    let { domain, admin_user, admin_password, currency = 'USD' } = req.body;
    domain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');

    // Check if domain already exists
    const existingDomain = db.prepare('SELECT id FROM child_panels WHERE domain = ?').get(domain);
    if (existingDomain) {
      return errorResponse(res, 'This domain is already registered for a child panel.', 409);
    }

    // Get current pricing
    const priceRow = db.prepare("SELECT value FROM system_settings WHERE key = 'child_panel_monthly_price'").get();
    const price = priceRow ? parseFloat(priceRow.value) : 15.00;

    // Check user balance
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.balance < price) {
      return errorResponse(res, `Insufficient wallet balance. Child panel requires $${price.toFixed(2)}, current balance is $${(user?.balance || 0).toFixed(2)}. Please add funds.`, 400);
    }

    let panelId;
    let newBalance;

    const purchaseTx = db.transaction(() => {
      newBalance = Math.round((user.balance - price) * 10000) / 10000;

      // Deduct balance
      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newBalance, req.user.id);

      // Create child panel (active with 30-day expiration)
      const result = db.prepare(`
        INSERT INTO child_panels (
          user_id, domain, price, currency, admin_user, admin_password,
          status, expires_at, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          'active', datetime('now', '+30 days'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `).run(req.user.id, domain, price, currency, admin_user, admin_password);

      panelId = result.lastInsertRowid;

      // Immutable Financial Ledger Entry
      db.prepare(`
        INSERT INTO financial_ledger (
          user_id, transaction_type, amount, balance_before, balance_after,
          currency, reference_id, reference_type, description, created_at
        ) VALUES (
          ?, 'child_panel_purchase', ?, ?, ?,
          'USD', ?, 'child_panel', ?, CURRENT_TIMESTAMP
        )
      `).run(
        req.user.id,
        price,
        user.balance,
        newBalance,
        String(panelId),
        `Purchased 30-day child panel for domain: ${domain}`
      );
    });

    purchaseTx();

    const createdPanel = db.prepare('SELECT * FROM child_panels WHERE id = ?').get(panelId);

    return successResponse(res, {
      panel: createdPanel,
      new_balance: newBalance
    }, 'Child panel provisioned successfully! Point your nameservers to complete activation.', 201);

  } catch (error) {
    console.error('Order child panel error:', error);
    return errorResponse(res, error.message || 'Failed to order child panel.', 500);
  }
});

// ──────────────── POST /api/child-panels/:id/renew ────────────────
// Renew an active or expired child panel for an additional 30 days
router.post('/:id/renew', [
  param('id').isInt().withMessage('Child panel ID must be an integer')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const panel = db.prepare('SELECT * FROM child_panels WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!panel) {
      return errorResponse(res, 'Child panel not found.', 404);
    }

    // Get current pricing
    const priceRow = db.prepare("SELECT value FROM system_settings WHERE key = 'child_panel_monthly_price'").get();
    const price = priceRow ? parseFloat(priceRow.value) : 15.00;

    // Check user balance
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.balance < price) {
      return errorResponse(res, `Insufficient wallet balance to renew. Required: $${price.toFixed(2)}, Available: $${(user?.balance || 0).toFixed(2)}. Please add funds.`, 400);
    }

    let newBalance;

    const renewTx = db.transaction(() => {
      newBalance = Math.round((user.balance - price) * 10000) / 10000;

      // Deduct balance
      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newBalance, req.user.id);

      // Extend expiration
      const isStillActive = panel.expires_at && new Date(panel.expires_at) > new Date();
      if (isStillActive) {
        db.prepare(`
          UPDATE child_panels
          SET expires_at = datetime(expires_at, '+30 days'), status = 'active', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(panel.id);
      } else {
        db.prepare(`
          UPDATE child_panels
          SET expires_at = datetime('now', '+30 days'), status = 'active', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(panel.id);
      }

      // Ledger Entry
      db.prepare(`
        INSERT INTO financial_ledger (
          user_id, transaction_type, amount, balance_before, balance_after,
          currency, reference_id, reference_type, description, created_at
        ) VALUES (
          ?, 'child_panel_renewal', ?, ?, ?,
          'USD', ?, 'child_panel', ?, CURRENT_TIMESTAMP
        )
      `).run(
        req.user.id,
        price,
        user.balance,
        newBalance,
        String(panel.id),
        `Renewed child panel for 30 days: ${panel.domain}`
      );
    });

    renewTx();

    const updatedPanel = db.prepare('SELECT * FROM child_panels WHERE id = ?').get(panel.id);

    return successResponse(res, {
      panel: updatedPanel,
      new_balance: newBalance
    }, 'Child panel renewed successfully for an additional 30 days!');

  } catch (error) {
    console.error('Renew child panel error:', error);
    return errorResponse(res, error.message || 'Failed to renew child panel.', 500);
  }
});

module.exports = router;

