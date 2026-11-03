const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, query, param, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');
const { hasPermission } = require('../middleware/permission');
const { getGoogleSettings, CLIENT_ID_PATTERN } = require('../utils/googleAuth');
const { sendMail } = require('../utils/mailer');
const { logAdminActivity } = require('../utils/activityLogger');
const { successResponse, errorResponse, sanitizeUser, generateTransactionId, generateApiKey, paginate, paginationMeta, calculateCharge } = require('../utils/helpers');
const providerEngine = require('../services/providerEngine');

// All admin routes require authentication + admin role
router.use(authenticate, isAdmin);

// ═══════════════════════════════════════════════════════════
//                       DASHBOARD
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/dashboard ────────────────
router.get('/dashboard', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'").get().total;
    const totalServices = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
    const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status IN ('open', 'pending')").get().count;

    // Orders by status
    const ordersByStatus = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM orders GROUP BY status
    `).all();

    // Recent orders (last 10)
    const recentOrders = db.prepare(`
      SELECT o.*, u.username, s.name as service_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN services s ON o.service_id = s.id
      ORDER BY o.created_at DESC LIMIT 10
    `).all();

    // Recent users (last 10)
    const recentUsers = db.prepare(`
      SELECT id, username, email, balance, role, status, created_at
      FROM users ORDER BY created_at DESC LIMIT 10
    `).all();

    // Revenue last 7 days
    const revenueByDay = db.prepare(`
      SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as revenue, COUNT(*) as transactions
      FROM payments
      WHERE status = 'completed' AND created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    // Today's stats
    const todayOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = DATE('now')").get().count;
    const todayRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed' AND DATE(created_at) = DATE('now')").get().total;
    const todayUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now')").get().count;

    return successResponse(res, {
      overview: {
        total_users: totalUsers,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        total_services: totalServices,
        open_tickets: openTickets
      },
      today: {
        orders: todayOrders,
        revenue: todayRevenue,
        new_users: todayUsers
      },
      orders_by_status: ordersByStatus,
      revenue_by_day: revenueByDay,
      recent_orders: recentOrders,
      recent_users: recentUsers
    }, 'Dashboard data retrieved');

  } catch (error) {
    console.error('Dashboard error:', error);
    return errorResponse(res, 'Failed to retrieve dashboard data.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                     USER MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/users ────────────────
router.get('/users', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['active', 'suspended', 'banned']),
  query('role').optional().isIn(['user', 'admin']),
  query('search').optional().trim()
], (req, res) => {
  try {
    const { status, role, search } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    let where = [];
    let params = [];

    if (status) { where.push('status = ?'); params.push(status); }
    if (role) { where.push('role = ?'); params.push(role); }
    if (search) {
      where.push('(username LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM users ${whereClause}`).get(...params);

    const users = db.prepare(`
      SELECT id, username, email, balance, role, status, api_key, created_at, updated_at
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return successResponse(res, {
      users,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Users retrieved');

  } catch (error) {
    console.error('Admin get users error:', error);
    return errorResponse(res, 'Failed to retrieve users.', 500);
  }
});

// ──────────────── GET /api/admin/users/:id ────────────────
router.get('/users/:id', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, balance, role, status, api_key, created_at, updated_at
      FROM users WHERE id = ?
    `).get(req.params.id);

    if (!user) return errorResponse(res, 'User not found.', 404);

    const orderStats = db.prepare(`
      SELECT COUNT(*) as total_orders, COALESCE(SUM(charge), 0) as total_spent
      FROM orders WHERE user_id = ?
    `).get(user.id);

    const paymentStats = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_deposited
      FROM payments WHERE user_id = ? AND status = 'completed'
    `).get(user.id);

    return successResponse(res, {
      user,
      stats: { ...orderStats, ...paymentStats }
    }, 'User details retrieved');

  } catch (error) {
    console.error('Admin get user error:', error);
    return errorResponse(res, 'Failed to retrieve user.', 500);
  }
});

// ──────────────── PUT /api/admin/users/:id ────────────────
router.put('/users/:id', [
  body('status').optional().isIn(['active', 'suspended', 'banned']),
  body('role').optional().isIn(['user', 'admin']),
  body('balance').optional().isFloat({ min: 0 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return errorResponse(res, 'User not found.', 404);

    const { status, role, balance } = req.body;
    const updates = [];
    const values = [];

    if (status) { updates.push('status = ?'); values.push(status); }
    if (role) { updates.push('role = ?'); values.push(role); }
    if (balance !== undefined) { updates.push('balance = ?'); values.push(balance); }

    if (updates.length === 0) {
      return errorResponse(res, 'No fields to update.', 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // If balance was manually set, create admin_credit payment record
    if (balance !== undefined && balance !== user.balance) {
      const diff = balance - user.balance;
      db.prepare(`
        INSERT INTO payments (user_id, amount, method, transaction_id, status, notes)
        VALUES (?, ?, 'admin_credit', ?, 'completed', ?)
      `).run(user.id, Math.abs(diff), generateTransactionId(), `Admin ${diff >= 0 ? 'credited' : 'debited'} $${Math.abs(diff).toFixed(2)}`);
    }

    const updatedUser = db.prepare('SELECT id, username, email, balance, role, status, created_at, updated_at FROM users WHERE id = ?').get(req.params.id);
    logAdminActivity(req.user.id, 'user_updated', { userId: user.id, changes: req.body }, req);
    return successResponse(res, { user: updatedUser }, 'User updated successfully');

  } catch (error) {
    console.error('Admin update user error:', error);
    return errorResponse(res, 'Failed to update user.', 500);
  }
});

// ──────────────── POST /api/admin/users (Create User) ────────────────
router.post('/users', hasPermission('users.create'), [
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Valid username (3-30 chars, alphanumeric) required'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'admin']),
  body('status').optional().isIn(['active', 'suspended', 'banned']),
  body('balance').optional().isFloat({ min: 0 }),
  body('phone').optional().trim(),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { username, email, password, role = 'user', status = 'active', balance = 0.0, phone = null } = req.body;

    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
      return errorResponse(res, 'Username or email already in use.', 409);
    }

    const salt = bcrypt.genSaltSync(12);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const apiKey = generateApiKey();

    const result = db.prepare(`
      INSERT INTO users (username, email, password, phone, role, status, balance, api_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, email, hashedPassword, phone, role, status, parseFloat(balance), apiKey);

    const newUser = db.prepare('SELECT id, username, email, phone, role, status, balance, api_key, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    
    // Ledger entry if initial balance > 0
    if (parseFloat(balance) > 0) {
      db.prepare(`
        INSERT INTO financial_ledger (user_id, transaction_type, amount, balance_before, balance_after, description)
        VALUES (?, 'manual_credit', ?, 0.00, ?, 'Initial opening balance by Admin')
      `).run(newUser.id, parseFloat(balance), parseFloat(balance));
    }

    logAdminActivity(req.user.id, 'user_created', { userId: newUser.id, username: newUser.username }, req);

    return successResponse(res, { user: newUser }, 'User created successfully', 201);
  } catch (error) {
    console.error('Admin create user error:', error);
    return errorResponse(res, 'Failed to create user.', 500);
  }
});

// ──────────────── POST /api/admin/users/:id/balance (Adjust Balance) ────────────────
router.post('/users/:id/balance', hasPermission('users.balance'), [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid positive amount required'),
  body('type').isIn(['credit', 'debit']).withMessage("Type must be 'credit' or 'debit'"),
  body('reason').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return errorResponse(res, 'User not found.', 404);

    const { amount, type, reason = 'Administrative Adjustment' } = req.body;
    const numAmount = parseFloat(amount);
    const oldBalance = parseFloat(user.balance || 0);

    if (type === 'debit' && oldBalance < numAmount) {
      return errorResponse(res, `Cannot debit $${numAmount.toFixed(2)}. User balance is only $${oldBalance.toFixed(2)}.`, 400);
    }

    const newBalance = type === 'credit' ? oldBalance + numAmount : oldBalance - numAmount;
    const txType = type === 'credit' ? 'manual_credit' : 'manual_debit';
    const txId = generateTransactionId();

    const adjustTx = db.transaction(() => {
      // 1. Update user balance
      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newBalance, user.id);

      // 2. Insert into immutable financial ledger
      db.prepare(`
        INSERT INTO financial_ledger (user_id, transaction_type, amount, balance_before, balance_after, reference_id, reference_type, description)
        VALUES (?, ?, ?, ?, ?, ?, 'admin_adjustment', ?)
      `).run(user.id, txType, numAmount, oldBalance, newBalance, txId, reason);

      // 3. Record in payments table for audit
      db.prepare(`
        INSERT INTO payments (user_id, amount, method, transaction_id, status, notes)
        VALUES (?, ?, ?, ?, 'completed', ?)
      `).run(user.id, numAmount, txType, txId, `Admin ${type === 'credit' ? 'Credited' : 'Debited'}: ${reason}`);
    });

    adjustTx();

    logAdminActivity(req.user.id, 'balance_adjusted', {
      userId: user.id,
      type,
      amount: numAmount,
      oldBalance,
      newBalance,
      reason
    }, req);

    return successResponse(res, {
      userId: user.id,
      balance: newBalance,
      transaction_id: txId
    }, `Successfully ${type === 'credit' ? 'credited' : 'debited'} $${numAmount.toFixed(2)}.`);
  } catch (error) {
    console.error('Balance adjustment error:', error);
    return errorResponse(res, 'Failed to adjust balance.', 500);
  }
});

// ──────────────── POST /api/admin/users/:id/login-as (Impersonate) ────────────────
router.post('/users/:id/login-as', hasPermission('users.impersonate'), (req, res) => {
  try {
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!targetUser) return errorResponse(res, 'User not found.', 404);

    const token = jwt.sign(
      { id: targetUser.id, username: targetUser.username, role: targetUser.role, impersonatedBy: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    logAdminActivity(req.user.id, 'impersonated_user', { targetUserId: targetUser.id, targetUsername: targetUser.username }, req);

    return successResponse(res, {
      token,
      user: sanitizeUser(targetUser)
    }, `Logged in as ${targetUser.username}`);
  } catch (error) {
    return errorResponse(res, 'Failed to impersonate user.', 500);
  }
});

// ──────────────── DELETE /api/admin/users/:id ────────────────
router.delete('/users/:id', hasPermission('users.delete'), (req, res) => {
  try {
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!targetUser) return errorResponse(res, 'User not found.', 404);

    if (targetUser.id === req.user.id) {
      return errorResponse(res, 'You cannot delete your own account.', 400);
    }
    if (targetUser.username === 'admin') {
      return errorResponse(res, 'Cannot delete the master Super Admin user.', 403);
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(targetUser.id);
    logAdminActivity(req.user.id, 'user_deleted', { userId: targetUser.id, username: targetUser.username }, req);

    return successResponse(res, {}, 'User deleted successfully');
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(res, 'Failed to delete user.', 500);
  }
});

// ──────────────── POST /api/admin/users/bulk-action ────────────────
router.post('/users/bulk-action', hasPermission('users.manage'), [
  body('action').isIn(['activate', 'suspend', 'ban', 'delete']).withMessage('Valid bulk action required'),
  body('userIds').isArray({ min: 1 }).withMessage('Array of user IDs required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { action, userIds } = req.body;
    // Exclude current admin and master admin
    const safeUserIds = userIds.filter(id => parseInt(id) !== req.user.id && parseInt(id) !== 1);

    if (safeUserIds.length === 0) {
      return errorResponse(res, 'No eligible users to modify.', 400);
    }

    const placeholders = safeUserIds.map(() => '?').join(',');

    if (action === 'delete') {
      db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...safeUserIds);
    } else {
      const statusMap = { activate: 'active', suspend: 'suspended', ban: 'banned' };
      const newStatus = statusMap[action];
      db.prepare(`UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(newStatus, ...safeUserIds);
    }

    logAdminActivity(req.user.id, `users_bulk_${action}`, { affectedCount: safeUserIds.length, userIds: safeUserIds }, req);

    return successResponse(res, { count: safeUserIds.length }, `Bulk action '${action}' applied to ${safeUserIds.length} users.`);
  } catch (error) {
    return errorResponse(res, 'Failed to perform bulk action.', 500);
  }
});

// ──────────────── POST /api/admin/users/mail ────────────────
router.post('/users/mail', hasPermission('users.mail'), [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('userId').optional()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { subject, message, userId } = req.body;

    // In production or demo, save as a broadcast notice or activity log
    db.prepare(`
      INSERT INTO notices (title, description, status)
      VALUES (?, ?, 'active')
    `).run(subject, message);

    logAdminActivity(req.user.id, 'mail_sent', { subject, target: userId ? `User #${userId}` : 'All Users' }, req);

    return successResponse(res, {}, `Mail dispatched successfully to ${userId ? 'selected user' : 'all active users'}.`);
  } catch (error) {
    return errorResponse(res, 'Failed to dispatch email.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                    ORDER MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/orders ────────────────
router.get('/orders', hasPermission('orders.view'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('status').optional().isIn(['all', 'pending', 'processing', 'in_progress', 'completed', 'partial', 'cancelled', 'refunded', 'failed']),
  query('user_id').optional().isInt(),
  query('service_id').optional().isInt(),
  query('provider_id').optional().isInt(),
  query('search').optional().trim()
], (req, res) => {
  try {
    const { status, user_id, service_id, provider_id, search } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    // Global order statistics for summary cards
    const statsRow = db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(charge), 0) as total_charge,
        COALESCE(SUM(cost), 0) as total_cost,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM orders
    `).get();

    let where = [];
    let params = [];

    if (status && status !== 'all') {
      where.push('o.status = ?');
      params.push(status);
    }
    if (user_id) {
      where.push('o.user_id = ?');
      params.push(parseInt(user_id));
    }
    if (service_id) {
      where.push('o.service_id = ?');
      params.push(parseInt(service_id));
    }
    if (provider_id) {
      where.push('o.provider_id = ?');
      params.push(parseInt(provider_id));
    }
    if (search) {
      where.push('(CAST(o.id AS TEXT) LIKE ? OR o.link LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR s.name LIKE ? OR o.provider_order_id LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN services s ON o.service_id = s.id
      ${whereClause}
    `).get(...params);

    const orders = db.prepare(`
      SELECT 
        o.*,
        u.username, u.email,
        s.name as service_name, s.rate as service_rate, s.refill as service_refill, s.cancel as service_cancel,
        c.name as category_name, c.icon as category_icon,
        p.name as provider_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN services s ON o.service_id = s.id
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN api_providers p ON o.provider_id = p.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return successResponse(res, {
      orders,
      stats: statsRow,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Orders retrieved');

  } catch (error) {
    console.error('Admin get orders error:', error);
    return errorResponse(res, 'Failed to retrieve orders.', 500);
  }
});

// ──────────────── GET /api/admin/orders/:id ────────────────
router.get('/orders/:id', hasPermission('orders.view'), (req, res) => {
  try {
    const order = db.prepare(`
      SELECT 
        o.*,
        u.username, u.email, u.balance as user_balance,
        s.name as service_name, s.rate as service_rate, s.type as service_type,
        s.refill as service_refill, s.cancel as service_cancel,
        c.name as category_name, c.icon as category_icon,
        p.name as provider_name, p.api_url as provider_api_url
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN services s ON o.service_id = s.id
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN api_providers p ON o.provider_id = p.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return errorResponse(res, 'Order not found.', 404);

    // Fetch order refill history
    const refills = db.prepare('SELECT * FROM order_refills WHERE order_id = ? ORDER BY created_at DESC').all(order.id);

    return successResponse(res, { order, refills }, 'Order retrieved');
  } catch (error) {
    console.error('Admin get single order error:', error);
    return errorResponse(res, 'Failed to retrieve order details.', 500);
  }
});

// ──────────────── PUT /api/admin/orders/:id ────────────────
router.put('/orders/:id', hasPermission('orders.status'), [
  body('status').optional().isIn(['pending', 'processing', 'in_progress', 'completed', 'partial', 'cancelled', 'refunded', 'failed']),
  body('start_count').optional().isInt({ min: 0 }),
  body('remains').optional().isInt({ min: 0 }),
  body('provider_order_id').optional().trim(),
  body('error_message').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return errorResponse(res, 'Order not found.', 404);

    const { status, start_count, remains, provider_order_id, error_message } = req.body;
    const oldStatus = order.status;

    // Use atomic transaction for status & balance updates
    const updateOrderTx = db.transaction(() => {
      const updates = [];
      const values = [];

      if (status !== undefined) { updates.push('status = ?'); values.push(status); }
      if (start_count !== undefined) { updates.push('start_count = ?'); values.push(start_count); }
      if (remains !== undefined) { updates.push('remains = ?'); values.push(remains); }
      if (provider_order_id !== undefined) { updates.push('provider_order_id = ?'); values.push(provider_order_id); }
      if (error_message !== undefined) { updates.push('error_message = ?'); values.push(error_message); }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(order.id);

      // Handle Full Refund when status transitions to 'cancelled' or 'refunded'
      if ((status === 'refunded' || status === 'cancelled') && oldStatus !== 'refunded' && oldStatus !== 'cancelled') {
        const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(order.user_id);
        const refundAmount = order.charge;
        const newBal = Math.round((user.balance + refundAmount) * 10000) / 10000;

        db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newBal, order.user_id);

        db.prepare(`
          INSERT INTO financial_ledger (
            user_id, transaction_type, amount, balance_before, balance_after, currency, reference_id, reference_type, description
          ) VALUES (?, 'order_refund', ?, ?, ?, 'USD', ?, 'order', ?)
        `).run(
          order.user_id,
          refundAmount,
          user.balance,
          newBal,
          String(order.id),
          `Full refund for order #${order.id} (Status changed from ${oldStatus} to ${status})`
        );
      }

      // Handle Partial Refund when status transitions to 'partial'
      if (status === 'partial' && oldStatus !== 'partial' && oldStatus !== 'cancelled' && oldStatus !== 'refunded') {
        const orderRemains = remains !== undefined ? remains : order.remains;
        if (orderRemains > 0 && order.quantity > 0) {
          const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(order.user_id);
          const partialRefund = Math.round(((order.charge * orderRemains) / order.quantity) * 10000) / 10000;
          if (partialRefund > 0) {
            const newBal = Math.round((user.balance + partialRefund) * 10000) / 10000;

            db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(newBal, order.user_id);

            db.prepare(`
              INSERT INTO financial_ledger (
                user_id, transaction_type, amount, balance_before, balance_after, currency, reference_id, reference_type, description
              ) VALUES (?, 'order_partial_refund', ?, ?, ?, 'USD', ?, 'order', ?)
            `).run(
              order.user_id,
              partialRefund,
              user.balance,
              newBal,
              String(order.id),
              `Partial refund for order #${order.id} (${orderRemains}/${order.quantity} remains)`
            );
          }
        }
      }

      db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    });

    updateOrderTx();

    logAdminActivity(req.user.id, 'order.update', req.ip, req.headers['user-agent'], {
      orderId: order.id,
      oldStatus,
      newStatus: status || oldStatus
    });

    const updatedOrder = db.prepare(`
      SELECT o.*, u.username, s.name as service_name, p.name as provider_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN services s ON o.service_id = s.id
      LEFT JOIN api_providers p ON o.provider_id = p.id
      WHERE o.id = ?
    `).get(order.id);

    return successResponse(res, { order: updatedOrder }, 'Order updated successfully');

  } catch (error) {
    console.error('Admin update order error:', error);
    return errorResponse(res, 'Failed to update order.', 500);
  }
});

// ──────────────── POST /api/admin/orders/:id/resend ────────────────
// Resubmit an order to the assigned wholesale API provider
router.post('/orders/:id/resend', hasPermission('orders.status'), async (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return errorResponse(res, 'Order not found.', 404);

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(order.service_id);
    if (!service) return errorResponse(res, 'Assigned service not found.', 404);

    const providerId = service.provider_id || order.provider_id;
    if (!providerId) {
      return errorResponse(res, 'This service does not have an API Provider assigned. It is a manual service.', 400);
    }

    const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(providerId);
    if (!provider || provider.status !== 'active') {
      return errorResponse(res, 'Assigned provider is inactive or not configured.', 400);
    }

    const providerServiceId = service.provider_service_id;
    if (!providerServiceId) {
      return errorResponse(res, 'Provider Service ID is not configured on this service.', 400);
    }

    // Submit order via providerEngine
    const submissionResult = await providerEngine.submitOrder(provider, {
      service: providerServiceId,
      link: order.link,
      quantity: order.quantity
    });

    if (!submissionResult.success || !submissionResult.orderId) {
      return errorResponse(res, 'Provider returned failure during submission.', 502, submissionResult.raw);
    }

    // Update order with provider details
    db.prepare(`
      UPDATE orders SET
        provider_id = ?,
        provider_order_id = ?,
        status = 'processing',
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(provider.id, submissionResult.orderId, order.id);

    logAdminActivity(req.user.id, 'order.resend', req.ip, req.headers['user-agent'], {
      orderId: order.id,
      providerId: provider.id,
      providerOrderId: submissionResult.orderId
    });

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    return successResponse(res, { order: updated }, `Order #${order.id} sent to ${provider.name} (Provider Order #${submissionResult.orderId})`);

  } catch (error) {
    console.error('Admin resend order error:', error);
    return errorResponse(res, `Failed to submit order to provider: ${error.message}`, 500);
  }
});

// ──────────────── POST /api/admin/orders/:id/cancel ────────────────
// Admin cancels an order and automatically refunds the user's wallet
router.post('/orders/:id/cancel', hasPermission('orders.refill'), async (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return errorResponse(res, 'Order not found.', 404);

    if (order.status === 'cancelled' || order.status === 'refunded') {
      return errorResponse(res, 'Order is already cancelled or refunded.', 400);
    }

    // If order has active provider, attempt remote cancellation
    if (order.provider_id && order.provider_order_id) {
      const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(order.provider_id);
      if (provider) {
        try {
          await providerEngine.requestCancel(provider, order.provider_order_id);
        } catch (apiErr) {
          console.warn(`Remote cancellation request returned: ${apiErr.message}`);
        }
      }
    }

    // Process wallet refund atomically
    const cancelTx = db.transaction(() => {
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(order.user_id);
      const newBal = Math.round((user.balance + order.charge) * 10000) / 10000;

      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newBal, order.user_id);

      db.prepare(`
        INSERT INTO financial_ledger (
          user_id, transaction_type, amount, balance_before, balance_after, currency, reference_id, reference_type, description
        ) VALUES (?, 'order_refund', ?, ?, ?, 'USD', ?, 'order', ?)
      `).run(
        order.user_id,
        order.charge,
        user.balance,
        newBal,
        String(order.id),
        `Admin cancelled order #${order.id} - full refund of $${order.charge.toFixed(2)}`
      );

      db.prepare(`
        UPDATE orders SET
          status = 'cancelled',
          cancel_status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(order.id);
    });

    cancelTx();

    logAdminActivity(req.user.id, 'order.cancel', req.ip, req.headers['user-agent'], {
      orderId: order.id,
      refundAmount: order.charge
    });

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    return successResponse(res, { order: updated }, `Order #${order.id} cancelled and $${order.charge.toFixed(2)} refunded`);

  } catch (error) {
    console.error('Admin cancel order error:', error);
    return errorResponse(res, 'Failed to cancel order.', 500);
  }
});

// ──────────────── POST /api/admin/orders/:id/refill ────────────────
// Admin triggers refill request for eligible order
router.post('/orders/:id/refill', hasPermission('orders.refill'), async (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return errorResponse(res, 'Order not found.', 404);

    const service = db.prepare('SELECT refill FROM services WHERE id = ?').get(order.service_id);
    if (!service || !service.refill) {
      return errorResponse(res, 'Refill is not supported for this service.', 400);
    }

    let providerRefillId = null;

    if (order.provider_id && order.provider_order_id) {
      const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(order.provider_id);
      if (provider) {
        try {
          const refillRes = await providerEngine.requestRefill(provider, order.provider_order_id);
          providerRefillId = refillRes?.refill ? String(refillRes.refill) : null;
        } catch (apiErr) {
          console.warn(`Remote refill error: ${apiErr.message}`);
        }
      }
    }

    db.prepare(`
      INSERT INTO order_refills (order_id, user_id, provider_id, provider_order_id, provider_refill_id, status, reason)
      VALUES (?, ?, ?, ?, ?, 'refilling', 'Triggered by admin')
    `).run(order.id, order.user_id, order.provider_id, order.provider_order_id, providerRefillId);

    db.prepare(`
      UPDATE orders SET refill_status = 'refilling', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(order.id);

    logAdminActivity(req.user.id, 'order.refill', req.ip, req.headers['user-agent'], {
      orderId: order.id,
      providerRefillId
    });

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    return successResponse(res, { order: updated, refill_id: providerRefillId }, `Refill triggered for order #${order.id}`);

  } catch (error) {
    console.error('Admin refill order error:', error);
    return errorResponse(res, 'Failed to process refill request.', 500);
  }
});

// ──────────────── POST /api/admin/orders/sync-status ────────────────
// Batch sync order statuses with external API providers
router.post('/orders/sync-status', hasPermission('orders.status'), async (req, res) => {
  try {
    // Find active orders with a provider assignment
    const activeOrders = db.prepare(`
      SELECT o.*, s.rate as service_rate
      FROM orders o
      JOIN services s ON o.service_id = s.id
      WHERE o.status IN ('pending', 'processing', 'in_progress')
        AND o.provider_id IS NOT NULL
        AND o.provider_order_id IS NOT NULL
      ORDER BY o.id ASC
      LIMIT 100
    `).all();

    if (activeOrders.length === 0) {
      return successResponse(res, { synced_count: 0, message: 'No active provider orders require synchronization.' });
    }

    // Group orders by provider_id
    const ordersByProvider = {};
    for (const order of activeOrders) {
      if (!ordersByProvider[order.provider_id]) {
        ordersByProvider[order.provider_id] = [];
      }
      ordersByProvider[order.provider_id].push(order);
    }

    let updatedCount = 0;
    const syncResults = [];

    for (const [providerId, orders] of Object.entries(ordersByProvider)) {
      const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(providerId);
      if (!provider || provider.status !== 'active') continue;

      const orderIds = orders.map(o => o.provider_order_id);

      try {
        const statuses = await providerEngine.checkMultipleOrders(provider, orderIds);

        for (const order of orders) {
          const providerData = statuses[order.provider_order_id] || (statuses[order.provider_order_id.toString()]);
          if (!providerData) continue;

          let rawStatus = (providerData.status || '').toLowerCase().trim();
          let newStatus = order.status;

          if (rawStatus === 'completed') newStatus = 'completed';
          else if (rawStatus === 'in progress' || rawStatus === 'in_progress') newStatus = 'in_progress';
          else if (rawStatus === 'processing') newStatus = 'processing';
          else if (rawStatus === 'pending') newStatus = 'pending';
          else if (rawStatus === 'partial') newStatus = 'partial';
          else if (rawStatus === 'canceled' || rawStatus === 'cancelled') newStatus = 'cancelled';
          else if (rawStatus === 'refunded') newStatus = 'refunded';

          const startCount = providerData.start_count !== undefined ? parseInt(providerData.start_count) : order.start_count;
          const remains = providerData.remains !== undefined ? parseInt(providerData.remains) : order.remains;

          if (newStatus !== order.status || remains !== order.remains || startCount !== order.start_count) {
            // Apply atomic refund if status changed to cancelled or partial
            db.transaction(() => {
              if ((newStatus === 'cancelled' || newStatus === 'refunded') && order.status !== 'cancelled' && order.status !== 'refunded') {
                const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(order.user_id);
                const newBal = Math.round((user.balance + order.charge) * 10000) / 10000;
                db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newBal, order.user_id);
                db.prepare(`
                  INSERT INTO financial_ledger (user_id, transaction_type, amount, balance_before, balance_after, currency, reference_id, reference_type, description)
                  VALUES (?, 'order_refund', ?, ?, ?, 'USD', ?, 'order', ?)
                `).run(order.user_id, order.charge, user.balance, newBal, String(order.id), `Automatic refund on provider order #${order.id} cancellation`);
              } else if (newStatus === 'partial' && order.status !== 'partial' && remains > 0) {
                const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(order.user_id);
                const partialRefund = Math.round(((order.charge * remains) / order.quantity) * 10000) / 10000;
                if (partialRefund > 0) {
                  const newBal = Math.round((user.balance + partialRefund) * 10000) / 10000;
                  db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newBal, order.user_id);
                  db.prepare(`
                    INSERT INTO financial_ledger (user_id, transaction_type, amount, balance_before, balance_after, currency, reference_id, reference_type, description)
                    VALUES (?, 'order_partial_refund', ?, ?, ?, 'USD', ?, 'order', ?)
                  `).run(order.user_id, partialRefund, user.balance, newBal, String(order.id), `Automatic partial refund on provider order #${order.id}`);
                }
              }

              db.prepare(`
                UPDATE orders SET
                  status = ?,
                  start_count = ?,
                  remains = ?,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(newStatus, startCount, remains, order.id);
            })();

            updatedCount++;
            syncResults.push({ orderId: order.id, oldStatus: order.status, newStatus, remains });
          }
        }
      } catch (err) {
        console.error(`Failed to sync orders for provider ${provider.name}:`, err.message);
      }
    }

    logAdminActivity(req.user.id, 'orders.sync_status', req.ip, req.headers['user-agent'], {
      ordersChecked: activeOrders.length,
      updatedCount
    });

    return successResponse(res, {
      synced_count: updatedCount,
      orders_checked: activeOrders.length,
      details: syncResults
    }, `Successfully synchronized status for ${updatedCount} orders`);

  } catch (error) {
    console.error('Admin sync status error:', error);
    return errorResponse(res, 'Failed to synchronize order statuses.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                   SERVICE MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/services ────────────────
router.get('/services', hasPermission('services.view'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('category_id').optional().isInt(),
  query('social_media_id').optional().isInt(),
  query('provider_id').optional().trim(),
  query('status').optional().isIn(['all', 'active', 'inactive']),
  query('type').optional().isIn(['all', 'default', 'package', 'custom_comments', 'subscriptions']),
  query('search').optional().trim()
], (req, res) => {
  try {
    const { category_id, social_media_id, provider_id, status, type, search } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    // Stats row
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN provider_id IS NOT NULL THEN 1 ELSE 0 END) as provider_services,
        SUM(CASE WHEN provider_id IS NULL THEN 1 ELSE 0 END) as manual_services
      FROM services
    `).get();

    let where = [];
    let params = [];

    if (category_id) {
      where.push('s.category_id = ?');
      params.push(parseInt(category_id));
    }
    if (social_media_id) {
      where.push('c.social_media_id = ?');
      params.push(parseInt(social_media_id));
    }
    if (provider_id && provider_id !== 'all') {
      if (provider_id === 'manual') {
        where.push('s.provider_id IS NULL');
      } else {
        where.push('s.provider_id = ?');
        params.push(parseInt(provider_id));
      }
    }
    if (status && status !== 'all') {
      where.push('s.status = ?');
      params.push(status);
    }
    if (type && type !== 'all') {
      where.push('s.type = ?');
      params.push(type);
    }
    if (search) {
      where.push('(s.name LIKE ? OR CAST(s.id AS TEXT) LIKE ? OR s.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total 
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      ${whereClause}
    `).get(...params);

    const services = db.prepare(`
      SELECT 
        s.*,
        c.name as category_name, c.icon as category_icon, c.social_media_id,
        sm.name as social_media_name, sm.icon as social_media_icon,
        p.name as provider_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN social_media sm ON c.social_media_id = sm.id
      LEFT JOIN api_providers p ON s.provider_id = p.id
      ${whereClause}
      ORDER BY s.sort_order ASC, s.id ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return successResponse(res, {
      services,
      stats,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Services retrieved');

  } catch (error) {
    console.error('Admin get services error:', error);
    return errorResponse(res, 'Failed to retrieve services.', 500);
  }
});

// ──────────────── POST /api/admin/services ────────────────
router.post('/services', hasPermission('services.create'), [
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('name').trim().isLength({ min: 3, max: 255 }).withMessage('Name must be 3-255 characters'),
  body('description').optional().trim(),
  body('rate').isFloat({ min: 0.0001 }).withMessage('Selling rate must be a positive number'),
  body('original_rate').optional().isFloat({ min: 0 }),
  body('min_quantity').isInt({ min: 1 }).withMessage('Min quantity must be at least 1'),
  body('max_quantity').isInt({ min: 1 }).withMessage('Max quantity must be at least 1'),
  body('type').optional().isIn(['default', 'package', 'custom_comments', 'subscriptions']),
  body('status').optional().isIn(['active', 'inactive']),
  body('provider_id').optional({ nullable: true }),
  body('provider_service_id').optional({ nullable: true }).trim(),
  body('avg_time').optional().trim(),
  body('dripfeed').optional().isInt({ min: 0, max: 1 }),
  body('refill').optional().isInt({ min: 0, max: 1 }),
  body('cancel').optional().isInt({ min: 0, max: 1 }),
  body('sort_order').optional().isInt({ min: 0 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const {
      category_id, name, description, rate, original_rate,
      min_quantity, max_quantity, type, status,
      provider_id, provider_service_id, avg_time,
      dripfeed, refill, cancel, sort_order
    } = req.body;

    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!category) return errorResponse(res, 'Category not found.', 404);

    if (min_quantity > max_quantity) {
      return errorResponse(res, 'Min quantity cannot be greater than max quantity.', 400);
    }

    const result = db.prepare(`
      INSERT INTO services (
        category_id, name, description, rate, original_rate,
        min_quantity, max_quantity, type, status,
        provider_id, provider_service_id, avg_time,
        dripfeed, refill, cancel, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      category_id,
      name,
      description || '',
      parseFloat(rate),
      original_rate ? parseFloat(original_rate) : 0.00,
      min_quantity,
      max_quantity,
      type || 'default',
      status || 'active',
      provider_id ? parseInt(provider_id) : null,
      provider_service_id || null,
      avg_time || '0-1 hours',
      dripfeed ? 1 : 0,
      refill ? 1 : 0,
      cancel ? 1 : 0,
      sort_order || 0
    );

    logAdminActivity(req.user.id, 'service.create', req.ip, req.headers['user-agent'], {
      serviceId: result.lastInsertRowid,
      name
    });

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
    return successResponse(res, { service }, 'Service created successfully', 201);

  } catch (error) {
    console.error('Admin create service error:', error);
    return errorResponse(res, 'Failed to create service.', 500);
  }
});

// ──────────────── PUT /api/admin/services/:id ────────────────
router.put('/services/:id', hasPermission('services.edit'), [
  body('name').optional().trim().isLength({ min: 3, max: 255 }),
  body('description').optional().trim(),
  body('rate').optional().isFloat({ min: 0.0001 }),
  body('original_rate').optional().isFloat({ min: 0 }),
  body('min_quantity').optional().isInt({ min: 1 }),
  body('max_quantity').optional().isInt({ min: 1 }),
  body('type').optional().isIn(['default', 'package', 'custom_comments', 'subscriptions']),
  body('status').optional().isIn(['active', 'inactive']),
  body('category_id').optional().isInt({ min: 1 }),
  body('provider_id').optional({ nullable: true }),
  body('provider_service_id').optional({ nullable: true }).trim(),
  body('avg_time').optional().trim(),
  body('dripfeed').optional().isInt({ min: 0, max: 1 }),
  body('refill').optional().isInt({ min: 0, max: 1 }),
  body('cancel').optional().isInt({ min: 0, max: 1 }),
  body('sort_order').optional().isInt({ min: 0 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!service) return errorResponse(res, 'Service not found.', 404);

    const allowedFields = [
      'name', 'description', 'rate', 'original_rate', 'min_quantity', 'max_quantity',
      'type', 'status', 'category_id', 'provider_id', 'provider_service_id',
      'avg_time', 'dripfeed', 'refill', 'cancel', 'sort_order'
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        let val = req.body[field];
        if (field === 'provider_id') {
          val = val ? parseInt(val) : null;
        }
        values.push(val);
      }
    }

    if (updates.length === 0) {
      return errorResponse(res, 'No fields to update.', 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(service.id);

    db.prepare(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    logAdminActivity(req.user.id, 'service.update', req.ip, req.headers['user-agent'], {
      serviceId: service.id,
      name: service.name
    });

    const updatedService = db.prepare(`
      SELECT s.*, c.name as category_name, p.name as provider_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN api_providers p ON s.provider_id = p.id
      WHERE s.id = ?
    `).get(service.id);

    return successResponse(res, { service: updatedService }, 'Service updated successfully');

  } catch (error) {
    console.error('Admin update service error:', error);
    return errorResponse(res, 'Failed to update service.', 500);
  }
});

// ──────────────── PUT /api/admin/services/:id/toggle-status ────────────────
router.put('/services/:id/toggle-status', hasPermission('services.edit'), (req, res) => {
  try {
    const service = db.prepare('SELECT id, name, status FROM services WHERE id = ?').get(req.params.id);
    if (!service) return errorResponse(res, 'Service not found.', 404);

    const newStatus = service.status === 'active' ? 'inactive' : 'active';
    db.prepare('UPDATE services SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, service.id);

    return successResponse(res, { id: service.id, status: newStatus }, `Service marked as ${newStatus}`);
  } catch (error) {
    return errorResponse(res, 'Failed to toggle service status.', 500);
  }
});

// ──────────────── DELETE /api/admin/services/:id ────────────────
router.delete('/services/:id', hasPermission('services.delete'), (req, res) => {
  try {
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!service) return errorResponse(res, 'Service not found.', 404);

    const activeOrders = db.prepare(
      "SELECT COUNT(*) as count FROM orders WHERE service_id = ? AND status IN ('pending', 'processing', 'in_progress')"
    ).get(service.id);

    if (activeOrders.count > 0) {
      return errorResponse(res, `Cannot delete service with ${activeOrders.count} active orders. Deactivate instead.`, 400);
    }

    db.prepare('DELETE FROM services WHERE id = ?').run(service.id);

    logAdminActivity(req.user.id, 'service.delete', req.ip, req.headers['user-agent'], {
      serviceId: service.id,
      name: service.name
    });

    return successResponse(res, {}, 'Service deleted successfully');

  } catch (error) {
    console.error('Admin delete service error:', error);
    return errorResponse(res, 'Failed to delete service.', 500);
  }
});

// ──────────────── POST /api/admin/services/bulk-action ────────────────
router.post('/services/bulk-action', hasPermission('services.edit'), [
  body('action').isIn(['activate', 'deactivate', 'delete', 'change_category', 'adjust_margin']),
  body('service_ids').isArray({ min: 1 }).withMessage('At least one service must be selected'),
  body('category_id').optional().isInt({ min: 1 }),
  body('margin_percent').optional().isFloat()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { action, service_ids, category_id, margin_percent } = req.body;
    let affectedCount = 0;

    const bulkTx = db.transaction(() => {
      for (const id of service_ids) {
        if (action === 'activate') {
          db.prepare("UPDATE services SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
          affectedCount++;
        } else if (action === 'deactivate') {
          db.prepare("UPDATE services SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
          affectedCount++;
        } else if (action === 'delete') {
          const hasActiveOrders = db.prepare(
            "SELECT COUNT(*) as c FROM orders WHERE service_id = ? AND status IN ('pending', 'processing', 'in_progress')"
          ).get(id).c;
          if (hasActiveOrders === 0) {
            db.prepare('DELETE FROM services WHERE id = ?').run(id);
            affectedCount++;
          }
        } else if (action === 'change_category' && category_id) {
          db.prepare('UPDATE services SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(category_id, id);
          affectedCount++;
        } else if (action === 'adjust_margin' && margin_percent !== undefined) {
          const svc = db.prepare('SELECT rate, original_rate FROM services WHERE id = ?').get(id);
          if (svc && svc.original_rate > 0) {
            const newRate = Math.round((svc.original_rate * (1 + margin_percent / 100)) * 10000) / 10000;
            db.prepare('UPDATE services SET rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newRate, id);
            affectedCount++;
          }
        }
      }
    });

    bulkTx();

    logAdminActivity(req.user.id, 'service.bulk_action', req.ip, req.headers['user-agent'], {
      action,
      affectedCount
    });

    return successResponse(res, { affected: affectedCount }, `Bulk action '${action}' applied to ${affectedCount} services.`);

  } catch (error) {
    console.error('Admin bulk action services error:', error);
    return errorResponse(res, 'Failed to perform bulk action on services.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                   CATEGORY MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/categories ────────────────
router.get('/categories', hasPermission('services.view'), [
  query('social_media_id').optional().isInt(),
  query('status').optional().isIn(['all', 'active', 'inactive']),
  query('search').optional().trim()
], (req, res) => {
  try {
    const { social_media_id, status, search } = req.query;

    let where = [];
    let params = [];

    if (social_media_id) {
      where.push('c.social_media_id = ?');
      params.push(parseInt(social_media_id));
    }
    if (status && status !== 'all') {
      where.push('c.status = ?');
      params.push(status);
    }
    if (search) {
      where.push('(c.name LIKE ? OR sm.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const categories = db.prepare(`
      SELECT 
        c.*,
        sm.name as social_media_name, sm.icon as social_media_icon,
        (SELECT COUNT(*) FROM services WHERE category_id = c.id) as services_count,
        (SELECT COUNT(*) FROM services WHERE category_id = c.id AND status = 'active') as active_services_count
      FROM categories c
      LEFT JOIN social_media sm ON c.social_media_id = sm.id
      ${whereClause}
      ORDER BY c.sort_order ASC, c.id ASC
    `).all(...params);

    const stats = {
      total: categories.length,
      active: categories.filter(c => c.status === 'active').length,
      inactive: categories.filter(c => c.status === 'inactive').length
    };

    return successResponse(res, { categories, stats }, 'Categories retrieved');
  } catch (error) {
    console.error('Admin get categories error:', error);
    return errorResponse(res, 'Failed to retrieve categories.', 500);
  }
});

// ──────────────── POST /api/admin/categories ────────────────
router.post('/categories', hasPermission('services.create'), [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  body('social_media_id').optional({ nullable: true }).isInt(),
  body('icon').optional().trim(),
  body('sort_order').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { name, social_media_id, icon, sort_order, status } = req.body;

    const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (existing) return errorResponse(res, 'A category with this name already exists.', 409);

    const result = db.prepare(`
      INSERT INTO categories (name, social_media_id, icon, sort_order, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, social_media_id ? parseInt(social_media_id) : null, icon || '📦', sort_order || 0, status || 'active');

    logAdminActivity(req.user.id, 'category.create', req.ip, req.headers['user-agent'], {
      categoryId: result.lastInsertRowid,
      name
    });

    const category = db.prepare(`
      SELECT c.*, sm.name as social_media_name
      FROM categories c
      LEFT JOIN social_media sm ON c.social_media_id = sm.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    return successResponse(res, { category }, 'Category created successfully', 201);

  } catch (error) {
    console.error('Admin create category error:', error);
    return errorResponse(res, 'Failed to create category.', 500);
  }
});

// ──────────────── PUT /api/admin/categories/sort ────────────────
router.put('/categories/sort', hasPermission('services.edit'), [
  body('items').isArray({ min: 1 }).withMessage('Items array is required')
], (req, res) => {
  try {
    const { items } = req.body;
    const sortTx = db.transaction(() => {
      for (const item of items) {
        if (item.id && item.sort_order !== undefined) {
          db.prepare('UPDATE categories SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.sort_order, item.id);
        }
      }
    });
    sortTx();
    return successResponse(res, {}, 'Category sort orders updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update sort orders.', 500);
  }
});

// ──────────────── PUT /api/admin/categories/:id ────────────────
router.put('/categories/:id', hasPermission('services.edit'), [
  body('name').optional().trim().isLength({ min: 2, max: 150 }),
  body('social_media_id').optional({ nullable: true }),
  body('icon').optional().trim(),
  body('sort_order').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) return errorResponse(res, 'Category not found.', 404);

    const allowedFields = ['name', 'social_media_id', 'icon', 'sort_order', 'status'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        let val = req.body[field];
        if (field === 'social_media_id') {
          val = val ? parseInt(val) : null;
        }
        values.push(val);
      }
    }

    if (updates.length === 0) {
      return errorResponse(res, 'No fields to update.', 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(category.id);

    db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    logAdminActivity(req.user.id, 'category.update', req.ip, req.headers['user-agent'], {
      categoryId: category.id,
      name: category.name
    });

    const updated = db.prepare(`
      SELECT c.*, sm.name as social_media_name
      FROM categories c
      LEFT JOIN social_media sm ON c.social_media_id = sm.id
      WHERE c.id = ?
    `).get(category.id);

    return successResponse(res, { category: updated }, 'Category updated successfully');

  } catch (error) {
    console.error('Admin update category error:', error);
    return errorResponse(res, 'Failed to update category.', 500);
  }
});

// ──────────────── DELETE /api/admin/categories/:id ────────────────
router.delete('/categories/:id', hasPermission('services.delete'), (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) return errorResponse(res, 'Category not found.', 404);

    const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services WHERE category_id = ?').get(category.id).count;
    if (serviceCount > 0) {
      return errorResponse(res, `Cannot delete category containing ${serviceCount} services. Delete or move the services first.`, 400);
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(category.id);

    logAdminActivity(req.user.id, 'category.delete', req.ip, req.headers['user-agent'], {
      categoryId: category.id,
      name: category.name
    });

    return successResponse(res, {}, 'Category deleted successfully');
  } catch (error) {
    console.error('Admin delete category error:', error);
    return errorResponse(res, 'Failed to delete category.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                 SOCIAL MEDIA PLATFORMS
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/social-media ────────────────
router.get('/social-media', hasPermission('services.view'), (req, res) => {
  try {
    const platforms = db.prepare(`
      SELECT 
        sm.*,
        (SELECT COUNT(*) FROM categories WHERE social_media_id = sm.id) as categories_count,
        (SELECT COUNT(*) FROM services s JOIN categories c ON s.category_id = c.id WHERE c.social_media_id = sm.id) as services_count
      FROM social_media sm
      ORDER BY sm.sort_order ASC, sm.id ASC
    `).all();

    const stats = {
      total: platforms.length,
      active: platforms.filter(p => p.status === 'active').length,
      inactive: platforms.filter(p => p.status === 'inactive').length
    };

    return successResponse(res, { platforms, stats }, 'Social media platforms retrieved');
  } catch (error) {
    console.error('Admin get social media error:', error);
    return errorResponse(res, 'Failed to retrieve social media platforms.', 500);
  }
});

// ──────────────── POST /api/admin/social-media ────────────────
router.post('/social-media', hasPermission('services.create'), [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('icon').optional().trim(),
  body('slug').optional().trim(),
  body('sort_order').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { name, icon, slug, sort_order, status } = req.body;
    const finalSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    const existing = db.prepare('SELECT id FROM social_media WHERE slug = ? OR name = ?').get(finalSlug, name);
    if (existing) return errorResponse(res, 'A social media platform with this name or slug already exists.', 409);

    const result = db.prepare(`
      INSERT INTO social_media (name, icon, slug, sort_order, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, icon || 'share-2', finalSlug, sort_order || 0, status || 'active');

    logAdminActivity(req.user.id, 'social_media.create', req.ip, req.headers['user-agent'], {
      platformId: result.lastInsertRowid,
      name
    });

    const platform = db.prepare('SELECT * FROM social_media WHERE id = ?').get(result.lastInsertRowid);
    return successResponse(res, { platform }, 'Social media platform created successfully', 201);

  } catch (error) {
    console.error('Admin create social media error:', error);
    return errorResponse(res, 'Failed to create social media platform.', 500);
  }
});

// ──────────────── PUT /api/admin/social-media/sort ────────────────
router.put('/social-media/sort', hasPermission('services.edit'), [
  body('items').isArray({ min: 1 }).withMessage('Items array is required')
], (req, res) => {
  try {
    const { items } = req.body;
    const sortTx = db.transaction(() => {
      for (const item of items) {
        if (item.id && item.sort_order !== undefined) {
          db.prepare('UPDATE social_media SET sort_order = ? WHERE id = ?').run(item.sort_order, item.id);
        }
      }
    });
    sortTx();
    return successResponse(res, {}, 'Social media sort orders updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update sort orders.', 500);
  }
});

// ──────────────── PUT /api/admin/social-media/:id ────────────────
router.put('/social-media/:id', hasPermission('services.edit'), [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('icon').optional().trim(),
  body('slug').optional().trim(),
  body('sort_order').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const platform = db.prepare('SELECT * FROM social_media WHERE id = ?').get(req.params.id);
    if (!platform) return errorResponse(res, 'Social media platform not found.', 404);

    const allowedFields = ['name', 'icon', 'slug', 'sort_order', 'status'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return errorResponse(res, 'No fields to update.', 400);
    }

    values.push(platform.id);
    db.prepare(`UPDATE social_media SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    logAdminActivity(req.user.id, 'social_media.update', req.ip, req.headers['user-agent'], {
      platformId: platform.id,
      name: platform.name
    });

    const updated = db.prepare('SELECT * FROM social_media WHERE id = ?').get(platform.id);
    return successResponse(res, { platform: updated }, 'Social media platform updated successfully');

  } catch (error) {
    console.error('Admin update social media error:', error);
    return errorResponse(res, 'Failed to update social media platform.', 500);
  }
});

// ──────────────── DELETE /api/admin/social-media/:id ────────────────
router.delete('/social-media/:id', hasPermission('services.delete'), (req, res) => {
  try {
    const platform = db.prepare('SELECT * FROM social_media WHERE id = ?').get(req.params.id);
    if (!platform) return errorResponse(res, 'Social media platform not found.', 404);

    // Check if categories are assigned
    const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM categories WHERE social_media_id = ?').get(platform.id).count;
    if (categoriesCount > 0) {
      return errorResponse(res, `Cannot delete platform with ${categoriesCount} assigned categories. Reassign or delete categories first.`, 400);
    }

    db.prepare('DELETE FROM social_media WHERE id = ?').run(platform.id);

    logAdminActivity(req.user.id, 'social_media.delete', req.ip, req.headers['user-agent'], {
      platformId: platform.id,
      name: platform.name
    });

    return successResponse(res, {}, 'Social media platform deleted successfully');

  } catch (error) {
    console.error('Admin delete social media error:', error);
    return errorResponse(res, 'Failed to delete social media platform.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                     TICKET MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/tickets ────────────────
router.get('/tickets', [
  query('status').optional().isIn(['open', 'answered', 'closed', 'pending']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], (req, res) => {
  try {
    const { status, priority } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    let where = [];
    let params = [];

    if (status) { where.push('t.status = ?'); params.push(status); }
    if (priority) { where.push('t.priority = ?'); params.push(priority); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM tickets t ${whereClause}`).get(...params);

    const tickets = db.prepare(`
      SELECT t.*, u.username, u.email
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.id
      ${whereClause}
      ORDER BY
        CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
        t.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return successResponse(res, {
      tickets,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Tickets retrieved');

  } catch (error) {
    console.error('Admin get tickets error:', error);
    return errorResponse(res, 'Failed to retrieve tickets.', 500);
  }
});

// ──────────────── GET /api/admin/tickets/:id ────────────────
router.get('/tickets/:id', (req, res) => {
  try {
    const ticket = db.prepare(`
      SELECT t.*, u.username, u.email, u.role as user_role, u.balance as user_balance
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!ticket) return errorResponse(res, 'Ticket not found.', 404);

    const replies = db.prepare(`
      SELECT tr.*, u.username, u.role
      FROM ticket_replies tr
      LEFT JOIN users u ON tr.user_id = u.id
      WHERE tr.ticket_id = ?
      ORDER BY tr.created_at ASC
    `).all(ticket.id);

    return successResponse(res, { ticket, replies }, 'Ticket details retrieved');
  } catch (error) {
    console.error('Admin get ticket by id error:', error);
    return errorResponse(res, 'Failed to retrieve ticket details.', 500);
  }
});

// ──────────────── POST /api/admin/tickets/:id/reply ────────────────
router.post('/tickets/:id/reply', [
  body('message').trim().isLength({ min: 2, max: 5000 }).withMessage('Message is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return errorResponse(res, 'Ticket not found.', 404);

    const { message } = req.body;

    const addReply = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES (?, ?, ?)'
      ).run(ticket.id, req.user.id, message);

      db.prepare("UPDATE tickets SET status = 'answered', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(ticket.id);

      return result.lastInsertRowid;
    });

    const replyId = addReply();
    const reply = db.prepare(`
      SELECT tr.*, u.username, u.role
      FROM ticket_replies tr
      LEFT JOIN users u ON tr.user_id = u.id
      WHERE tr.id = ?
    `).get(replyId);

    return successResponse(res, { reply }, 'Reply added', 201);

  } catch (error) {
    console.error('Admin reply ticket error:', error);
    return errorResponse(res, 'Failed to add reply.', 500);
  }
});

// ──────────────── PUT /api/admin/tickets/:id ────────────────
router.put('/tickets/:id', [
  body('status').optional().isIn(['open', 'answered', 'closed', 'pending']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], (req, res) => {
  try {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return errorResponse(res, 'Ticket not found.', 404);

    const { status, priority } = req.body;
    const updates = [];
    const values = [];

    if (status) { updates.push('status = ?'); values.push(status); }
    if (priority) { updates.push('priority = ?'); values.push(priority); }

    if (updates.length === 0) {
      return errorResponse(res, 'No fields to update.', 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(ticket.id);

    db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket.id);
    return successResponse(res, { ticket: updated }, 'Ticket updated');

  } catch (error) {
    console.error('Admin update ticket error:', error);
    return errorResponse(res, 'Failed to update ticket.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                       ANALYTICS
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/analytics ────────────────
router.get('/analytics', [
  query('period').optional().isIn(['7d', '30d', '90d', '365d', 'all'])
], (req, res) => {
  try {
    const period = req.query.period || '30d';
    let dateFilter = '';

    if (period !== 'all') {
      const days = parseInt(period);
      dateFilter = `AND created_at >= datetime('now', '-${days} days')`;
    }

    // Revenue over time
    const revenueOverTime = db.prepare(`
      SELECT DATE(created_at) as date,
             COALESCE(SUM(amount), 0) as revenue,
             COUNT(*) as transactions
      FROM payments
      WHERE status = 'completed' ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    // Orders over time
    const ordersOverTime = db.prepare(`
      SELECT DATE(created_at) as date,
             COUNT(*) as orders,
             COALESCE(SUM(charge), 0) as total_charge
      FROM orders
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    // Top services by orders
    const topServices = db.prepare(`
      SELECT s.name, s.id, COUNT(o.id) as order_count, COALESCE(SUM(o.charge), 0) as total_revenue
      FROM orders o
      LEFT JOIN services s ON o.service_id = s.id
      WHERE 1=1 ${dateFilter.replace('created_at', 'o.created_at')}
      GROUP BY s.id
      ORDER BY order_count DESC
      LIMIT 10
    `).all();

    // Top users by spending
    const topUsers = db.prepare(`
      SELECT u.username, u.id, COUNT(o.id) as order_count, COALESCE(SUM(o.charge), 0) as total_spent
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1 ${dateFilter.replace('created_at', 'o.created_at')}
      GROUP BY u.id
      ORDER BY total_spent DESC
      LIMIT 10
    `).all();

    // Category breakdown
    const categoryBreakdown = db.prepare(`
      SELECT c.name, c.icon, COUNT(o.id) as order_count, COALESCE(SUM(o.charge), 0) as total_revenue
      FROM orders o
      LEFT JOIN services s ON o.service_id = s.id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE 1=1 ${dateFilter.replace('created_at', 'o.created_at')}
      GROUP BY c.id
      ORDER BY total_revenue DESC
    `).all();

    // User growth
    const userGrowth = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as new_users
      FROM users
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    return successResponse(res, {
      period,
      revenue_over_time: revenueOverTime,
      orders_over_time: ordersOverTime,
      top_services: topServices,
      top_users: topUsers,
      category_breakdown: categoryBreakdown,
      user_growth: userGrowth
    }, 'Analytics data retrieved');

  } catch (error) {
    console.error('Analytics error:', error);
    return errorResponse(res, 'Failed to retrieve analytics.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                     STAFF MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/staff ────────────────
router.get('/staff', hasPermission('staff.view'), (req, res) => {
  try {
    const staffMembers = db.prepare(`
      SELECT s.id, s.user_id, s.role_id, s.designation, s.status, s.created_at,
             u.username, u.email, u.phone,
             r.name as role_name, r.permissions
      FROM staff s
      JOIN users u ON s.user_id = u.id
      JOIN roles r ON s.role_id = r.id
      ORDER BY s.created_at DESC
    `).all();

    const formatted = staffMembers.map(m => ({
      ...m,
      permissions: JSON.parse(m.permissions || '[]')
    }));

    return successResponse(res, { staff: formatted }, 'Staff list retrieved');
  } catch (error) {
    console.error('Get staff error:', error);
    return errorResponse(res, 'Failed to retrieve staff members.', 500);
  }
});

// ──────────────── POST /api/admin/staff ────────────────
router.post('/staff', hasPermission('staff.manage'), [
  body('role_id').isInt().withMessage('Valid role ID is required'),
  body('designation').trim().notEmpty().withMessage('Designation is required'),
  body('status').optional().isIn(['active', 'inactive']),
  body('email').trim().isEmail().withMessage('Valid email required'),
  body('username').optional().trim(),
  body('password').optional().isLength({ min: 6 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { role_id, designation, status = 'active', email, username, password } = req.body;

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(role_id);
    if (!role) return errorResponse(res, 'Role not found.', 404);

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      if (!username || !password) {
        return errorResponse(res, 'Username and password required to create new staff user.', 400);
      }
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existingUser) return errorResponse(res, 'Username already in use.', 409);

      const salt = bcrypt.genSaltSync(12);
      const hashedPassword = bcrypt.hashSync(password, salt);
      const apiKey = generateApiKey();

      const userInsert = db.prepare(`
        INSERT INTO users (username, email, password, role, status, balance, api_key)
        VALUES (?, ?, ?, 'admin', 'active', 0.00, ?)
      `).run(username, email, hashedPassword, apiKey);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userInsert.lastInsertRowid);
    } else {
      // Ensure user has admin privileges
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
    }

    const existingStaff = db.prepare('SELECT id FROM staff WHERE user_id = ?').get(user.id);
    if (existingStaff) {
      return errorResponse(res, 'User is already assigned as a staff member.', 409);
    }

    const staffInsert = db.prepare(`
      INSERT INTO staff (user_id, role_id, designation, status)
      VALUES (?, ?, ?, ?)
    `).run(user.id, role_id, designation, status);

    logAdminActivity(req.user.id, 'staff_created', { staffId: staffInsert.lastInsertRowid, userId: user.id, designation }, req);

    return successResponse(res, {
      staff: {
        id: staffInsert.lastInsertRowid,
        user_id: user.id,
        username: user.username,
        email: user.email,
        role_name: role.name,
        designation,
        status
      }
    }, 'Staff member added successfully', 201);
  } catch (error) {
    console.error('Create staff error:', error);
    return errorResponse(res, 'Failed to add staff member.', 500);
  }
});

// ──────────────── PUT /api/admin/staff/:id ────────────────
router.put('/staff/:id', hasPermission('staff.manage'), [
  body('role_id').optional().isInt(),
  body('designation').optional().trim().notEmpty(),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const staffMember = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);
    if (!staffMember) return errorResponse(res, 'Staff member not found.', 404);

    const { role_id, designation, status } = req.body;
    const updates = [];
    const values = [];

    if (role_id) { updates.push('role_id = ?'); values.push(role_id); }
    if (designation) { updates.push('designation = ?'); values.push(designation); }
    if (status) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) return errorResponse(res, 'No fields to update.', 400);

    values.push(staffMember.id);
    db.prepare(`UPDATE staff SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    logAdminActivity(req.user.id, 'staff_updated', { staffId: staffMember.id, changes: req.body }, req);

    return successResponse(res, {}, 'Staff member updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update staff member.', 500);
  }
});

// ──────────────── DELETE /api/admin/staff/:id ────────────────
router.delete('/staff/:id', hasPermission('staff.manage'), (req, res) => {
  try {
    const staffMember = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);
    if (!staffMember) return errorResponse(res, 'Staff member not found.', 404);

    if (staffMember.user_id === req.user.id) {
      return errorResponse(res, 'You cannot remove your own staff access.', 400);
    }

    db.prepare('DELETE FROM staff WHERE id = ?').run(staffMember.id);
    logAdminActivity(req.user.id, 'staff_deleted', { staffId: staffMember.id }, req);

    return successResponse(res, {}, 'Staff member access revoked successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to remove staff member.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                   ROLES & PERMISSIONS
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/roles ────────────────
router.get('/roles', hasPermission('roles.view'), (req, res) => {
  try {
    const roles = db.prepare(`
      SELECT r.*, COUNT(s.id) as staff_count
      FROM roles r
      LEFT JOIN staff s ON r.id = s.role_id
      GROUP BY r.id
      ORDER BY r.id ASC
    `).all();

    const formatted = roles.map(r => ({
      ...r,
      permissions: JSON.parse(r.permissions || '[]')
    }));

    return successResponse(res, { roles: formatted }, 'Roles list retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve roles.', 500);
  }
});

// ──────────────── GET /api/admin/roles/permissions-list ────────────────
router.get('/roles/permissions-list', hasPermission('roles.view'), (req, res) => {
  const permissionsCatalog = [
    {
      group: 'Dashboard & Reports',
      permissions: [
        { key: 'dashboard.view', label: 'View Dashboard' },
        { key: 'analytics.view', label: 'View Analytics & Revenue' }
      ]
    },
    {
      group: 'User Management',
      permissions: [
        { key: 'users.view', label: 'View Users List & Profiles' },
        { key: 'users.create', label: 'Create New Users' },
        { key: 'users.edit', label: 'Edit User Information' },
        { key: 'users.balance', label: 'Credit / Debit Wallet Balance' },
        { key: 'users.impersonate', label: 'Login as User (Impersonate)' },
        { key: 'users.delete', label: 'Delete Users' },
        { key: 'users.mail', label: 'Send Mail To Users' }
      ]
    },
    {
      group: 'Staff & Roles',
      permissions: [
        { key: 'staff.view', label: 'View Staff Members' },
        { key: 'staff.manage', label: 'Add, Edit & Remove Staff' },
        { key: 'roles.view', label: 'View Roles & Permissions' },
        { key: 'roles.manage', label: 'Create, Edit & Delete Roles' }
      ]
    },
    {
      group: 'Services & Catalog',
      permissions: [
        { key: 'services.view', label: 'View Services & Categories' },
        { key: 'services.create', label: 'Create New Services' },
        { key: 'services.edit', label: 'Update Service Rates & Details' },
        { key: 'services.delete', label: 'Delete Services' }
      ]
    },
    {
      group: 'Order Management',
      permissions: [
        { key: 'orders.view', label: 'View Orders List & Details' },
        { key: 'orders.status', label: 'Change Order Status' },
        { key: 'orders.refill', label: 'Process Refill & Cancellation' }
      ]
    },
    {
      group: 'API Providers Engine',
      permissions: [
        { key: 'providers.view', label: 'View API Providers' },
        { key: 'providers.manage', label: 'Configure Providers & Sync Services' }
      ]
    },
    {
      group: 'Financials & Currencies',
      permissions: [
        { key: 'payments.view', label: 'View Payment & Deposit Logs' },
        { key: 'payments.manage', label: 'Approve & Reject Manual Payments' },
        { key: 'currencies.manage', label: 'Manage Currencies & Exchange Rates' }
      ]
    },
    {
      group: 'Support Tickets',
      permissions: [
        { key: 'tickets.view', label: 'View Tickets' },
        { key: 'tickets.reply', label: 'Answer & Close Tickets' }
      ]
    },
    {
      group: 'Settings & System Controls',
      permissions: [
        { key: 'settings.general', label: 'Update General & Basic Settings' },
        { key: 'settings.email', label: 'Configure Email & SMTP' },
        { key: 'settings.notifications', label: 'Configure Push Notifications' },
        { key: 'settings.addons', label: 'Manage System Addons' }
      ]
    }
  ];

  return successResponse(res, { permissions: permissionsCatalog }, 'Permissions catalog retrieved');
});

// ──────────────── POST /api/admin/roles ────────────────
router.post('/roles', hasPermission('roles.manage'), [
  body('name').trim().notEmpty().withMessage('Role name is required'),
  body('description').optional().trim(),
  body('permissions').isArray().withMessage('Permissions array required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

    const { name, description = '', permissions = [] } = req.body;

    const existing = db.prepare('SELECT id FROM roles WHERE name = ?').get(name);
    if (existing) return errorResponse(res, 'Role with this name already exists.', 409);

    const result = db.prepare(`
      INSERT INTO roles (name, description, permissions, status)
      VALUES (?, ?, ?, 'active')
    `).run(name, description, JSON.stringify(permissions));

    logAdminActivity(req.user.id, 'role_created', { roleId: result.lastInsertRowid, name }, req);

    return successResponse(res, {
      role: {
        id: result.lastInsertRowid,
        name,
        description,
        permissions,
        status: 'active'
      }
    }, 'Role created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create role.', 500);
  }
});

// ──────────────── PUT /api/admin/roles/:id ────────────────
router.put('/roles/:id', hasPermission('roles.manage'), [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('permissions').optional().isArray(),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
    if (!role) return errorResponse(res, 'Role not found.', 404);

    const { name, description, permissions, status } = req.body;
    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (permissions !== undefined) { updates.push('permissions = ?'); values.push(JSON.stringify(permissions)); }
    if (status) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) return errorResponse(res, 'No fields to update.', 400);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(role.id);

    db.prepare(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    logAdminActivity(req.user.id, 'role_updated', { roleId: role.id, name: name || role.name }, req);

    return successResponse(res, {}, 'Role updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update role.', 500);
  }
});

// ──────────────── DELETE /api/admin/roles/:id ────────────────
router.delete('/roles/:id', hasPermission('roles.manage'), (req, res) => {
  try {
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
    if (!role) return errorResponse(res, 'Role not found.', 404);

    if (role.name === 'Super Admin') {
      return errorResponse(res, 'Cannot delete the Super Admin role.', 403);
    }

    const assignedStaff = db.prepare('SELECT COUNT(*) as count FROM staff WHERE role_id = ?').get(role.id).count;
    if (assignedStaff > 0) {
      return errorResponse(res, `Cannot delete role. It is currently assigned to ${assignedStaff} staff members.`, 400);
    }

    db.prepare('DELETE FROM roles WHERE id = ?').run(role.id);
    logAdminActivity(req.user.id, 'role_deleted', { roleId: role.id, name: role.name }, req);

    return successResponse(res, {}, 'Role deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete role.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                  ADMIN ACTIVITY LOGS
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/activity-logs ────────────────
router.get('/activity-logs', hasPermission('settings.general'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim()
], (req, res) => {
  try {
    const { search } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    let where = [];
    let params = [];

    if (search) {
      where.push('(a.action LIKE ? OR u.username LIKE ? OR a.details LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total 
      FROM admin_activity_logs a
      LEFT JOIN users u ON a.admin_id = u.id
      ${whereClause}
    `).get(...params);

    const logs = db.prepare(`
      SELECT a.*, u.username as admin_username, u.email as admin_email
      FROM admin_activity_logs a
      LEFT JOIN users u ON a.admin_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return successResponse(res, {
      logs,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Activity logs retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve activity logs.', 500);
  }
});

// ──────────────── DELETE /api/admin/activity-logs/clear ────────────────
router.delete('/activity-logs/clear', hasPermission('settings.general'), (req, res) => {
  try {
    db.prepare("DELETE FROM admin_activity_logs WHERE created_at <= datetime('now', '-30 days')").run();
    logAdminActivity(req.user.id, 'activity_logs_cleared', {}, req);
    return successResponse(res, {}, 'Historical activity logs cleared.');
  } catch (error) {
    return errorResponse(res, 'Failed to clear activity logs.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                   CURRENCY MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/currencies ────────────────
router.get('/currencies', hasPermission('currencies.manage'), (req, res) => {
  try {
    const currencies = db.prepare('SELECT * FROM currencies ORDER BY is_default DESC, name ASC').all();
    return successResponse(res, { currencies }, 'Currencies retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve currencies.', 500);
  }
});

// ──────────────── POST /api/admin/currencies ────────────────
router.post('/currencies', hasPermission('currencies.manage'), [
  body('name').trim().notEmpty().withMessage('Currency name is required'),
  body('code').trim().isLength({ min: 2, max: 10 }).toUpperCase().withMessage('Currency code required (e.g. USD, BDT)'),
  body('symbol').trim().notEmpty().withMessage('Symbol is required (e.g. $, ৳)'),
  body('exchange_rate').isFloat({ min: 0.000001 }).withMessage('Valid positive exchange rate required'),
  body('is_default').optional().isInt({ min: 0, max: 1 }),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

    const { name, code, symbol, exchange_rate, is_default = 0, status = 'active' } = req.body;

    const existing = db.prepare('SELECT id FROM currencies WHERE code = ?').get(code);
    if (existing) return errorResponse(res, `Currency with code '${code}' already exists.`, 409);

    const insertTx = db.transaction(() => {
      if (is_default === 1) {
        db.prepare('UPDATE currencies SET is_default = 0').run();
      }
      return db.prepare(`
        INSERT INTO currencies (name, code, symbol, exchange_rate, is_default, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(name, code, symbol, parseFloat(exchange_rate), is_default, status);
    });

    const result = insertTx();
    logAdminActivity(req.user.id, 'currency_created', { code, name, exchange_rate }, req);

    return successResponse(res, { id: result.lastInsertRowid }, 'Currency added successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to add currency.', 500);
  }
});

// ──────────────── PUT /api/admin/currencies/:id ────────────────
router.put('/currencies/:id', hasPermission('currencies.manage'), [
  body('name').optional().trim().notEmpty(),
  body('symbol').optional().trim().notEmpty(),
  body('exchange_rate').optional().isFloat({ min: 0.000001 }),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const currency = db.prepare('SELECT * FROM currencies WHERE id = ?').get(req.params.id);
    if (!currency) return errorResponse(res, 'Currency not found.', 404);

    const { name, symbol, exchange_rate, status } = req.body;
    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (symbol) { updates.push('symbol = ?'); values.push(symbol); }
    if (exchange_rate) { updates.push('exchange_rate = ?'); values.push(parseFloat(exchange_rate)); }
    if (status) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) return errorResponse(res, 'No fields to update.', 400);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(currency.id);

    db.prepare(`UPDATE currencies SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    logAdminActivity(req.user.id, 'currency_updated', { code: currency.code, changes: req.body }, req);

    return successResponse(res, {}, 'Currency updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update currency.', 500);
  }
});

// ──────────────── PUT /api/admin/currencies/:id/set-default ────────────────
router.put('/currencies/:id/set-default', hasPermission('currencies.manage'), (req, res) => {
  try {
    const currency = db.prepare('SELECT * FROM currencies WHERE id = ?').get(req.params.id);
    if (!currency) return errorResponse(res, 'Currency not found.', 404);

    const setDefaultTx = db.transaction(() => {
      db.prepare('UPDATE currencies SET is_default = 0').run();
      db.prepare("UPDATE currencies SET is_default = 1, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(currency.id);
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value, group_name) VALUES ('currency_code', ?, 'general')").run(currency.code);
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value, group_name) VALUES ('currency_symbol', ?, 'general')").run(currency.symbol);
    });

    setDefaultTx();
    logAdminActivity(req.user.id, 'currency_set_default', { code: currency.code }, req);

    return successResponse(res, {}, `${currency.name} (${currency.code}) set as default currency.`);
  } catch (error) {
    return errorResponse(res, 'Failed to set default currency.', 500);
  }
});

// ──────────────── DELETE /api/admin/currencies/:id ────────────────
router.delete('/currencies/:id', hasPermission('currencies.manage'), (req, res) => {
  try {
    const currency = db.prepare('SELECT * FROM currencies WHERE id = ?').get(req.params.id);
    if (!currency) return errorResponse(res, 'Currency not found.', 404);

    if (currency.is_default === 1) {
      return errorResponse(res, 'Cannot delete the default platform currency.', 400);
    }

    db.prepare('DELETE FROM currencies WHERE id = ?').run(currency.id);
    logAdminActivity(req.user.id, 'currency_deleted', { code: currency.code }, req);

    return successResponse(res, {}, 'Currency deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete currency.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                 GENERAL & SYSTEM SETTINGS
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/settings ────────────────
router.get('/settings', hasPermission('settings.general'), (req, res) => {
  try {
    const rawSettings = db.prepare('SELECT key, value, group_name FROM system_settings').all();
    const settings = {};
    for (const s of rawSettings) {
      settings[s.key] = s.value;
    }
    return successResponse(res, { settings }, 'System settings retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve settings.', 500);
  }
});

// ──────────────── PUT /api/admin/settings ────────────────
router.put('/settings', hasPermission('settings.general'), [
  body('settings').isObject().withMessage('Settings object required')
], (req, res) => {
  try {
    const { settings } = req.body;
    const upsertStmt = db.prepare(`
      INSERT INTO system_settings (key, value, group_name, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    const saveTx = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        let groupName = 'general';
        if (key.startsWith('mail_') || key.startsWith('email_')) groupName = 'email';
        else if (key.startsWith('firebase_') || key.startsWith('push_')) groupName = 'notification';
        else if (key.includes('color') || key.includes('theme')) groupName = 'theme';
        upsertStmt.run(key, String(value), groupName);
      }
    });

    saveTx();
    logAdminActivity(req.user.id, 'settings_updated', { keysUpdated: Object.keys(settings) }, req);

    return successResponse(res, {}, 'Settings updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update settings.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                 EMAIL SETTINGS & TEMPLATES
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/google-login-settings ────────────────
router.get('/google-login-settings', hasPermission('settings.general'), (req, res) => {
  try {
    const g = getGoogleSettings();
    return successResponse(res, {
      settings: {
        enabled: g.login_enabled_flag,
        client_id: g.client_id,
        allow_signup: g.allow_signup,
        allow_staff: g.allow_staff
      }
    }, 'Google login settings retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve Google login settings.', 500);
  }
});

// ──────────────── PUT /api/admin/google-login-settings ────────────────
router.put('/google-login-settings', hasPermission('settings.general'), [
  body('enabled').isBoolean().withMessage('enabled must be true or false'),
  body('allow_signup').isBoolean().withMessage('allow_signup must be true or false'),
  body('allow_staff').isBoolean().withMessage('allow_staff must be true or false'),
  body('client_id').optional({ nullable: true }).isString().trim().isLength({ max: 200 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const clientId = String(req.body.client_id || '').trim();
    const enabled = req.body.enabled === true || req.body.enabled === 'true';

    if (clientId && !CLIENT_ID_PATTERN.test(clientId)) {
      return errorResponse(res, 'Client ID must look like 123456-abc.apps.googleusercontent.com', 422);
    }
    if (enabled && !clientId) {
      return errorResponse(res, 'Enter your Google Client ID before enabling Google login.', 422);
    }

    const values = {
      google_login_enabled: enabled ? '1' : '0',
      google_client_id: clientId,
      google_allow_signup: (req.body.allow_signup === true || req.body.allow_signup === 'true') ? '1' : '0',
      google_allow_staff: (req.body.allow_staff === true || req.body.allow_staff === 'true') ? '1' : '0'
    };

    const upsert = db.prepare(`
      INSERT INTO system_settings (key, value, group_name, updated_at)
      VALUES (?, ?, 'google_auth', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, group_name = 'google_auth', updated_at = CURRENT_TIMESTAMP
    `);
    db.transaction(() => {
      for (const [k, v] of Object.entries(values)) upsert.run(k, v);
    })();

    logAdminActivity(req.user.id, 'google_login_settings_updated', { enabled, allow_signup: values.google_allow_signup === '1', allow_staff: values.google_allow_staff === '1' }, req);
    return successResponse(res, {}, 'Google login settings saved');
  } catch (error) {
    console.error('Google settings save error:', error);
    return errorResponse(res, 'Failed to save Google login settings.', 500);
  }
});

// ──────────────── GET /api/admin/email-settings ────────────────
router.get('/email-settings', hasPermission('settings.email'), (req, res) => {
  try {
    const rows = db.prepare("SELECT key, value FROM system_settings WHERE group_name = 'email'").all();
    const emailConfig = {
      mail_driver: 'smtp',
      mail_host: 'smtp.mailtrap.io',
      mail_port: '2525',
      mail_username: '',
      mail_password: '',
      mail_encryption: 'tls',
      mail_from_address: 'support@smmuper.com',
      mail_from_name: 'SMMuper Support',
    };
    for (const r of rows) {
      emailConfig[r.key] = r.value;
    }
    return successResponse(res, { emailConfig }, 'Email settings retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve email settings.', 500);
  }
});

// ──────────────── PUT /api/admin/email-settings ────────────────
router.put('/email-settings', hasPermission('settings.email'), (req, res) => {
  try {
    const emailData = req.body;
    const upsertStmt = db.prepare(`
      INSERT INTO system_settings (key, value, group_name, updated_at)
      VALUES (?, ?, 'email', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    const saveTx = db.transaction(() => {
      for (const [key, value] of Object.entries(emailData)) {
        if (!/^mail_[a-z_]+$/.test(key)) continue; // only email settings may be written here
        upsertStmt.run(key, String(value == null ? '' : value));
      }
    });

    saveTx();
    logAdminActivity(req.user.id, 'email_settings_updated', {}, req);

    return successResponse(res, {}, 'Email settings saved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to save email settings.', 500);
  }
});

// ──────────────── POST /api/admin/email-settings/test ────────────────
router.post('/email-settings/test', hasPermission('settings.email'), [
  body('email').isEmail().withMessage('Valid recipient email required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Enter a valid recipient email address.', 422, errors.array());
  }
  const { email } = req.body;
  try {
    await sendMail({
      to: email,
      subject: 'SMMuper test email',
      text: 'This is a test email from your SMMuper admin panel. If you can read this, your email settings work.',
      html: '<p>This is a test email from your <strong>SMMuper</strong> admin panel.</p><p>If you can read this, your email settings work.</p>'
    });
    logAdminActivity(req.user.id, 'test_email_sent', { recipient: email }, req);
    return successResponse(res, {}, `Test email sent to ${email}. Check the inbox (and the spam folder).`);
  } catch (error) {
    if (error.code === 'MAIL_NOT_CONFIGURED') {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, `Could not send the test email: ${error.message}`, 502);
  }
});

// ──────────────── GET /api/admin/email-templates ────────────────
router.get('/email-templates', hasPermission('settings.email'), (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM email_templates ORDER BY id ASC').all();
    return successResponse(res, { templates }, 'Email templates retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve email templates.', 500);
  }
});

// ──────────────── PUT /api/admin/email-templates/:id ────────────────
router.put('/email-templates/:id', hasPermission('settings.email'), [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('body').trim().notEmpty().withMessage('Body is required'),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const tpl = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(req.params.id);
    if (!tpl) return errorResponse(res, 'Template not found.', 404);

    const { subject, body, status = 'active' } = req.body;
    db.prepare(`
      UPDATE email_templates 
      SET subject = ?, body = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(subject, body, status, tpl.id);

    logAdminActivity(req.user.id, 'email_template_updated', { templateCode: tpl.code }, req);

    return successResponse(res, {}, 'Email template saved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update email template.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//              NOTIFICATION SETTINGS & TEMPLATES
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/notification-settings ────────────────
router.get('/notification-settings', hasPermission('settings.notifications'), (req, res) => {
  try {
    const rows = db.prepare("SELECT key, value FROM system_settings WHERE group_name = 'notification'").all();
    const config = {
      firebase_api_key: '',
      firebase_auth_domain: '',
      firebase_project_id: '',
      firebase_storage_bucket: '',
      firebase_messaging_sender_id: '',
      firebase_app_id: '',
      firebase_enabled: '0'
    };
    for (const r of rows) {
      config[r.key] = r.value;
    }
    return successResponse(res, { config }, 'Notification settings retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve notification settings.', 500);
  }
});

// ──────────────── PUT /api/admin/notification-settings ────────────────
router.put('/notification-settings', hasPermission('settings.notifications'), (req, res) => {
  try {
    const data = req.body;
    const upsertStmt = db.prepare(`
      INSERT INTO system_settings (key, value, group_name, updated_at)
      VALUES (?, ?, 'notification', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    const saveTx = db.transaction(() => {
      for (const [key, value] of Object.entries(data)) {
        upsertStmt.run(key, String(value));
      }
    });

    saveTx();
    logAdminActivity(req.user.id, 'notification_settings_updated', {}, req);

    return successResponse(res, {}, 'Notification configuration saved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to save notification settings.', 500);
  }
});

// ──────────────── GET /api/admin/notification-templates ────────────────
router.get('/notification-templates', hasPermission('settings.notifications'), (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM notification_templates ORDER BY id ASC').all();
    return successResponse(res, { templates }, 'Notification templates retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve notification templates.', 500);
  }
});

// ──────────────── PUT /api/admin/notification-templates/:id ────────────────
router.put('/notification-templates/:id', hasPermission('settings.notifications'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('body').trim().notEmpty().withMessage('Body is required'),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const tpl = db.prepare('SELECT * FROM notification_templates WHERE id = ?').get(req.params.id);
    if (!tpl) return errorResponse(res, 'Template not found.', 404);

    const { title, body, status = 'active' } = req.body;
    db.prepare(`
      UPDATE notification_templates 
      SET title = ?, body = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(title, body, status, tpl.id);

    logAdminActivity(req.user.id, 'notification_template_updated', { templateCode: tpl.code }, req);

    return successResponse(res, {}, 'Notification template saved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update notification template.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//               SYSTEM CONTROLS & ADDON MANAGER
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/addons ────────────────
router.get('/addons', hasPermission('settings.addons'), (req, res) => {
  try {
    const addons = db.prepare('SELECT * FROM addons ORDER BY id ASC').all();
    return successResponse(res, { addons }, 'Addons retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve addons.', 500);
  }
});

// ──────────────── PUT /api/admin/addons/:id/toggle ────────────────
router.put('/addons/:id/toggle', hasPermission('settings.addons'), (req, res) => {
  try {
    const addon = db.prepare('SELECT * FROM addons WHERE id = ?').get(req.params.id);
    if (!addon) return errorResponse(res, 'Addon not found.', 404);

    const nextStatus = addon.status === 'active' ? 'inactive' : 'active';
    db.prepare('UPDATE addons SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextStatus, addon.id);

    logAdminActivity(req.user.id, 'addon_toggled', { addonCode: addon.code, status: nextStatus }, req);

    return successResponse(res, { status: nextStatus }, `Addon '${addon.name}' is now ${nextStatus}.`);
  } catch (error) {
    return errorResponse(res, 'Failed to toggle addon status.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                     NOTICES MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/notices ────────────────
router.get('/notices', hasPermission('settings.general'), (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    let query = 'SELECT * FROM notices WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const notices = db.prepare(query).all(...params);
    const totalCount = db.prepare('SELECT COUNT(*) as c FROM notices').get().c;

    return successResponse(res, { notices, total: totalCount, page: Number(page), limit: Number(limit) }, 'Notices retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch notices.', 500);
  }
});

// ──────────────── GET /api/admin/notices/:id ────────────────
router.get('/notices/:id', hasPermission('settings.general'), (req, res) => {
  try {
    const notice = db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
    if (!notice) return errorResponse(res, 'Notice not found.', 404);
    return successResponse(res, { notice }, 'Notice details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch notice.', 500);
  }
});

// ──────────────── POST /api/admin/notices ────────────────
router.post('/notices', hasPermission('settings.general'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const { title, description, image = null, status = 'active' } = req.body;
    const result = db.prepare(`
      INSERT INTO notices (title, description, image, status)
      VALUES (?, ?, ?, ?)
    `).run(title, description, image, status);

    logAdminActivity(req.user.id, 'notice_created', { noticeId: result.lastInsertRowid, title }, req);

    return successResponse(res, { id: result.lastInsertRowid }, 'Notice created successfully.', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create notice.', 500);
  }
});

// ──────────────── PUT /api/admin/notices/:id ────────────────
router.put('/notices/:id', hasPermission('settings.general'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const notice = db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
    if (!notice) return errorResponse(res, 'Notice not found.', 404);

    const { title, description, image, status } = req.body;
    db.prepare(`
      UPDATE notices
      SET title = ?, description = ?, image = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, description, image !== undefined ? image : notice.image, status || notice.status, notice.id);

    logAdminActivity(req.user.id, 'notice_updated', { noticeId: notice.id, title }, req);

    return successResponse(res, {}, 'Notice updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update notice.', 500);
  }
});

// ──────────────── DELETE /api/admin/notices/:id ────────────────
router.delete('/notices/:id', hasPermission('settings.general'), (req, res) => {
  try {
    const notice = db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
    if (!notice) return errorResponse(res, 'Notice not found.', 404);

    db.prepare('DELETE FROM notices WHERE id = ?').run(notice.id);
    logAdminActivity(req.user.id, 'notice_deleted', { noticeId: notice.id, title: notice.title }, req);

    return successResponse(res, {}, 'Notice deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete notice.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                 BLOG AUTHORS MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/blog-authors ────────────────
router.get('/blog-authors', hasPermission('settings.general'), (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    let query = 'SELECT * FROM blog_authors WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (name LIKE ? OR address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const authors = db.prepare(query).all(...params);
    const totalCount = db.prepare('SELECT COUNT(*) as c FROM blog_authors').get().c;

    return successResponse(res, { authors, total: totalCount, page: Number(page), limit: Number(limit) }, 'Blog authors retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch blog authors.', 500);
  }
});

// ──────────────── GET /api/admin/blog-authors/:id ────────────────
router.get('/blog-authors/:id', hasPermission('settings.general'), (req, res) => {
  try {
    const author = db.prepare('SELECT * FROM blog_authors WHERE id = ?').get(req.params.id);
    if (!author) return errorResponse(res, 'Author not found.', 404);
    return successResponse(res, { author }, 'Author details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch author.', 500);
  }
});

// ──────────────── POST /api/admin/blog-authors ────────────────
router.post('/blog-authors', hasPermission('settings.general'), [
  body('name').trim().notEmpty().withMessage('Author name is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const { name, address = '', slug, about = '', image = null, social_links = '[]', status = 'active' } = req.body;
    const authorSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const serializedSocial = typeof social_links === 'string' ? social_links : JSON.stringify(social_links);

    const result = db.prepare(`
      INSERT INTO blog_authors (name, address, slug, about, image, social_links, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, address, authorSlug, about, image, serializedSocial, status);

    logAdminActivity(req.user.id, 'blog_author_created', { authorId: result.lastInsertRowid, name }, req);

    return successResponse(res, { id: result.lastInsertRowid }, 'Blog author created successfully.', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create blog author.', 500);
  }
});

// ──────────────── PUT /api/admin/blog-authors/:id ────────────────
router.put('/blog-authors/:id', hasPermission('settings.general'), [
  body('name').trim().notEmpty().withMessage('Author name is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const author = db.prepare('SELECT * FROM blog_authors WHERE id = ?').get(req.params.id);
    if (!author) return errorResponse(res, 'Author not found.', 404);

    const { name, address, slug, about, image, social_links, status } = req.body;
    const authorSlug = slug || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : author.slug);
    const serializedSocial = social_links !== undefined ? (typeof social_links === 'string' ? social_links : JSON.stringify(social_links)) : author.social_links;

    db.prepare(`
      UPDATE blog_authors
      SET name = ?, address = ?, slug = ?, about = ?, image = ?, social_links = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || author.name,
      address !== undefined ? address : author.address,
      authorSlug,
      about !== undefined ? about : author.about,
      image !== undefined ? image : author.image,
      serializedSocial,
      status || author.status,
      author.id
    );

    logAdminActivity(req.user.id, 'blog_author_updated', { authorId: author.id, name }, req);

    return successResponse(res, {}, 'Blog author updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update blog author.', 500);
  }
});

// ──────────────── DELETE /api/admin/blog-authors/:id ────────────────
router.delete('/blog-authors/:id', hasPermission('settings.general'), (req, res) => {
  try {
    const author = db.prepare('SELECT * FROM blog_authors WHERE id = ?').get(req.params.id);
    if (!author) return errorResponse(res, 'Author not found.', 404);

    db.prepare('DELETE FROM blog_authors WHERE id = ?').run(author.id);
    logAdminActivity(req.user.id, 'blog_author_deleted', { authorId: author.id, name: author.name }, req);

    return successResponse(res, {}, 'Blog author deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete blog author.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//          PHASE 3: MULTI-PROVIDER API ENGINE
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/providers ────────────────
router.get('/providers', hasPermission('providers.view'), (req, res) => {
  try {
    const providers = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM services s WHERE s.provider_id = p.id) as mapped_services_count
      FROM api_providers p
      ORDER BY p.id ASC
    `).all();

    const totalCount = providers.length;
    const activeCount = providers.filter(p => p.status === 'active').length;
    const inactiveCount = totalCount - activeCount;

    // Mask API keys for safe display in UI tables
    const safeProviders = providers.map(p => ({
      ...p,
      masked_key: p.api_key ? (p.api_key.slice(0, 4) + '••••••••••••••••' + p.api_key.slice(-4)) : '••••••••',
      conversion_rate: parseFloat(p.conversion_rate || 1.0)
    }));

    return successResponse(res, {
      providers: safeProviders,
      stats: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount
      }
    }, 'API providers retrieved');
  } catch (error) {
    console.error('Fetch providers error:', error);
    return errorResponse(res, 'Failed to retrieve API providers.', 500);
  }
});

// ──────────────── GET /api/admin/providers/:id ────────────────
router.get('/providers/:id', hasPermission('providers.view'), (req, res) => {
  try {
    const provider = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM services s WHERE s.provider_id = p.id) as mapped_services_count
      FROM api_providers p
      WHERE p.id = ?
    `).get(req.params.id);

    if (!provider) return errorResponse(res, 'API provider not found.', 404);

    return successResponse(res, {
      provider: {
        ...provider,
        masked_key: provider.api_key ? (provider.api_key.slice(0, 4) + '••••••••••••••••' + provider.api_key.slice(-4)) : '••••••••',
        conversion_rate: parseFloat(provider.conversion_rate || 1.0)
      }
    }, 'Provider details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch provider details.', 500);
  }
});

// ──────────────── POST /api/admin/providers ────────────────
router.post('/providers', hasPermission('providers.manage'), [
  body('name').trim().notEmpty().withMessage('Provider name is required'),
  body('api_url').trim().isURL().withMessage('Valid API URL is required'),
  body('api_key').trim().notEmpty().withMessage('API Key is required'),
  body('currency').optional().trim(),
  body('conversion_rate').optional().isFloat({ min: 0.0001 }),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const {
      name,
      api_url,
      api_key,
      currency = 'USD',
      conversion_rate = 1.0,
      status = 'active',
      description = ''
    } = req.body;

    const existing = db.prepare('SELECT id FROM api_providers WHERE name = ?').get(name);
    if (existing) return errorResponse(res, 'Provider name already exists.', 409);

    const result = db.prepare(`
      INSERT INTO api_providers (name, api_url, api_key, currency, conversion_rate, status, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, api_url, api_key, currency.toUpperCase(), parseFloat(conversion_rate), status, description);

    logAdminActivity(req.user.id, 'provider_created', { providerId: result.lastInsertRowid, name }, req);

    return successResponse(res, { id: result.lastInsertRowid }, 'API provider added successfully.', 201);
  } catch (error) {
    console.error('Create provider error:', error);
    return errorResponse(res, 'Failed to add provider.', 500);
  }
});

// ──────────────── PUT /api/admin/providers/:id ────────────────
router.put('/providers/:id', hasPermission('providers.manage'), [
  body('name').optional().trim().notEmpty(),
  body('api_url').optional().trim().isURL(),
  body('currency').optional().trim(),
  body('conversion_rate').optional().isFloat({ min: 0.0001 }),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(req.params.id);
    if (!provider) return errorResponse(res, 'Provider not found.', 404);

    const {
      name,
      api_url,
      api_key,
      currency,
      conversion_rate,
      status,
      description
    } = req.body;

    // Only update key if user did not leave it as dots/masked
    let finalKey = provider.api_key;
    if (api_key && !api_key.includes('••••')) {
      finalKey = api_key.trim();
    }

    db.prepare(`
      UPDATE api_providers
      SET name = ?, api_url = ?, api_key = ?, currency = ?, conversion_rate = ?,
          status = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || provider.name,
      api_url || provider.api_url,
      finalKey,
      currency ? currency.toUpperCase() : provider.currency,
      conversion_rate !== undefined ? parseFloat(conversion_rate) : provider.conversion_rate,
      status || provider.status,
      description !== undefined ? description : provider.description,
      provider.id
    );

    logAdminActivity(req.user.id, 'provider_updated', { providerId: provider.id, name: name || provider.name }, req);

    return successResponse(res, {}, 'API provider updated successfully');
  } catch (error) {
    console.error('Update provider error:', error);
    return errorResponse(res, 'Failed to update provider.', 500);
  }
});

// ──────────────── DELETE /api/admin/providers/:id ────────────────
router.delete('/providers/:id', hasPermission('providers.manage'), (req, res) => {
  try {
    const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(req.params.id);
    if (!provider) return errorResponse(res, 'Provider not found.', 404);

    // Unlink services
    db.prepare('UPDATE services SET provider_id = NULL WHERE provider_id = ?').run(provider.id);
    db.prepare('DELETE FROM api_providers WHERE id = ?').run(provider.id);

    logAdminActivity(req.user.id, 'provider_deleted', { providerId: provider.id, name: provider.name }, req);

    return successResponse(res, {}, `Provider '${provider.name}' deleted and services unlinked.`);
  } catch (error) {
    return errorResponse(res, 'Failed to delete provider.', 500);
  }
});

// ──────────────── POST /api/admin/providers/:id/test-connection ────────────────
router.post('/providers/:id/test-connection', hasPermission('providers.manage'), async (req, res) => {
  try {
    const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(req.params.id);
    if (!provider) return errorResponse(res, 'Provider not found.', 404);

    const result = await providerEngine.testConnection(provider);
    if (!result.success) {
      return errorResponse(res, `Connection test failed: ${result.error}`, 400);
    }

    return successResponse(res, {
      balance: result.balance,
      currency: result.currency,
      responseTimeMs: result.responseTimeMs
    }, `Connection test passed! Live balance: ${result.balance} ${result.currency} (${result.responseTimeMs}ms)`);
  } catch (error) {
    return errorResponse(res, error.message || 'Connection test error.', 500);
  }
});

// ──────────────── POST /api/admin/providers/:id/check-balance ────────────────
router.post('/providers/:id/check-balance', hasPermission('providers.manage'), async (req, res) => {
  try {
    const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(req.params.id);
    if (!provider) return errorResponse(res, 'Provider not found.', 404);

    const result = await providerEngine.checkBalance(provider);
    return successResponse(res, {
      balance: result.balance,
      currency: result.currency
    }, `Balance refreshed: ${result.balance} ${result.currency}`);
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to check balance.', 500);
  }
});

// ──────────────── GET /api/admin/providers/:id/remote-services ────────────────
router.get('/providers/:id/remote-services', hasPermission('providers.view'), async (req, res) => {
  try {
    const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(req.params.id);
    if (!provider) return errorResponse(res, 'Provider not found.', 404);

    const services = await providerEngine.fetchRemoteServices(provider);
    return successResponse(res, { services, count: services.length }, `Retrieved ${services.length} services from provider.`);
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to fetch remote services.', 500);
  }
});

// ──────────────── POST /api/admin/providers/:id/import-services ────────────────
router.post('/providers/:id/import-services', hasPermission('providers.manage'), async (req, res) => {
  try {
    const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(req.params.id);
    if (!provider) return errorResponse(res, 'Provider not found.', 404);

    const result = await providerEngine.importServices(provider.id, req.body);
    logAdminActivity(req.user.id, 'provider_services_imported', {
      providerId: provider.id,
      importedCount: result.importedCount,
      updatedCount: result.updatedCount
    }, req);

    return successResponse(res, result, `Successfully imported ${result.importedCount} new services (${result.updatedCount} updated).`);
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to import services.', 500);
  }
});

// ──────────────── POST /api/admin/providers/:id/sync-services ────────────────
router.post('/providers/:id/sync-services', hasPermission('providers.manage'), async (req, res) => {
  try {
    const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(req.params.id);
    if (!provider) return errorResponse(res, 'Provider not found.', 404);

    const result = await providerEngine.syncServices(provider.id, req.body);
    logAdminActivity(req.user.id, 'provider_services_synced', {
      providerId: provider.id,
      updatedCount: result.updatedCount,
      disabledCount: result.disabledCount
    }, req);

    return successResponse(res, result, `Synchronization complete: ${result.updatedCount} updated, ${result.disabledCount} disabled.`);
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to sync services.', 500);
  }
});

// ──────────────── GET /api/admin/providers/:id/logs ────────────────
router.get('/providers/:id/logs', hasPermission('providers.view'), (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const providerId = req.params.id;

    const total = db.prepare('SELECT COUNT(*) as c FROM provider_logs WHERE provider_id = ?').get(providerId).c;
    const logs = db.prepare(`
      SELECT * FROM provider_logs
      WHERE provider_id = ?
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(providerId, Number(limit), (Number(page) - 1) * Number(limit));

    return successResponse(res, {
      logs,
      total,
      page: Number(page),
      limit: Number(limit)
    }, 'Provider API logs retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch provider logs.', 500);
  }
});

// ──────────────── DELETE /api/admin/providers/:id/logs ────────────────
router.delete('/providers/:id/logs', hasPermission('providers.manage'), (req, res) => {
  try {
    db.prepare('DELETE FROM provider_logs WHERE provider_id = ?').run(req.params.id);
    return successResponse(res, {}, 'Provider logs cleared successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to clear provider logs.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//      PHASE 5: PAYMENT GATEWAYS & FINANCIAL MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/payment-methods ────────────────
// List payment gateways (Automatic & Manual)
router.get('/payment-methods', hasPermission('payments.view'), (req, res) => {
  try {
    const { type, status } = req.query;
    let where = [];
    let params = [];

    if (type && type !== 'all') {
      where.push('type = ?');
      params.push(type);
    }
    if (status && status !== 'all') {
      where.push('status = ?');
      params.push(status);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const methods = db.prepare(`
      SELECT 
        pm.*,
        (SELECT COUNT(*) FROM payments WHERE payment_method_id = pm.id AND status = 'completed') as total_completed_deposits,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_method_id = pm.id AND status = 'completed') as total_deposited_amount
      FROM payment_methods pm
      ${whereClause}
      ORDER BY pm.sort_order ASC, pm.id ASC
    `).all(...params);

    const stats = {
      total: methods.length,
      automatic: methods.filter(m => m.type === 'automatic').length,
      manual: methods.filter(m => m.type === 'manual').length,
      active: methods.filter(m => m.status === 'active').length,
      inactive: methods.filter(m => m.status === 'inactive').length
    };

    return successResponse(res, { methods, stats }, 'Payment methods retrieved');
  } catch (error) {
    console.error('Admin get payment methods error:', error);
    return errorResponse(res, 'Failed to retrieve payment methods.', 500);
  }
});

// ──────────────── GET /api/admin/payment-methods/:id ────────────────
router.get('/payment-methods/:id', hasPermission('payments.view'), (req, res) => {
  try {
    const method = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(req.params.id);
    if (!method) return errorResponse(res, 'Payment method not found.', 404);
    return successResponse(res, { method }, 'Payment method retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve payment method.', 500);
  }
});

// ──────────────── POST /api/admin/payment-methods ────────────────
// Create a new manual or automatic payment gateway
router.post('/payment-methods', hasPermission('payments.manage'), [
  body('name').trim().notEmpty().withMessage('Gateway name is required'),
  body('code').trim().notEmpty().withMessage('Unique code identifier is required'),
  body('type').isIn(['automatic', 'manual']).withMessage('Type must be automatic or manual'),
  body('currency').trim().notEmpty().withMessage('Currency is required'),
  body('exchange_rate').isFloat({ min: 0.0001 }).withMessage('Exchange rate must be positive'),
  body('min_amount').isFloat({ min: 0.1 }),
  body('max_amount').isFloat({ min: 1.0 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

    const {
      name, code, type, icon, currency, min_amount, max_amount,
      percentage_charge, fixed_charge, exchange_rate, instructions, parameters, status, sort_order
    } = req.body;

    const existing = db.prepare('SELECT id FROM payment_methods WHERE code = ?').get(code);
    if (existing) return errorResponse(res, `A payment method with code '${code}' already exists.`, 409);

    const result = db.prepare(`
      INSERT INTO payment_methods (
        name, code, type, icon, currency, min_amount, max_amount,
        percentage_charge, fixed_charge, exchange_rate, instructions, parameters, status, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      code,
      type,
      icon || 'credit-card',
      currency.toUpperCase(),
      parseFloat(min_amount) || 1.0,
      parseFloat(max_amount) || 10000.0,
      parseFloat(percentage_charge) || 0.0,
      parseFloat(fixed_charge) || 0.0,
      parseFloat(exchange_rate) || 1.0,
      instructions || '',
      typeof parameters === 'object' ? JSON.stringify(parameters) : (parameters || '{}'),
      (status === 'inactive' || status === 0 || status === '0') ? 'inactive' : 'active',
      sort_order || 0
    );

    logAdminActivity(req.user.id, 'payment_method.create', req.ip, req.headers['user-agent'], {
      methodId: result.lastInsertRowid,
      name,
      code
    });

    const method = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(result.lastInsertRowid);
    return successResponse(res, { method }, 'Payment gateway created successfully', 201);
  } catch (error) {
    console.error('Admin create payment method error:', error);
    return errorResponse(res, 'Failed to create payment method.', 500);
  }
});

// ──────────────── PUT /api/admin/payment-methods/:id ────────────────
// Update payment gateway parameters, limits, fees, exchange rate
router.put('/payment-methods/:id', hasPermission('payments.manage'), [
  body('name').optional().trim().notEmpty(),
  body('currency').optional().trim().notEmpty(),
  body('exchange_rate').optional().isFloat({ min: 0.0001 }),
  body('min_amount').optional().isFloat({ min: 0.1 }),
  body('max_amount').optional().isFloat({ min: 1.0 }),
  body('percentage_charge').optional().isFloat({ min: 0 }),
  body('fixed_charge').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'inactive'])
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

    const method = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(req.params.id);
    if (!method) return errorResponse(res, 'Payment method not found.', 404);

    const allowedFields = [
      'name', 'icon', 'currency', 'min_amount', 'max_amount',
      'percentage_charge', 'fixed_charge', 'exchange_rate',
      'instructions', 'parameters', 'status', 'sort_order'
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        let val = req.body[field];
        if (field === 'parameters' && typeof val === 'object') {
          val = JSON.stringify(val);
        } else if (field === 'currency') {
          val = String(val).toUpperCase();
        } else if (field === 'status') {
          val = (val === 'inactive' || val === 0 || val === '0') ? 'inactive' : 'active';
        }
        values.push(val);
      }
    }

    if (updates.length === 0) return errorResponse(res, 'No fields to update.', 400);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(method.id);

    db.prepare(`UPDATE payment_methods SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    logAdminActivity(req.user.id, 'payment_method.update', req.ip, req.headers['user-agent'], {
      methodId: method.id,
      name: req.body.name || method.name
    });

    const updated = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(method.id);
    return successResponse(res, { method: updated }, 'Payment method updated successfully');
  } catch (error) {
    console.error('Admin update payment method error:', error);
    return errorResponse(res, 'Failed to update payment method.', 500);
  }
});

// ──────────────── PUT /api/admin/payment-methods/:id/toggle ────────────────
router.put('/payment-methods/:id/toggle', hasPermission('payments.manage'), (req, res) => {
  try {
    const method = db.prepare('SELECT id, name, status FROM payment_methods WHERE id = ?').get(req.params.id);
    if (!method) return errorResponse(res, 'Payment method not found.', 404);

    const newStatus = method.status === 'active' ? 'inactive' : 'active';
    db.prepare('UPDATE payment_methods SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, method.id);

    return successResponse(res, { id: method.id, status: newStatus }, `Payment gateway marked as ${newStatus}`);
  } catch (error) {
    return errorResponse(res, 'Failed to toggle payment method status.', 500);
  }
});

// ──────────────── DELETE /api/admin/payment-methods/:id ────────────────
router.delete('/payment-methods/:id', hasPermission('payments.manage'), (req, res) => {
  try {
    const method = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(req.params.id);
    if (!method) return errorResponse(res, 'Payment method not found.', 404);

    // Guard: check if pending deposits exist
    const pendingCount = db.prepare("SELECT COUNT(*) as count FROM payments WHERE payment_method_id = ? AND status = 'pending'").get(method.id).count;
    if (pendingCount > 0) {
      return errorResponse(res, `Cannot delete method with ${pendingCount} pending payment requests. Deactivate it instead.`, 400);
    }

    db.prepare('DELETE FROM payment_methods WHERE id = ?').run(method.id);

    logAdminActivity(req.user.id, 'payment_method.delete', req.ip, req.headers['user-agent'], {
      methodId: method.id,
      name: method.name
    });

    return successResponse(res, {}, 'Payment gateway deleted successfully');
  } catch (error) {
    console.error('Admin delete payment method error:', error);
    return errorResponse(res, 'Failed to delete payment method.', 500);
  }
});

// ──────────────── GET /api/admin/payments ────────────────
// Payment Log (Matches admin_payment_log.png & admin_payment_pending.png)
router.get('/payments', hasPermission('payments.view'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('status').optional().isIn(['all', 'pending', 'completed', 'rejected', 'failed', 'refunded']),
  query('method_id').optional().isInt(),
  query('user_id').optional().isInt(),
  query('search').optional().trim()
], (req, res) => {
  try {
    const { status, method_id, user_id, search } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    // Global Payment Log Stats
    const statsRow = db.prepare(`
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(charge), 0) as total_charge,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM payments
    `).get();

    let where = [];
    let params = [];

    if (status && status !== 'all') {
      where.push('p.status = ?');
      params.push(status);
    }
    if (method_id) {
      where.push('p.payment_method_id = ?');
      params.push(parseInt(method_id));
    }
    if (user_id) {
      where.push('p.user_id = ?');
      params.push(parseInt(user_id));
    }
    if (search) {
      where.push('(p.transaction_id LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR p.method LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause}
    `).get(...params);

    const payments = db.prepare(`
      SELECT 
        p.*,
        u.username, u.email, u.balance as user_balance,
        pm.name as payment_method_name, pm.type as payment_method_type, pm.icon as payment_method_icon
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return successResponse(res, {
      payments,
      stats: statsRow,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Payments retrieved');
  } catch (error) {
    console.error('Admin get payments error:', error);
    return errorResponse(res, 'Failed to retrieve payment log.', 500);
  }
});

// ──────────────── GET /api/admin/payments/pending ────────────────
router.get('/payments/pending', hasPermission('payments.view'), (req, res) => {
  try {
    const pending = db.prepare(`
      SELECT 
        p.*,
        u.username, u.email, u.balance as user_balance,
        pm.name as payment_method_name, pm.icon as payment_method_icon
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at ASC
    `).all();

    const pendingStats = {
      count: pending.length,
      total_amount: pending.reduce((sum, p) => sum + (p.amount || 0), 0)
    };

    return successResponse(res, { payments: pending, pending, stats: pendingStats }, 'Pending payments retrieved');
  } catch (error) {
    console.error('Admin get pending payments error:', error);
    return errorResponse(res, 'Failed to retrieve pending payments.', 500);
  }
});

// ──────────────── GET /api/admin/payments/:id ────────────────
router.get('/payments/:id', hasPermission('payments.view'), (req, res) => {
  try {
    const payment = db.prepare(`
      SELECT 
        p.*,
        u.username, u.email, u.balance as user_balance,
        pm.name as payment_method_name, pm.icon as payment_method_icon, pm.instructions as method_instructions
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!payment) return errorResponse(res, 'Payment record not found.', 404);
    return successResponse(res, { payment }, 'Payment retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve payment.', 500);
  }
});

// ──────────────── POST /api/admin/payments/:id/approve ────────────────
// Approve pending deposit: atomically credit user wallet balance & record immutable financial ledger
router.post('/payments/:id/approve', hasPermission('payments.manage'), [
  body('feedback').optional().trim()
], (req, res) => {
  try {
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    if (!payment) return errorResponse(res, 'Payment record not found.', 404);

    if (payment.status !== 'pending') {
      return errorResponse(res, `Cannot approve payment with status '${payment.status}'. Only pending payments can be approved.`, 400);
    }

    const feedback = req.body.feedback || 'Manual payment verified and approved';
    let newBalance = 0;

    const approveTx = db.transaction(() => {
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(payment.user_id);
      newBalance = Math.round((user.balance + payment.amount) * 10000) / 10000;

      // 1. Credit User Balance
      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newBalance, payment.user_id);

      // 2. Insert into Immutable Financial Ledger
      db.prepare(`
        INSERT INTO financial_ledger (
          user_id, transaction_type, amount, balance_before, balance_after, currency, reference_id, reference_type, description
        ) VALUES (?, 'deposit', ?, ?, ?, 'USD', ?, 'deposit', ?)
      `).run(
        payment.user_id,
        payment.amount,
        user.balance,
        newBalance,
        payment.transaction_id,
        `Deposit approved via ${payment.method} (TrxID: ${payment.transaction_id})`
      );

      // 3. Mark Payment Completed
      db.prepare(`
        UPDATE payments SET
          status = 'completed',
          admin_feedback = ?,
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(feedback, req.user.id, payment.id);
    });

    approveTx();

    logAdminActivity(req.user.id, 'payment.approve', req.ip, req.headers['user-agent'], {
      paymentId: payment.id,
      userId: payment.user_id,
      amount: payment.amount,
      transactionId: payment.transaction_id
    });

    const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
    return successResponse(res, {
      payment: updated,
      new_balance: newBalance
    }, `Payment #${payment.id} approved. Credited $${payment.amount.toFixed(2)} to user.`);
  } catch (error) {
    console.error('Admin approve payment error:', error);
    return errorResponse(res, 'Failed to approve payment.', 500);
  }
});

// ──────────────── POST /api/admin/payments/:id/reject ────────────────
// Reject pending payment with feedback (does not touch balance)
router.post('/payments/:id/reject', hasPermission('payments.manage'), [
  body('reason').optional().trim()
], (req, res) => {
  try {
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    if (!payment) return errorResponse(res, 'Payment record not found.', 404);

    if (payment.status !== 'pending') {
      return errorResponse(res, `Cannot reject payment with status '${payment.status}'.`, 400);
    }

    const reason = req.body.feedback || req.body.reason || 'Payment verification failed. Invalid transaction details or unverified payment proof.';

    db.prepare(`
      UPDATE payments SET
        status = 'rejected',
        admin_feedback = ?,
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason, req.user.id, payment.id);

    logAdminActivity(req.user.id, 'payment.reject', req.ip, req.headers['user-agent'], {
      paymentId: payment.id,
      userId: payment.user_id,
      reason
    });

    const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
    return successResponse(res, { payment: updated }, `Payment #${payment.id} marked as rejected.`);
  } catch (error) {
    console.error('Admin reject payment error:', error);
    return errorResponse(res, 'Failed to reject payment.', 500);
  }
});

// ──────────────── GET /api/admin/transactions ────────────────
// Immutable Financial Ledger (Matches admin_transactions.png)
router.get('/transactions', hasPermission('payments.view'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('type').optional().isIn(['all', 'deposit', 'order_charge', 'order_refund', 'order_partial_refund', 'referral_commission', 'manual_credit', 'manual_debit']),
  query('user_id').optional().isInt(),
  query('search').optional().trim()
], (req, res) => {
  try {
    const { type, user_id, search } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    let where = [];
    let params = [];

    if (type && type !== 'all') {
      where.push('fl.transaction_type = ?');
      params.push(type);
    }
    if (user_id) {
      where.push('fl.user_id = ?');
      params.push(parseInt(user_id));
    }
    if (search) {
      where.push('(fl.reference_id LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR fl.description LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM financial_ledger fl
      LEFT JOIN users u ON fl.user_id = u.id
      ${whereClause}
    `).get(...params);

    const transactions = db.prepare(`
      SELECT 
        fl.*,
        u.username, u.email
      FROM financial_ledger fl
      LEFT JOIN users u ON fl.user_id = u.id
      ${whereClause}
      ORDER BY fl.created_at DESC, fl.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // Ledger Summary
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN transaction_type IN ('deposit', 'order_refund', 'order_partial_refund', 'manual_credit', 'referral_commission') THEN amount ELSE 0 END), 0) as total_credited,
        COALESCE(SUM(CASE WHEN transaction_type IN ('order_charge', 'manual_debit') THEN amount ELSE 0 END), 0) as total_debited
      FROM financial_ledger
    `).get();

    return successResponse(res, {
      transactions,
      summary,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Financial transactions retrieved');
  } catch (error) {
    console.error('Admin get transactions error:', error);
    return errorResponse(res, 'Failed to retrieve transactions.', 500);
  }
});

// ──────────────── GET /api/admin/financial-reports ────────────────
// Comprehensive Financial Ledger & Profitability Analytics
router.get('/financial-reports', hasPermission('analytics.view'), [
  query('period').optional().isIn(['7d', '30d', '90d', '1y', 'all'])
], (req, res) => {
  try {
    const period = req.query.period || '30d';

    let dateFilter = '';
    if (period === '7d') dateFilter = "AND created_at >= datetime('now', '-7 days')";
    else if (period === '30d') dateFilter = "AND created_at >= datetime('now', '-30 days')";
    else if (period === '90d') dateFilter = "AND created_at >= datetime('now', '-90 days')";
    else if (period === '1y') dateFilter = "AND created_at >= datetime('now', '-1 year')";

    // Total Completed Deposit Revenue
    const depositMetrics = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_deposits,
        COALESCE(SUM(charge), 0) as total_gateway_fees,
        COUNT(*) as completed_count
      FROM payments
      WHERE status = 'completed' ${dateFilter}
    `).get();

    // Order Revenue vs Wholesale Cost
    const orderMetrics = db.prepare(`
      SELECT 
        COALESCE(SUM(charge), 0) as order_revenue,
        COALESCE(SUM(cost), 0) as provider_cost,
        COUNT(*) as total_orders
      FROM orders
      WHERE status NOT IN ('cancelled', 'refunded', 'failed') ${dateFilter}
    `).get();

    // Refunds issued via Ledger
    const refundMetrics = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_refunds,
        COUNT(*) as refund_count
      FROM financial_ledger
      WHERE transaction_type IN ('order_refund', 'order_partial_refund') ${dateFilter}
    `).get();

    const orderRevenue = Math.round(orderMetrics.order_revenue * 100) / 100;
    const providerCost = Math.round(orderMetrics.provider_cost * 100) / 100;
    const grossProfit = Math.round((orderRevenue - providerCost) * 100) / 100;
    const gatewayFees = Math.round(depositMetrics.total_gateway_fees * 100) / 100;
    const refunds = Math.round(refundMetrics.total_refunds * 100) / 100;
    const netProfit = Math.round((grossProfit + gatewayFees - refunds) * 100) / 100;

    // Daily breakdown for visual chart (last 30 days)
    const dailyChart = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(charge), 0) as revenue,
        COALESCE(SUM(cost), 0) as cost,
        COALESCE(SUM(charge - cost), 0) as gross_profit
      FROM orders
      WHERE status NOT IN ('cancelled', 'refunded', 'failed')
        AND created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `).all();

    const summaryData = {
      total_deposit_volume: depositMetrics.total_deposits,
      total_deposits: depositMetrics.total_deposits,
      order_revenue: orderRevenue,
      wholesale_provider_cost: providerCost,
      provider_cost: providerCost,
      gross_profit: grossProfit,
      gateway_fees_collected: gatewayFees,
      gateway_fees: gatewayFees,
      total_refunds_issued: refunds,
      total_refunds: refunds,
      refunds: refunds,
      net_profit: netProfit,
      profit_margin_pct: orderRevenue > 0 ? Math.round((grossProfit / orderRevenue) * 100) : 0
    };

    return successResponse(res, {
      period,
      summary: summaryData,
      daily_chart: dailyChart,
      daily_breakdown: dailyChart,
      reports: {
        summary: summaryData,
        daily_breakdown: dailyChart
      }
    }, 'Financial reports retrieved');
  } catch (error) {
    console.error('Admin get financial reports error:', error);
    return errorResponse(res, 'Failed to generate financial reports.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//                 REFERRAL & COMMISSION MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/admin/referrals ────────────────
router.get('/referrals', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('search').optional().trim()
], (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit || 20);
    const search = req.query.search ? req.query.search.trim() : '';

    let where = [];
    let params = [];

    if (search) {
      where.push('(ref.username LIKE ? OR ref.email LIKE ? OR rec.username LIKE ? OR rec.email LIKE ? OR rc.order_id LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total 
      FROM referral_commissions rc
      JOIN users ref ON rc.referrer_id = ref.id
      JOIN users rec ON rc.referred_user_id = rec.id
      ${whereClause}
    `).get(...params);

    const commissions = db.prepare(`
      SELECT 
        rc.*,
        ref.username as referrer_username,
        ref.email as referrer_email,
        rec.username as referred_username,
        rec.email as referred_email
      FROM referral_commissions rc
      JOIN users ref ON rc.referrer_id = ref.id
      JOIN users rec ON rc.referred_user_id = rec.id
      ${whereClause}
      ORDER BY rc.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // Global Statistics
    const statsRow = db.prepare(`
      SELECT 
        COALESCE(SUM(commission_amount), 0) as total_commissions_paid,
        COUNT(*) as total_commissions_count,
        COUNT(DISTINCT referrer_id) as total_active_referrers
      FROM referral_commissions
      WHERE status = 'credited'
    `).get();

    // System Settings
    const rateRow = db.prepare("SELECT value FROM system_settings WHERE key = 'referral_commission_rate'").get();
    const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'referral_system_enabled'").get();

    return successResponse(res, {
      commissions,
      pagination: paginationMeta(countRow.total, page, limit),
      stats: {
        total_commissions_paid: Math.round(statsRow.total_commissions_paid * 100) / 100,
        total_commissions_count: statsRow.total_commissions_count,
        total_active_referrers: statsRow.total_active_referrers
      },
      settings: {
        referral_commission_rate: rateRow ? parseFloat(rateRow.value) : 5.0,
        referral_system_enabled: enabledRow ? enabledRow.value === '1' : true
      }
    }, 'Referral commissions retrieved');

  } catch (error) {
    console.error('Admin get referrals error:', error);
    return errorResponse(res, 'Failed to retrieve referral commissions.', 500);
  }
});

// ──────────────── PUT /api/admin/referrals/settings ────────────────
router.put('/referrals/settings', [
  body('referral_commission_rate').optional().isFloat({ min: 0, max: 100 }),
  body('referral_system_enabled').optional()
], (req, res) => {
  try {
    const { referral_commission_rate, referral_system_enabled } = req.body;

    if (referral_commission_rate !== undefined) {
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('referral_commission_rate', ?)")
        .run(parseFloat(referral_commission_rate).toString());
    }

    if (referral_system_enabled !== undefined) {
      const enabledVal = (referral_system_enabled === true || referral_system_enabled === '1' || referral_system_enabled === 1) ? '1' : '0';
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('referral_system_enabled', ?)")
        .run(enabledVal);
    }

    const rateRow = db.prepare("SELECT value FROM system_settings WHERE key = 'referral_commission_rate'").get();
    const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'referral_system_enabled'").get();

    return successResponse(res, {
      settings: {
        referral_commission_rate: rateRow ? parseFloat(rateRow.value) : 5.0,
        referral_system_enabled: enabledRow ? enabledRow.value === '1' : true
      }
    }, 'Referral settings updated successfully');

  } catch (error) {
    console.error('Admin update referral settings error:', error);
    return errorResponse(res, 'Failed to update referral settings.', 500);
  }
});

// ═══════════════════════════════════════════════════════════
//          PHASE 7: ADVANCED FEATURES & CMS MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 1. CHILD PANELS ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────

// ── GET /api/admin/child-panels/dashboard ──
router.get('/child-panels/dashboard', (req, res) => {
  try {
    const totalPanels = db.prepare('SELECT COUNT(*) as c FROM child_panels').get().c;
    const activePanels = db.prepare("SELECT COUNT(*) as c FROM child_panels WHERE status = 'active'").get().c;
    const expiredPanels = db.prepare("SELECT COUNT(*) as c FROM child_panels WHERE status = 'expired'").get().c;
    const pendingPanels = db.prepare("SELECT COUNT(*) as c FROM child_panels WHERE status = 'pending'").get().c;
    const renewRequests = db.prepare("SELECT COUNT(*) as c FROM child_panels WHERE status = 'renew_requested'").get().c;

    const priceRow = db.prepare("SELECT value FROM system_settings WHERE key = 'child_panel_monthly_price'").get();
    const nsRow = db.prepare("SELECT value FROM system_settings WHERE key = 'child_panel_nameservers'").get();
    const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'child_panel_system_enabled'").get();

    return successResponse(res, {
      stats: {
        total: totalPanels,
        active: activePanels,
        expired: expiredPanels,
        pending: pendingPanels,
        renew_requested: renewRequests
      },
      settings: {
        monthly_price: priceRow ? parseFloat(priceRow.value) : 15.00,
        nameservers: nsRow ? nsRow.value : 'ns1.smmuper.com, ns2.smmuper.com',
        is_enabled: enabledRow ? enabledRow.value === '1' : true
      }
    }, 'Child panels dashboard data retrieved');
  } catch (error) {
    console.error('Admin child panels dashboard error:', error);
    return errorResponse(res, 'Failed to retrieve child panels dashboard.', 500);
  }
});

// ── GET /api/admin/child-panels ──
router.get('/child-panels', (req, res) => {
  try {
    const { search = '', status = 'all', page = 1, limit = 20 } = req.query;
    let where = [];
    let params = [];

    if (status && status !== 'all') {
      where.push('cp.status = ?');
      params.push(status);
    }

    if (search) {
      where.push('(cp.domain LIKE ? OR u.username LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM child_panels cp
      JOIN users u ON cp.user_id = u.id
      ${whereClause}
    `).get(...params);

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const panels = db.prepare(`
      SELECT 
        cp.*,
        u.username,
        u.email
      FROM child_panels cp
      JOIN users u ON cp.user_id = u.id
      ${whereClause}
      ORDER BY cp.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    return successResponse(res, {
      panels,
      pagination: paginationMeta(countRow.total, parseInt(page), parseInt(limit))
    }, 'Child panels retrieved');
  } catch (error) {
    console.error('Admin get child panels error:', error);
    return errorResponse(res, 'Failed to retrieve child panels.', 500);
  }
});

// ── PUT /api/admin/child-panels/settings ──
router.put('/child-panels/settings', [
  body('monthly_price').optional().isFloat({ min: 0 }),
  body('nameservers').optional().trim(),
  body('is_enabled').optional()
], (req, res) => {
  try {
    const { monthly_price, nameservers, is_enabled } = req.body;

    if (monthly_price !== undefined) {
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('child_panel_monthly_price', ?)")
        .run(parseFloat(monthly_price).toString());
    }

    if (nameservers !== undefined) {
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('child_panel_nameservers', ?)")
        .run(nameservers);
    }

    if (is_enabled !== undefined) {
      const val = (is_enabled === true || is_enabled === '1' || is_enabled === 1) ? '1' : '0';
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('child_panel_system_enabled', ?)")
        .run(val);
    }

    logAdminActivity(req.user.id, 'child_panel_settings_updated', { monthly_price, nameservers, is_enabled }, req);

    return successResponse(res, {}, 'Child panel settings updated successfully');
  } catch (error) {
    console.error('Update child panel settings error:', error);
    return errorResponse(res, 'Failed to update child panel settings.', 500);
  }
});

// ── PUT /api/admin/child-panels/:id ──
router.put('/child-panels/:id', [
  body('status').optional().isIn(['pending', 'active', 'expired', 'suspended', 'renew_requested', 'rejected']),
  body('expires_at').optional(),
  body('domain').optional().trim()
], (req, res) => {
  try {
    const panel = db.prepare('SELECT * FROM child_panels WHERE id = ?').get(req.params.id);
    if (!panel) return errorResponse(res, 'Child panel not found.', 404);

    const { status, expires_at, domain } = req.body;

    let newExpiresAt = expires_at !== undefined ? expires_at : panel.expires_at;
    // If transitioning from expired or renew_requested to active, extend expires_at by 30 days if expired
    if (status === 'active' && (panel.status === 'expired' || panel.status === 'renew_requested')) {
      const currentExpiry = panel.expires_at ? new Date(panel.expires_at) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      baseDate.setDate(baseDate.getDate() + 30);
      newExpiresAt = baseDate.toISOString().replace('T', ' ').slice(0, 19);
    }

    db.prepare(`
      UPDATE child_panels
      SET 
        status = ?,
        expires_at = ?,
        domain = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      status || panel.status,
      newExpiresAt,
      domain || panel.domain,
      panel.id
    );

    logAdminActivity(req.user.id, 'child_panel_updated', { panelId: panel.id, status, domain }, req);

    return successResponse(res, {}, 'Child panel updated successfully');
  } catch (error) {
    console.error('Update child panel error:', error);
    return errorResponse(res, 'Failed to update child panel.', 500);
  }
});

// ── DELETE /api/admin/child-panels/:id ──
router.delete('/child-panels/:id', (req, res) => {
  try {
    const panel = db.prepare('SELECT * FROM child_panels WHERE id = ?').get(req.params.id);
    if (!panel) return errorResponse(res, 'Child panel not found.', 404);

    db.prepare('DELETE FROM child_panels WHERE id = ?').run(panel.id);
    logAdminActivity(req.user.id, 'child_panel_deleted', { panelId: panel.id, domain: panel.domain }, req);

    return successResponse(res, {}, 'Child panel deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete child panel.', 500);
  }
});

// ─────────────────────────────────────────────────────────────
// 2. KYC VERIFICATION ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────

// ── GET /api/admin/kyc/settings ──
router.get('/kyc/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM kyc_settings ORDER BY id DESC').all();
    const formatted = settings.map(s => {
      let fields = [];
      try { fields = JSON.parse(s.fields); } catch (e) { fields = []; }
      return { ...s, fields };
    });

    return successResponse(res, { settings: formatted }, 'KYC settings retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve KYC settings.', 500);
  }
});

// ── POST /api/admin/kyc/settings ──
router.post('/kyc/settings', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('fields').notEmpty().withMessage('Fields definition is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const { title, description = '', fields, status = 'active' } = req.body;
    const jsonFields = typeof fields === 'string' ? fields : JSON.stringify(fields);

    const result = db.prepare(`
      INSERT INTO kyc_settings (title, description, fields, status)
      VALUES (?, ?, ?, ?)
    `).run(title, description, jsonFields, status);

    logAdminActivity(req.user.id, 'kyc_setting_created', { id: result.lastInsertRowid, title }, req);

    return successResponse(res, { id: result.lastInsertRowid }, 'KYC setting created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create KYC setting.', 500);
  }
});

// ── PUT /api/admin/kyc/settings/:id ──
router.put('/kyc/settings/:id', [
  body('title').trim().notEmpty().withMessage('Title is required')
], (req, res) => {
  try {
    const setting = db.prepare('SELECT * FROM kyc_settings WHERE id = ?').get(req.params.id);
    if (!setting) return errorResponse(res, 'KYC setting not found.', 404);

    const { title, description, fields, status } = req.body;
    const jsonFields = fields !== undefined ? (typeof fields === 'string' ? fields : JSON.stringify(fields)) : setting.fields;

    db.prepare(`
      UPDATE kyc_settings
      SET title = ?, description = ?, fields = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title,
      description !== undefined ? description : setting.description,
      jsonFields,
      status || setting.status,
      setting.id
    );

    logAdminActivity(req.user.id, 'kyc_setting_updated', { id: setting.id, title }, req);

    return successResponse(res, {}, 'KYC setting updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update KYC setting.', 500);
  }
});

// ── DELETE /api/admin/kyc/settings/:id ──
router.delete('/kyc/settings/:id', (req, res) => {
  try {
    const setting = db.prepare('SELECT * FROM kyc_settings WHERE id = ?').get(req.params.id);
    if (!setting) return errorResponse(res, 'KYC setting not found.', 404);

    db.prepare('DELETE FROM kyc_settings WHERE id = ?').run(setting.id);
    logAdminActivity(req.user.id, 'kyc_setting_deleted', { id: setting.id }, req);

    return successResponse(res, {}, 'KYC setting deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete KYC setting.', 500);
  }
});

// ── GET /api/admin/kyc/submissions ──
router.get('/kyc/submissions', (req, res) => {
  try {
    const { search = '', status = 'all', page = 1, limit = 20 } = req.query;
    let where = [];
    let params = [];

    if (status && status !== 'all') {
      where.push('ks.status = ?');
      params.push(status);
    }

    if (search) {
      where.push('(u.username LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM kyc_submissions ks
      JOIN users u ON ks.user_id = u.id
      ${whereClause}
    `).get(...params);

    const stats = {
      total: db.prepare('SELECT COUNT(*) as c FROM kyc_submissions').get().c,
      pending: db.prepare("SELECT COUNT(*) as c FROM kyc_submissions WHERE status = 'pending'").get().c,
      approved: db.prepare("SELECT COUNT(*) as c FROM kyc_submissions WHERE status = 'approved'").get().c,
      rejected: db.prepare("SELECT COUNT(*) as c FROM kyc_submissions WHERE status = 'rejected'").get().c
    };

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const submissions = db.prepare(`
      SELECT 
        ks.*,
        u.username,
        u.email,
        kset.title as form_title,
        rev.username as reviewer_username
      FROM kyc_submissions ks
      JOIN users u ON ks.user_id = u.id
      JOIN kyc_settings kset ON ks.kyc_setting_id = kset.id
      LEFT JOIN users rev ON ks.reviewed_by = rev.id
      ${whereClause}
      ORDER BY ks.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    const parsed = submissions.map(s => {
      let formData = {};
      try { formData = JSON.parse(s.form_data); } catch (e) { formData = {}; }
      return { ...s, form_data: formData };
    });

    return successResponse(res, {
      submissions: parsed,
      stats,
      pagination: paginationMeta(countRow.total, parseInt(page), parseInt(limit))
    }, 'KYC submissions retrieved');
  } catch (error) {
    console.error('Admin get KYC submissions error:', error);
    return errorResponse(res, 'Failed to retrieve KYC submissions.', 500);
  }
});

// ── GET /api/admin/kyc/submissions/:id ──
router.get('/kyc/submissions/:id', (req, res) => {
  try {
    const submission = db.prepare(`
      SELECT 
        ks.*,
        u.username,
        u.email,
        kset.title as form_title,
        kset.fields as form_schema,
        rev.username as reviewer_username
      FROM kyc_submissions ks
      JOIN users u ON ks.user_id = u.id
      JOIN kyc_settings kset ON ks.kyc_setting_id = kset.id
      LEFT JOIN users rev ON ks.reviewed_by = rev.id
      WHERE ks.id = ?
    `).get(req.params.id);

    if (!submission) return errorResponse(res, 'KYC submission not found.', 404);

    let formData = {};
    let formSchema = [];
    try { formData = JSON.parse(submission.form_data); } catch (e) { formData = {}; }
    try { formSchema = JSON.parse(submission.form_schema); } catch (e) { formSchema = []; }

    return successResponse(res, {
      submission: {
        ...submission,
        form_data: formData,
        form_schema: formSchema
      }
    }, 'KYC submission details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch KYC submission.', 500);
  }
});

// ── POST /api/admin/kyc/submissions/:id/approve ──
router.post('/kyc/submissions/:id/approve', (req, res) => {
  try {
    const submission = db.prepare('SELECT * FROM kyc_submissions WHERE id = ?').get(req.params.id);
    if (!submission) return errorResponse(res, 'KYC submission not found.', 404);

    const approveTx = db.transaction(() => {
      db.prepare(`
        UPDATE kyc_submissions
        SET status = 'approved', rejection_reason = '', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.id, submission.id);

      // Verify user's email or identity verification flag
      db.prepare('UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(submission.user_id);
    });

    approveTx();

    logAdminActivity(req.user.id, 'kyc_submission_approved', { submissionId: submission.id, userId: submission.user_id }, req);

    return successResponse(res, {}, 'KYC verification approved successfully');
  } catch (error) {
    console.error('Approve KYC error:', error);
    return errorResponse(res, 'Failed to approve KYC verification.', 500);
  }
});

// ── POST /api/admin/kyc/submissions/:id/reject ──
router.post('/kyc/submissions/:id/reject', [
  body('rejection_reason').trim().notEmpty().withMessage('Rejection reason is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const submission = db.prepare('SELECT * FROM kyc_submissions WHERE id = ?').get(req.params.id);
    if (!submission) return errorResponse(res, 'KYC submission not found.', 404);

    const { rejection_reason } = req.body;

    db.prepare(`
      UPDATE kyc_submissions
      SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(rejection_reason, req.user.id, submission.id);

    logAdminActivity(req.user.id, 'kyc_submission_rejected', { submissionId: submission.id, userId: submission.user_id, rejection_reason }, req);

    return successResponse(res, {}, 'KYC verification rejected with feedback');
  } catch (error) {
    console.error('Reject KYC error:', error);
    return errorResponse(res, 'Failed to reject KYC verification.', 500);
  }
});

// ─────────────────────────────────────────────────────────────
// 3. CMS CONTENT SECTIONS ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────

// ── GET /api/admin/cms/sections ──
router.get('/cms/sections', (req, res) => {
  try {
    const sections = db.prepare('SELECT * FROM cms_content ORDER BY section_name ASC').all();
    const parsed = sections.map(s => {
      let content = {};
      try { content = JSON.parse(s.content_json); } catch (e) { content = {}; }
      return { ...s, content };
    });

    return successResponse(res, { sections: parsed }, 'CMS content sections retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve CMS content sections.', 500);
  }
});

// ── GET /api/admin/cms/sections/:section ──
router.get('/cms/sections/:section', (req, res) => {
  try {
    const section = db.prepare('SELECT * FROM cms_content WHERE section_name = ?').get(req.params.section);
    if (!section) return errorResponse(res, 'CMS section not found.', 404);

    let content = {};
    try { content = JSON.parse(section.content_json); } catch (e) { content = {}; }

    return successResponse(res, { section: section.section_name, content, updated_at: section.updated_at }, 'Section retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch section.', 500);
  }
});

// ── PUT /api/admin/cms/sections/:section ──
router.put('/cms/sections/:section', [
  body('content').notEmpty().withMessage('Section content is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const { content } = req.body;
    const jsonContent = typeof content === 'string' ? content : JSON.stringify(content);

    const existing = db.prepare('SELECT id FROM cms_content WHERE section_name = ?').get(req.params.section);
    if (existing) {
      db.prepare(`
        UPDATE cms_content
        SET content_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE section_name = ?
      `).run(jsonContent, req.params.section);
    } else {
      db.prepare(`
        INSERT INTO cms_content (section_name, content_json)
        VALUES (?, ?)
      `).run(req.params.section, jsonContent);
    }

    logAdminActivity(req.user.id, 'cms_section_updated', { section: req.params.section }, req);

    return successResponse(res, {}, 'CMS section updated successfully');
  } catch (error) {
    console.error('Update CMS section error:', error);
    return errorResponse(res, 'Failed to update CMS section.', 500);
  }
});

// ─────────────────────────────────────────────────────────────
// 4. CUSTOM PAGES ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────

// ── GET /api/admin/pages ──
router.get('/pages', (req, res) => {
  try {
    const { search = '', status = 'all' } = req.query;
    let where = [];
    let params = [];

    if (status && status !== 'all') {
      where.push('status = ?');
      params.push(status);
    }

    if (search) {
      where.push('(name LIKE ? OR title LIKE ? OR slug LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const pages = db.prepare(`SELECT * FROM pages ${whereClause} ORDER BY id ASC`).all(...params);

    return successResponse(res, { pages }, 'Pages retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve pages.', 500);
  }
});

// ── GET /api/admin/pages/:id ──
router.get('/pages/:id', (req, res) => {
  try {
    const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
    if (!page) return errorResponse(res, 'Page not found.', 404);
    return successResponse(res, { page }, 'Page retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch page.', 500);
  }
});

// ── POST /api/admin/pages ──
router.post('/pages', [
  body('name').trim().notEmpty().withMessage('Page name is required'),
  body('slug').trim().notEmpty().withMessage('Page slug is required'),
  body('title').trim().notEmpty().withMessage('Page title is required'),
  body('content').notEmpty().withMessage('Page content is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const { name, slug, title, content, meta_title = '', meta_description = '', meta_keywords = '', status = 'active' } = req.body;
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = db.prepare('SELECT id FROM pages WHERE slug = ?').get(cleanSlug);
    if (existing) return errorResponse(res, 'A page with this slug already exists.', 409);

    const result = db.prepare(`
      INSERT INTO pages (name, slug, title, content, meta_title, meta_description, meta_keywords, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, cleanSlug, title, content, meta_title, meta_description, meta_keywords, status);

    logAdminActivity(req.user.id, 'page_created', { id: result.lastInsertRowid, slug: cleanSlug }, req);

    return successResponse(res, { id: result.lastInsertRowid }, 'Page created successfully', 201);
  } catch (error) {
    console.error('Create page error:', error);
    return errorResponse(res, 'Failed to create page.', 500);
  }
});

// ── PUT /api/admin/pages/:id ──
router.put('/pages/:id', [
  body('name').trim().notEmpty().withMessage('Page name is required'),
  body('title').trim().notEmpty().withMessage('Page title is required'),
  body('content').notEmpty().withMessage('Page content is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
    if (!page) return errorResponse(res, 'Page not found.', 404);

    const { name, slug, title, content, meta_title, meta_description, meta_keywords, status } = req.body;
    const cleanSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '') : page.slug;

    if (cleanSlug !== page.slug) {
      const existing = db.prepare('SELECT id FROM pages WHERE slug = ? AND id != ?').get(cleanSlug, page.id);
      if (existing) return errorResponse(res, 'A page with this slug already exists.', 409);
    }

    db.prepare(`
      UPDATE pages
      SET name = ?, slug = ?, title = ?, content = ?, meta_title = ?, meta_description = ?, meta_keywords = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      cleanSlug,
      title,
      content,
      meta_title !== undefined ? meta_title : page.meta_title,
      meta_description !== undefined ? meta_description : page.meta_description,
      meta_keywords !== undefined ? meta_keywords : page.meta_keywords,
      status || page.status,
      page.id
    );

    logAdminActivity(req.user.id, 'page_updated', { id: page.id, slug: cleanSlug }, req);

    return successResponse(res, {}, 'Page updated successfully');
  } catch (error) {
    console.error('Update page error:', error);
    return errorResponse(res, 'Failed to update page.', 500);
  }
});

// ── DELETE /api/admin/pages/:id ──
router.delete('/pages/:id', (req, res) => {
  try {
    const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
    if (!page) return errorResponse(res, 'Page not found.', 404);

    db.prepare('DELETE FROM pages WHERE id = ?').run(page.id);
    logAdminActivity(req.user.id, 'page_deleted', { id: page.id, slug: page.slug }, req);

    return successResponse(res, {}, 'Page deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete page.', 500);
  }
});

// ─────────────────────────────────────────────────────────────
// 5. NAVIGATION MENUS ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────

// ── GET /api/admin/menus ──
router.get('/menus', (req, res) => {
  try {
    const { location } = req.query;
    let query = 'SELECT * FROM menus';
    let params = [];

    if (location && (location === 'header' || location === 'footer')) {
      query += ' WHERE location = ?';
      params.push(location);
    }

    query += ' ORDER BY location ASC, sort_order ASC';
    const items = db.prepare(query).all(...params);

    return successResponse(res, { menus: items }, 'Menus retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve menus.', 500);
  }
});

// ── POST /api/admin/menus ──
router.post('/menus', [
  body('location').isIn(['header', 'footer']).withMessage('Location must be header or footer'),
  body('title').trim().notEmpty().withMessage('Menu title is required'),
  body('url').trim().notEmpty().withMessage('Menu URL is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const { location, title, url, sort_order = 0, target = '_self', status = 'active' } = req.body;

    const result = db.prepare(`
      INSERT INTO menus (location, title, url, sort_order, target, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(location, title, url, parseInt(sort_order) || 0, target, status);

    logAdminActivity(req.user.id, 'menu_created', { id: result.lastInsertRowid, title, location }, req);

    return successResponse(res, { id: result.lastInsertRowid }, 'Menu item created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create menu item.', 500);
  }
});

// ── PUT /api/admin/menus/:id ──
router.put('/menus/:id', [
  body('title').trim().notEmpty().withMessage('Menu title is required'),
  body('url').trim().notEmpty().withMessage('Menu URL is required')
], (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM menus WHERE id = ?').get(req.params.id);
    if (!item) return errorResponse(res, 'Menu item not found.', 404);

    const { location, title, url, sort_order, target, status } = req.body;

    db.prepare(`
      UPDATE menus
      SET location = ?, title = ?, url = ?, sort_order = ?, target = ?, status = ?
      WHERE id = ?
    `).run(
      location || item.location,
      title,
      url,
      sort_order !== undefined ? parseInt(sort_order) : item.sort_order,
      target || item.target,
      status || item.status,
      item.id
    );

    logAdminActivity(req.user.id, 'menu_updated', { id: item.id, title }, req);

    return successResponse(res, {}, 'Menu item updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update menu item.', 500);
  }
});

// ── DELETE /api/admin/menus/:id ──
router.delete('/menus/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM menus WHERE id = ?').get(req.params.id);
    if (!item) return errorResponse(res, 'Menu item not found.', 404);

    db.prepare('DELETE FROM menus WHERE id = ?').run(item.id);
    logAdminActivity(req.user.id, 'menu_deleted', { id: item.id, title: item.title }, req);

    return successResponse(res, {}, 'Menu item deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete menu item.', 500);
  }
});

// ─────────────────────────────────────────────────────────────
// 6. BLOG CATEGORIES & BLOGS ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────

// ── GET /api/admin/blog-categories ──
router.get('/blog-categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT bc.*, COUNT(b.id) as blog_count
      FROM blog_categories bc
      LEFT JOIN blogs b ON bc.id = b.category_id
      GROUP BY bc.id
      ORDER BY bc.name ASC
    `).all();

    return successResponse(res, { categories }, 'Blog categories retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve blog categories.', 500);
  }
});

// ── POST /api/admin/blog-categories ──
router.post('/blog-categories', [
  body('name').trim().notEmpty().withMessage('Category name is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const { name, slug, status = 'active' } = req.body;
    const catSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '') : name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = db.prepare('SELECT id FROM blog_categories WHERE slug = ?').get(catSlug);
    if (existing) return errorResponse(res, 'Category with this slug already exists.', 409);

    const result = db.prepare(`
      INSERT INTO blog_categories (name, slug, status)
      VALUES (?, ?, ?)
    `).run(name, catSlug, status);

    logAdminActivity(req.user.id, 'blog_category_created', { id: result.lastInsertRowid, name }, req);

    return successResponse(res, { id: result.lastInsertRowid }, 'Category created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create category.', 500);
  }
});

// ── PUT /api/admin/blog-categories/:id ──
router.put('/blog-categories/:id', [
  body('name').trim().notEmpty().withMessage('Category name is required')
], (req, res) => {
  try {
    const cat = db.prepare('SELECT * FROM blog_categories WHERE id = ?').get(req.params.id);
    if (!cat) return errorResponse(res, 'Category not found.', 404);

    const { name, slug, status } = req.body;
    const catSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '') : cat.slug;

    if (catSlug !== cat.slug) {
      const existing = db.prepare('SELECT id FROM blog_categories WHERE slug = ? AND id != ?').get(catSlug, cat.id);
      if (existing) return errorResponse(res, 'Category with this slug already exists.', 409);
    }

    db.prepare(`
      UPDATE blog_categories
      SET name = ?, slug = ?, status = ?
      WHERE id = ?
    `).run(name, catSlug, status || cat.status, cat.id);

    logAdminActivity(req.user.id, 'blog_category_updated', { id: cat.id, name }, req);

    return successResponse(res, {}, 'Category updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update category.', 500);
  }
});

// ── DELETE /api/admin/blog-categories/:id ──
router.delete('/blog-categories/:id', (req, res) => {
  try {
    const cat = db.prepare('SELECT * FROM blog_categories WHERE id = ?').get(req.params.id);
    if (!cat) return errorResponse(res, 'Category not found.', 404);

    db.prepare('DELETE FROM blog_categories WHERE id = ?').run(cat.id);
    logAdminActivity(req.user.id, 'blog_category_deleted', { id: cat.id, name: cat.name }, req);

    return successResponse(res, {}, 'Category deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete category.', 500);
  }
});

// ── GET /api/admin/blogs ──
router.get('/blogs', (req, res) => {
  try {
    const { search = '', category_id, status = 'all', page = 1, limit = 20 } = req.query;
    let where = [];
    let params = [];

    if (status && status !== 'all') {
      where.push('b.status = ?');
      params.push(status);
    }

    if (category_id) {
      where.push('b.category_id = ?');
      params.push(category_id);
    }

    if (search) {
      where.push('(b.title LIKE ? OR b.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM blogs b
      ${whereClause}
    `).get(...params);

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const blogs = db.prepare(`
      SELECT 
        b.*,
        bc.name as category_name,
        ba.name as author_name
      FROM blogs b
      JOIN blog_categories bc ON b.category_id = bc.id
      LEFT JOIN blog_authors ba ON b.author_id = ba.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    return successResponse(res, {
      blogs,
      pagination: paginationMeta(countRow.total, parseInt(page), parseInt(limit))
    }, 'Blogs retrieved');
  } catch (error) {
    console.error('Admin get blogs error:', error);
    return errorResponse(res, 'Failed to retrieve blogs.', 500);
  }
});

// ── GET /api/admin/blogs/:id ──
router.get('/blogs/:id', (req, res) => {
  try {
    const blog = db.prepare('SELECT * FROM blogs WHERE id = ?').get(req.params.id);
    if (!blog) return errorResponse(res, 'Blog post not found.', 404);
    return successResponse(res, { blog }, 'Blog details retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch blog post.', 500);
  }
});

// ── POST /api/admin/blogs ──
router.post('/blogs', [
  body('category_id').isInt().withMessage('Valid category is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description/content is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const { category_id, author_id = null, title, slug, description, image = null, status = 'active' } = req.body;
    const blogSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '') : title.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = db.prepare('SELECT id FROM blogs WHERE slug = ?').get(blogSlug);
    if (existing) return errorResponse(res, 'A blog with this slug already exists.', 409);

    const result = db.prepare(`
      INSERT INTO blogs (category_id, author_id, title, slug, description, image, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(category_id, author_id, title, blogSlug, description, image, status);

    logAdminActivity(req.user.id, 'blog_created', { id: result.lastInsertRowid, title, slug: blogSlug }, req);

    return successResponse(res, { id: result.lastInsertRowid }, 'Blog post created', 201);
  } catch (error) {
    console.error('Create blog error:', error);
    return errorResponse(res, 'Failed to create blog post.', 500);
  }
});

// ── PUT /api/admin/blogs/:id ──
router.put('/blogs/:id', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const blog = db.prepare('SELECT * FROM blogs WHERE id = ?').get(req.params.id);
    if (!blog) return errorResponse(res, 'Blog post not found.', 404);

    const { category_id, author_id, title, slug, description, image, status } = req.body;
    const blogSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '') : blog.slug;

    if (blogSlug !== blog.slug) {
      const existing = db.prepare('SELECT id FROM blogs WHERE slug = ? AND id != ?').get(blogSlug, blog.id);
      if (existing) return errorResponse(res, 'A blog with this slug already exists.', 409);
    }

    db.prepare(`
      UPDATE blogs
      SET 
        category_id = ?,
        author_id = ?,
        title = ?,
        slug = ?,
        description = ?,
        image = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      category_id || blog.category_id,
      author_id !== undefined ? author_id : blog.author_id,
      title,
      blogSlug,
      description,
      image !== undefined ? image : blog.image,
      status || blog.status,
      blog.id
    );

    logAdminActivity(req.user.id, 'blog_updated', { id: blog.id, title }, req);

    return successResponse(res, {}, 'Blog post updated');
  } catch (error) {
    console.error('Update blog error:', error);
    return errorResponse(res, 'Failed to update blog post.', 500);
  }
});

// ── DELETE /api/admin/blogs/:id ──
router.delete('/blogs/:id', (req, res) => {
  try {
    const blog = db.prepare('SELECT * FROM blogs WHERE id = ?').get(req.params.id);
    if (!blog) return errorResponse(res, 'Blog post not found.', 404);

    db.prepare('DELETE FROM blogs WHERE id = ?').run(blog.id);
    logAdminActivity(req.user.id, 'blog_deleted', { id: blog.id, title: blog.title }, req);

    return successResponse(res, {}, 'Blog post deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete blog post.', 500);
  }
});

// ─────────────────────────────────────────────────────────────
// 7. SUBSCRIBERS ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────

// ── GET /api/admin/subscribers ──
router.get('/subscribers', (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    let where = [];
    let params = [];

    if (search) {
      where.push('email LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM subscribers ${whereClause}`).get(...params);
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const subscribers = db.prepare(`
      SELECT * FROM subscribers
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    return successResponse(res, {
      subscribers,
      pagination: paginationMeta(countRow.total, parseInt(page), parseInt(limit))
    }, 'Subscribers retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve subscribers.', 500);
  }
});

// ── DELETE /api/admin/subscribers/:id ──
router.delete('/subscribers/:id', (req, res) => {
  try {
    const sub = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(req.params.id);
    if (!sub) return errorResponse(res, 'Subscriber not found.', 404);

    db.prepare('DELETE FROM subscribers WHERE id = ?').run(sub.id);
    logAdminActivity(req.user.id, 'subscriber_deleted', { id: sub.id, email: sub.email }, req);

    return successResponse(res, {}, 'Subscriber deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete subscriber.', 500);
  }
});

// ─────────────────────────────────────────────────────────────
// 8. SYSTEM BACKUP & MAINTENANCE MODE
// ─────────────────────────────────────────────────────────────

// ── GET /api/admin/system/backup ──
router.get('/system/backup', (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const dbPath = path.join(__dirname, '..', 'db', 'smm_uper.db');

    if (!fs.existsSync(dbPath)) {
      return errorResponse(res, 'Database file not found.', 404);
    }

    // Force checkpoint to flush WAL into main database file before download
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {
      console.warn('Checkpoint warning:', e.message);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `smmuper_backup_${timestamp}.db`;

    logAdminActivity(req.user.id, 'system_backup_downloaded', { filename }, req);

    res.download(dbPath, filename);
  } catch (error) {
    console.error('Backup error:', error);
    return errorResponse(res, 'Failed to create system backup.', 500);
  }
});

// ── GET /api/admin/system/maintenance ──
router.get('/system/maintenance', (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'maintenance_mode'").get();
    return successResponse(res, {
      maintenance_mode: row ? row.value === '1' : false
    }, 'Maintenance mode status retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve maintenance mode status.', 500);
  }
});

// ── PUT /api/admin/system/maintenance ──
router.put('/system/maintenance', [
  body('enabled').isBoolean().withMessage('Enabled boolean is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, errors.array()[0].msg, 400);

    const { enabled } = req.body;
    const val = enabled ? '1' : '0';

    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('maintenance_mode', ?)").run(val);

    logAdminActivity(req.user.id, 'maintenance_mode_toggled', { enabled }, req);

    return successResponse(res, { maintenance_mode: enabled }, `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    return errorResponse(res, 'Failed to update maintenance mode.', 500);
  }
});

module.exports = router;
