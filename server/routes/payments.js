const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse, generateTransactionId, paginate, paginationMeta } = require('../utils/helpers');

// All payment routes require customer authentication
router.use(authenticate);

// ──────────────── GET /api/payments/methods ────────────────
// List active payment methods available for deposit
router.get('/methods', (req, res) => {
  try {
    const methods = db.prepare(`
      SELECT id, name, code, type, icon, currency, min_amount, max_amount,
             percentage_charge, fixed_charge, exchange_rate, instructions, parameters, status, sort_order
      FROM payment_methods
      WHERE status IN ('active', '1', 1)
      ORDER BY sort_order ASC, id ASC
    `).all();

    const formatted = methods.map(m => {
      let params = {};
      try {
        params = typeof m.parameters === 'string' ? JSON.parse(m.parameters || '{}') : (m.parameters || {});
      } catch (e) {
        params = {};
      }
      return {
        ...m,
        parameters: params,
        min_amount: parseFloat(m.min_amount) || 0,
        max_amount: parseFloat(m.max_amount) || 0,
        percentage_charge: parseFloat(m.percentage_charge) || 0,
        fixed_charge: parseFloat(m.fixed_charge) || 0,
        exchange_rate: parseFloat(m.exchange_rate) || 1
      };
    });

    return successResponse(res, { methods: formatted }, 'Payment methods retrieved successfully');
  } catch (error) {
    console.error('Get payment methods error:', error);
    return errorResponse(res, 'Failed to retrieve payment methods', 500);
  }
});

// ──────────────── POST /api/payments/deposit ────────────────
// Customer deposit initiation (Supports Automatic Instant & Manual Review)
router.post('/deposit', [
  body('amount')
    .isFloat({ min: 0.10 }).withMessage('Amount must be at least $0.10'),
  body('method_id')
    .optional().isInt().withMessage('Method ID must be an integer'),
  body('method_code')
    .optional().trim(),
  body('transaction_id')
    .optional().trim(),
  body('payer_details')
    .optional(),
  body('payment_proof')
    .optional().trim(),
  body('notes')
    .optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { amount, method_id, method_code, payment_proof, notes } = req.body;
    let payerDetails = req.body.payer_details;
    if (typeof payerDetails === 'object' && payerDetails !== null) {
      payerDetails = JSON.stringify(payerDetails);
    } else if (!payerDetails) {
      payerDetails = '{}';
    }

    // Lookup payment gateway
    let method = null;
    if (method_id) {
      method = db.prepare("SELECT * FROM payment_methods WHERE id = ? AND status IN ('active', '1', 1)").get(method_id);
    } else if (method_code) {
      method = db.prepare("SELECT * FROM payment_methods WHERE (code = ? OR code LIKE ? OR code = ?) AND status IN ('active', '1', 1)").get(
        method_code,
        method_code + '_%',
        method_code.replace('_manual', '').replace('_card', '')
      );
    }

    if (!method) {
      return errorResponse(res, 'Selected payment gateway is unavailable or inactive.', 404);
    }

    const depositAmount = parseFloat(amount);
    const minLimit = parseFloat(method.min_amount) || 0;
    const maxLimit = parseFloat(method.max_amount) || 0;

    if (minLimit > 0 && depositAmount < minLimit) {
      return errorResponse(res, `Minimum deposit amount for ${method.name} is $${minLimit.toFixed(2)}.`, 400);
    }
    if (maxLimit > 0 && depositAmount > maxLimit) {
      return errorResponse(res, `Maximum deposit amount for ${method.name} is $${maxLimit.toFixed(2)}.`, 400);
    }

    // Calculate fee & local currency total
    const percentFee = parseFloat(method.percentage_charge) || 0;
    const fixedFee = parseFloat(method.fixed_charge) || 0;
    const calculatedFee = Math.round((fixedFee + (depositAmount * percentFee / 100)) * 10000) / 10000;
    const rate = parseFloat(method.exchange_rate) || 1.0;
    const totalLocalAmount = Math.round(((depositAmount + calculatedFee) * rate) * 100) / 100;

    // Transaction ID handling & duplicate guard
    let txnId = (req.body.transaction_id && req.body.transaction_id.trim()) 
      ? req.body.transaction_id.trim() 
      : null;

    if (txnId) {
      const existingTxn = db.prepare('SELECT id, status FROM payments WHERE transaction_id = ?').get(txnId);
      if (existingTxn) {
        return errorResponse(res, `Transaction ID '${txnId}' has already been submitted or processed. Duplicate submissions are not allowed.`, 409);
      }
    } else {
      txnId = generateTransactionId();
    }

    // Is it manual gateway or automatic?
    const isManual = method.type === 'manual';

    if (isManual) {
      // Manual Gateway -> Status 'pending', awaiting admin verification
      const insertPayment = db.prepare(`
        INSERT INTO payments (
          user_id, payment_method_id, amount, method, transaction_id,
          currency, local_amount, charge, rate, payment_proof,
          payer_details, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
      `).run(
        req.user.id,
        method.id,
        depositAmount,
        method.code,
        txnId,
        method.currency || 'USD',
        totalLocalAmount,
        calculatedFee,
        rate,
        payment_proof || null,
        payerDetails,
        notes || `Deposit request via ${method.name}`
      );

      const createdPayment = db.prepare(`
        SELECT p.*, pm.name as gateway_name
        FROM payments p
        LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
        WHERE p.id = ?
      `).get(insertPayment.lastInsertRowid);

      return successResponse(res, {
        payment: createdPayment,
        is_manual: true,
        receipt_id: `RCP-${String(createdPayment.id).padStart(6, '0')}`,
        status: 'pending'
      }, 'Deposit request submitted successfully. It will be reviewed and credited by administration shortly.', 201);

    } else {
      // Automatic Gateway -> Instant verified deposit simulation
      let newBalance = 0;
      let paymentId = 0;

      const autoDepositTx = db.transaction(() => {
        // 1. Insert completed payment record
        const pRes = db.prepare(`
          INSERT INTO payments (
            user_id, payment_method_id, amount, method, transaction_id,
            currency, local_amount, charge, rate, payment_proof,
            payer_details, notes, status, created_at, reviewed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          req.user.id,
          method.id,
          depositAmount,
          method.code,
          txnId,
          method.currency || 'USD',
          totalLocalAmount,
          calculatedFee,
          rate,
          payment_proof || null,
          payerDetails,
          notes || `Instant deposit via ${method.name}`
        );
        paymentId = pRes.lastInsertRowid;

        // 2. Fetch current user balance
        const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
        const oldBalance = user.balance || 0;
        newBalance = Math.round((oldBalance + depositAmount) * 10000) / 10000;

        // 3. Update user balance atomically
        db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newBalance, req.user.id);

        // 4. Record into immutable financial ledger
        db.prepare(`
          INSERT INTO financial_ledger (
            user_id, transaction_type, amount, balance_before, balance_after,
            currency, reference_id, reference_type, description, created_at
          ) VALUES (?, 'deposit', ?, ?, ?, 'USD', ?, 'deposit', ?, CURRENT_TIMESTAMP)
        `).run(
          req.user.id,
          depositAmount,
          oldBalance,
          newBalance,
          txnId,
          `Instant deposit credited via ${method.name} (TrxID: ${txnId})`
        );
      });

      autoDepositTx();

      const createdPayment = db.prepare(`
        SELECT p.*, pm.name as gateway_name
        FROM payments p
        LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
        WHERE p.id = ?
      `).get(paymentId);

      return successResponse(res, {
        payment: createdPayment,
        is_manual: false,
        new_balance: newBalance,
        receipt_id: `RCP-${String(createdPayment.id).padStart(6, '0')}`,
        status: 'completed'
      }, `Funds of $${depositAmount.toFixed(2)} added to your wallet successfully!`, 201);
    }

  } catch (error) {
    console.error('Deposit processing error:', error);
    return errorResponse(res, error.message || 'Deposit processing failed.', 500);
  }
});

// ──────────────── POST /api/payments/add-funds ────────────────
// Backwards compatible endpoint forwarding to deposit logic
router.post('/add-funds', [
  body('amount').isFloat({ min: 0.10, max: 100000 }).withMessage('Amount must be between $0.10 and $100,000'),
  body('method').optional().trim(),
  body('method_id').optional().isInt(),
  body('transaction_id').optional().trim()
], (req, res, next) => {
  // Map 'method' string into 'method_code' if provided
  if (req.body.method && !req.body.method_code) {
    req.body.method_code = req.body.method;
  }
  // Call internal deposit handler
  const { amount, method, method_id, method_code } = req.body;
  let targetMethod = null;
  if (method_id) {
    targetMethod = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(method_id);
  } else if (method_code || method) {
    targetMethod = db.prepare('SELECT * FROM payment_methods WHERE code = ?').get(method_code || method);
  }

  // If no specific payment_method entry matched, fallback to instant credit for testing
  if (!targetMethod) {
    try {
      const depositAmount = parseFloat(amount);
      const txnId = (req.body.transaction_id && req.body.transaction_id.trim()) 
        ? req.body.transaction_id.trim() 
        : generateTransactionId();

      let newBalance = 0;
      let paymentId = 0;

      const fallbackTx = db.transaction(() => {
        const pRes = db.prepare(`
          INSERT INTO payments (user_id, amount, method, transaction_id, status, created_at)
          VALUES (?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
        `).run(req.user.id, depositAmount, method || 'card', txnId);
        paymentId = pRes.lastInsertRowid;

        const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
        newBalance = Math.round(((user.balance || 0) + depositAmount) * 10000) / 10000;

        db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newBalance, req.user.id);

        db.prepare(`
          INSERT INTO financial_ledger (
            user_id, transaction_type, amount, balance_before, balance_after,
            currency, reference_id, reference_type, description, created_at
          ) VALUES (?, 'deposit', ?, ?, ?, 'USD', ?, 'deposit', ?, CURRENT_TIMESTAMP)
        `).run(
          req.user.id,
          depositAmount,
          user.balance || 0,
          newBalance,
          txnId,
          `Wallet topup via ${method || 'card'} (TrxID: ${txnId})`
        );
      });

      fallbackTx();

      const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
      return successResponse(res, {
        payment,
        new_balance: newBalance
      }, 'Funds added successfully', 201);
    } catch (e) {
      console.error('Fallback add-funds error:', e);
      return errorResponse(res, 'Failed to add funds', 500);
    }
  }

  // If method exists, proceed to deposit endpoint
  req.body.method_id = targetMethod.id;
  router.handle(req, res, next);
});

// ──────────────── GET /api/payments/history ────────────────
// Customer's personal deposit history with filters & pagination
router.get('/history', [
  query('status').optional().isIn(['pending', 'completed', 'failed', 'refunded', 'rejected']),
  query('method').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { status, method } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    let where = ['p.user_id = ?'];
    let params = [req.user.id];

    if (status) {
      where.push('p.status = ?');
      params.push(status);
    }
    if (method) {
      where.push('(p.method = ? OR pm.code = ?)');
      params.push(method, method);
    }

    const whereClause = 'WHERE ' + where.join(' AND ');

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM payments p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      ${whereClause}
    `).get(...params);

    const payments = db.prepare(`
      SELECT p.*, pm.name as gateway_name, pm.icon as gateway_icon, pm.type as gateway_type
      FROM payments p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      ${whereClause}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return successResponse(res, {
      payments,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Payment history retrieved successfully');

  } catch (error) {
    console.error('Payment history error:', error);
    return errorResponse(res, 'Failed to retrieve payment history.', 500);
  }
});

// ──────────────── GET /api/payments/transactions ────────────────
// Customer's personal immutable financial ledger
router.get('/transactions', [
  query('type').optional().trim(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], (req, res) => {
  try {
    const { type, search } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    let where = ['user_id = ?'];
    let params = [req.user.id];

    if (type && type !== 'all') {
      where.push('transaction_type = ?');
      params.push(type);
    }

    if (search) {
      where.push('(reference_id LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = 'WHERE ' + where.join(' AND ');

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM financial_ledger ${whereClause}`).get(...params);

    const transactions = db.prepare(`
      SELECT id, transaction_type, amount, balance_before, balance_after, currency, reference_id, reference_type, description, created_at
      FROM financial_ledger
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // Summary of total credited and total debited for this customer
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type IN ('deposit', 'order_refund', 'order_partial_refund', 'manual_credit', 'referral_commission') THEN amount ELSE 0 END), 0) as total_credited,
        COALESCE(SUM(CASE WHEN transaction_type IN ('order_charge', 'manual_debit') THEN amount ELSE 0 END), 0) as total_debited
      FROM financial_ledger
      WHERE user_id = ?
    `).get(req.user.id);

    return successResponse(res, {
      transactions,
      summary,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Transactions ledger retrieved successfully');

  } catch (error) {
    console.error('Get transactions error:', error);
    return errorResponse(res, 'Failed to retrieve transactions', 500);
  }
});

// ──────────────── GET /api/payments/:id/receipt ────────────────
// Payment Receipt generator
router.get('/:id/receipt', (req, res) => {
  try {
    const payment = db.prepare(`
      SELECT p.*, pm.name as gateway_name, pm.type as gateway_type, pm.instructions,
             u.username, u.email
      FROM payments p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND (p.user_id = ? OR u.role IN ('admin', 'staff'))
    `).get(req.params.id, req.user.id);

    if (!payment) {
      return errorResponse(res, 'Receipt not found.', 404);
    }

    let parsedPayer = {};
    try {
      parsedPayer = typeof payment.payer_details === 'string' ? JSON.parse(payment.payer_details || '{}') : (payment.payer_details || {});
    } catch (e) {
      parsedPayer = { raw: payment.payer_details };
    }

    const receipt = {
      receipt_number: `RCP-${String(payment.id).padStart(6, '0')}`,
      transaction_id: payment.transaction_id,
      date: payment.created_at,
      user: {
        username: payment.username,
        email: payment.email
      },
      gateway: {
        name: payment.gateway_name || payment.method,
        type: payment.gateway_type || 'automatic',
        currency: payment.currency || 'USD'
      },
      financials: {
        amount: parseFloat(payment.amount) || 0,
        charge: parseFloat(payment.charge) || 0,
        rate: parseFloat(payment.rate) || 1,
        local_amount: parseFloat(payment.local_amount) || parseFloat(payment.amount) || 0,
        net_credited: payment.status === 'completed' ? parseFloat(payment.amount) : 0
      },
      status: payment.status,
      payer_details: parsedPayer,
      payment_proof: payment.payment_proof,
      admin_feedback: payment.admin_feedback,
      notes: payment.notes
    };

    return successResponse(res, { receipt }, 'Receipt generated successfully');

  } catch (error) {
    console.error('Get receipt error:', error);
    return errorResponse(res, 'Failed to generate receipt', 500);
  }
});

// ──────────────── GET /api/payments/balance ────────────────
router.get('/balance', (req, res) => {
  try {
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);

    const totalDeposited = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments WHERE user_id = ? AND status = 'completed'
    `).get(req.user.id);

    const totalSpent = db.prepare(`
      SELECT COALESCE(SUM(charge), 0) as total
      FROM orders WHERE user_id = ? AND status NOT IN ('cancelled', 'failed')
    `).get(req.user.id);

    return successResponse(res, {
      balance: user.balance,
      total_deposited: totalDeposited.total,
      total_spent: totalSpent.total
    }, 'Balance retrieved');

  } catch (error) {
    console.error('Get balance error:', error);
    return errorResponse(res, 'Failed to retrieve balance.', 500);
  }
});

module.exports = router;
