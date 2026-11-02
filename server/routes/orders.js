const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse, calculateCharge, paginate, paginationMeta } = require('../utils/helpers');
const providerEngine = require('../services/providerEngine');

// In-memory customer order idempotency cache (5 seconds debounce for exact duplicate submissions)
const userOrderDebounce = new Map();

// All order routes require authentication
router.use(authenticate);

// ──────────────── POST /api/orders ────────────────
// Create a new single order
router.post('/', [
  body('service_id').isInt({ min: 1 }).withMessage('Valid service ID is required'),
  body('link').trim().notEmpty().withMessage('Link or Username is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('comments').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { service_id, link, quantity, comments } = req.body;

    // Idempotency protection against rapid double-clicks
    const debounceKey = `${req.user.id}:${service_id}:${link}:${quantity}`;
    const now = Date.now();
    if (userOrderDebounce.has(debounceKey) && (now - userOrderDebounce.get(debounceKey)) < 5000) {
      return errorResponse(res, 'Duplicate order detected. Please wait a few seconds before submitting again.', 429);
    }
    userOrderDebounce.set(debounceKey, now);

    // Find active service
    const service = db.prepare('SELECT * FROM services WHERE id = ? AND status = ?').get(service_id, 'active');
    if (!service) {
      return errorResponse(res, 'Service not found or inactive.', 404);
    }

    // Validate quantity bounds
    if (quantity < service.min_quantity) {
      return errorResponse(res, `Minimum quantity for this service is ${service.min_quantity}.`, 400);
    }
    if (quantity > service.max_quantity) {
      return errorResponse(res, `Maximum quantity for this service is ${service.max_quantity}.`, 400);
    }

    // Calculate charge & cost
    const charge = calculateCharge(service.rate, quantity);
    const cost = service.original_rate ? calculateCharge(service.original_rate, quantity) : 0.00;

    // Check user balance
    const user = db.prepare('SELECT id, username, balance, referred_by FROM users WHERE id = ?').get(req.user.id);
    if (user.balance < charge) {
      return errorResponse(res, `Insufficient balance. Required: $${charge.toFixed(2)}, Available: $${user.balance.toFixed(2)}. Please add funds.`, 400);
    }

    let orderId;
    let newBalance;

    // Execute atomic balance deduction & ledger transaction
    const placeOrderTx = db.transaction(() => {
      newBalance = Math.round((user.balance - charge) * 10000) / 10000;

      // Deduct balance
      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newBalance, req.user.id);

      // Insert order
      const result = db.prepare(`
        INSERT INTO orders (
          user_id, service_id, provider_id, link, quantity, charge, cost, status, remains
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(
        req.user.id,
        service.id,
        service.provider_id || null,
        link,
        quantity,
        charge,
        cost,
        quantity
      );

      orderId = result.lastInsertRowid;

      // Record in immutable financial ledger
      db.prepare(`
        INSERT INTO financial_ledger (
          user_id, transaction_type, amount, balance_before, balance_after, currency, reference_id, reference_type, description
        ) VALUES (?, 'order_charge', ?, ?, ?, 'USD', ?, 'order', ?)
      `).run(
        req.user.id,
        charge,
        user.balance,
        newBalance,
        String(orderId),
        `Placed order #${orderId} - ${service.name} (${quantity} units)`
      );

      // Referral Commission Hook
      if (user.referred_by) {
        const rateRow = db.prepare("SELECT value FROM system_settings WHERE key = 'referral_commission_rate'").get();
        const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'referral_system_enabled'").get();
        const isEnabled = enabledRow ? enabledRow.value === '1' : true;
        const commRate = rateRow ? parseFloat(rateRow.value) : 5.0;

        if (isEnabled && commRate > 0) {
          const commAmount = Math.round((charge * commRate / 100) * 10000) / 10000;
          if (commAmount > 0.0001) {
            const referrer = db.prepare('SELECT balance FROM users WHERE id = ?').get(user.referred_by);
            if (referrer) {
              const refNewBal = Math.round((referrer.balance + commAmount) * 10000) / 10000;
              db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(refNewBal, user.referred_by);

              db.prepare(`
                INSERT INTO referral_commissions (
                  referrer_id, referred_user_id, order_id, commission_amount, commission_rate, description, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'credited')
              `).run(
                user.referred_by,
                user.id,
                orderId,
                commAmount,
                commRate,
                `Commission from @${user.username} order #${orderId}`
              );

              db.prepare(`
                INSERT INTO financial_ledger (
                  user_id, transaction_type, amount, balance_before, balance_after,
                  currency, reference_id, reference_type, description, created_at
                ) VALUES (?, 'referral_commission', ?, ?, ?, 'USD', ?, 'referral', ?, CURRENT_TIMESTAMP)
              `).run(
                user.referred_by,
                commAmount,
                referrer.balance,
                refNewBal,
                String(orderId),
                `Referral commission from @${user.username} order #${orderId}`
              );
            }
          }
        }
      }
    });

    placeOrderTx();

    // If service is tied to an external wholesale provider, dispatch to provider API
    if (service.provider_id && service.provider_service_id) {
      const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(service.provider_id);
      if (provider && provider.status === 'active') {
        try {
          const providerSubmission = await providerEngine.submitOrder(provider, {
            service: service.provider_service_id,
            link,
            quantity,
            comments: comments || undefined
          });

          if (providerSubmission.success && providerSubmission.orderId) {
            db.prepare(`
              UPDATE orders SET
                provider_order_id = ?,
                status = 'processing',
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(providerSubmission.orderId, orderId);
          }
        } catch (providerErr) {
          console.warn(`Provider auto-dispatch failed for order #${orderId}: ${providerErr.message}`);
          db.prepare(`
            UPDATE orders SET error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
          `).run(`Wholesale provider dispatch queued/delayed: ${providerErr.message}`, orderId);
        }
      }
    }

    // Fetch created order with service & category info
    const order = db.prepare(`
      SELECT o.*, s.name as service_name, s.rate as service_rate, s.refill as service_refill, s.cancel as service_cancel,
             c.name as category_name
      FROM orders o
      LEFT JOIN services s ON o.service_id = s.id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE o.id = ?
    `).get(orderId);

    return successResponse(res, {
      order,
      new_balance: newBalance
    }, 'Order placed successfully', 201);

  } catch (error) {
    console.error('Create order error:', error);
    return errorResponse(res, 'Failed to create order.', 500);
  }
});

// ──────────────── POST /api/orders/mass ────────────────
// Create mass orders (bulk line-by-line format: service_id | link | quantity)
router.post('/mass', async (req, res) => {
  try {
    const rawOrdersText = req.body.orders || req.body.orders_data || '';
    if (!rawOrdersText.trim()) {
      return errorResponse(res, 'Mass order text is required.', 400);
    }
    const lines = rawOrdersText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length === 0) {
      return errorResponse(res, 'No order lines provided.', 400);
    }
    if (lines.length > 200) {
      return errorResponse(res, 'Maximum 200 orders allowed per mass order batch.', 400);
    }

    const parsedOrders = [];
    const failedLines = [];

    // Parse each line: format is "service_id | link | quantity" or "service_id | quantity | link"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/[|,\t]/).map(p => p.trim());

      if (parts.length < 3) {
        failedLines.push({ line_number: i + 1, line, error: 'Invalid format. Required: service_id | link | quantity' });
        continue;
      }

      const serviceId = parseInt(parts[0]);
      let link = parts[1];
      let quantity = parseInt(parts[2]);

      // If customer entered service_id | quantity | link
      if (!isNaN(parseInt(parts[1])) && isNaN(parseInt(parts[2]))) {
        quantity = parseInt(parts[1]);
        link = parts[2];
      }

      if (isNaN(serviceId) || serviceId <= 0) {
        failedLines.push({ line_number: i + 1, line, error: 'Invalid service ID.' });
        continue;
      }
      if (!link) {
        failedLines.push({ line_number: i + 1, line, error: 'Link or target is required.' });
        continue;
      }
      if (isNaN(quantity) || quantity <= 0) {
        failedLines.push({ line_number: i + 1, line, error: 'Quantity must be a positive integer.' });
        continue;
      }

      // Check service
      const service = db.prepare('SELECT * FROM services WHERE id = ? AND status = ?').get(serviceId, 'active');
      if (!service) {
        failedLines.push({ line_number: i + 1, line, error: `Service #${serviceId} not found or inactive.` });
        continue;
      }

      if (quantity < service.min_quantity) {
        failedLines.push({ line_number: i + 1, line, error: `Quantity ${quantity} is below service minimum of ${service.min_quantity}.` });
        continue;
      }
      if (quantity > service.max_quantity) {
        failedLines.push({ line_number: i + 1, line, error: `Quantity ${quantity} exceeds service maximum of ${service.max_quantity}.` });
        continue;
      }

      const charge = calculateCharge(service.rate, quantity);
      const cost = service.original_rate ? calculateCharge(service.original_rate, quantity) : 0.00;

      parsedOrders.push({
        lineNumber: i + 1,
        service,
        link,
        quantity,
        charge,
        cost
      });
    }

    if (parsedOrders.length === 0) {
      return errorResponse(res, 'None of the provided orders could be validated.', 400, { failed_lines: failedLines });
    }

    // Check user balance for all valid orders combined
    const totalRequired = parsedOrders.reduce((acc, o) => acc + o.charge, 0);
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);

    if (user.balance < totalRequired) {
      return errorResponse(
        res,
        `Insufficient balance for mass orders. Total required: $${totalRequired.toFixed(2)}, Available: $${user.balance.toFixed(2)}.`,
        400,
        {
          total_required: totalRequired,
          current_balance: user.balance,
          valid_orders_count: parsedOrders.length,
          failed_lines: failedLines
        }
      );
    }

    const createdOrders = [];
    let currentBalance = user.balance;

    // Execute atomic mass placement transaction
    const massTx = db.transaction(() => {
      for (const item of parsedOrders) {
        const balBefore = currentBalance;
        currentBalance = Math.round((currentBalance - item.charge) * 10000) / 10000;

        db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(currentBalance, req.user.id);

        const resOrder = db.prepare(`
          INSERT INTO orders (
            user_id, service_id, provider_id, link, quantity, charge, cost, status, remains
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `).run(
          req.user.id,
          item.service.id,
          item.service.provider_id || null,
          item.link,
          item.quantity,
          item.charge,
          item.cost,
          item.quantity
        );

        const orderId = resOrder.lastInsertRowid;

        db.prepare(`
          INSERT INTO financial_ledger (
            user_id, transaction_type, amount, balance_before, balance_after, currency, reference_id, reference_type, description
          ) VALUES (?, 'order_charge', ?, ?, ?, 'USD', ?, 'order', ?)
        `).run(
          req.user.id,
          item.charge,
          balBefore,
          currentBalance,
          String(orderId),
          `Mass order #${orderId} - ${item.service.name} (${item.quantity} units)`
        );

        createdOrders.push({
          order_id: orderId,
          service_id: item.service.id,
          service_name: item.service.name,
          link: item.link,
          quantity: item.quantity,
          charge: item.charge,
          provider_id: item.service.provider_id,
          provider_service_id: item.service.provider_service_id
        });
      }
    });

    massTx();

    // Async dispatch orders with providers
    for (const co of createdOrders) {
      if (co.provider_id && co.provider_service_id) {
        const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(co.provider_id);
        if (provider && provider.status === 'active') {
          providerEngine.submitOrder(provider, {
            service: co.provider_service_id,
            link: co.link,
            quantity: co.quantity
          }).then(res => {
            if (res.success && res.orderId) {
              db.prepare("UPDATE orders SET provider_order_id = ?, status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .run(res.orderId, co.order_id);
            }
          }).catch(err => {
            console.warn(`Mass order provider dispatch error for #${co.order_id}:`, err.message);
          });
        }
      }
    }

    return successResponse(res, {
      total_submitted: createdOrders.length,
      successful_count: createdOrders.length,
      results: {
        successful_count: createdOrders.length,
        failed_count: failedLines.length
      },
      total_charged: Math.round(totalRequired * 10000) / 10000,
      new_balance: currentBalance,
      orders: createdOrders,
      failed_lines: failedLines
    }, `Successfully placed ${createdOrders.length} mass orders.`, 201);

  } catch (error) {
    console.error('Mass order error:', error);
    return errorResponse(res, 'Failed to process mass orders.', 500);
  }
});

// ──────────────── POST /api/orders/:id/refill ────────────────
// Customer requests refill for eligible order
router.post('/:id/refill', [
  param('id').isInt().withMessage('Order ID must be an integer')
], async (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!order) return errorResponse(res, 'Order not found.', 404);

    const service = db.prepare('SELECT refill, name FROM services WHERE id = ?').get(order.service_id);
    if (!service || !service.refill) {
      return errorResponse(res, 'Refill is not supported for this service.', 400);
    }

    if (order.status !== 'completed' && order.status !== 'in_progress') {
      return errorResponse(res, `Cannot refill order with status '${order.status}'. Refill is available for completed or in progress orders.`, 400);
    }

    if (order.refill_status === 'requested' || order.refill_status === 'refilling') {
      return errorResponse(res, 'A refill request is already pending for this order.', 400);
    }

    let providerRefillId = null;

    if (order.provider_id && order.provider_order_id) {
      const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(order.provider_id);
      if (provider && provider.status === 'active') {
        try {
          const resProvider = await providerEngine.requestRefill(provider, order.provider_order_id);
          providerRefillId = resProvider?.refill ? String(resProvider.refill) : null;
        } catch (apiErr) {
          console.warn(`Remote refill error: ${apiErr.message}`);
        }
      }
    }

    db.prepare(`
      INSERT INTO order_refills (order_id, user_id, provider_id, provider_order_id, provider_refill_id, status, reason)
      VALUES (?, ?, ?, ?, ?, 'pending', 'Customer requested refill')
    `).run(order.id, req.user.id, order.provider_id, order.provider_order_id, providerRefillId);

    db.prepare(`
      UPDATE orders SET refill_status = 'requested', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(order.id);

    return successResponse(res, {
      order_id: order.id,
      refill_status: 'requested',
      provider_refill_id: providerRefillId
    }, 'Refill request submitted successfully');

  } catch (error) {
    console.error('Refill order error:', error);
    return errorResponse(res, 'Failed to submit refill request.', 500);
  }
});

// ──────────────── POST /api/orders/:id/cancel ────────────────
// Customer requests cancellation for eligible order
router.post('/:id/cancel', [
  param('id').isInt().withMessage('Order ID must be an integer')
], async (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!order) return errorResponse(res, 'Order not found.', 404);

    const service = db.prepare('SELECT cancel, name FROM services WHERE id = ?').get(order.service_id);
    if (!service || !service.cancel) {
      return errorResponse(res, 'Cancellation is not supported for this service.', 400);
    }

    if (order.status !== 'pending' && order.status !== 'processing') {
      return errorResponse(res, `Cannot cancel order with status '${order.status}'.`, 400);
    }

    if (order.cancel_status === 'requested' || order.status === 'cancelled') {
      return errorResponse(res, 'Cancellation request is already pending or processed.', 400);
    }

    // If order has provider, notify provider
    if (order.provider_id && order.provider_order_id) {
      const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(order.provider_id);
      if (provider && provider.status === 'active') {
        try {
          await providerEngine.requestCancel(provider, order.provider_order_id);
        } catch (apiErr) {
          console.warn(`Remote cancel request error: ${apiErr.message}`);
        }
      }
    }

    // If order is still pending and has no provider, cancel immediately and refund
    if (order.status === 'pending' && !order.provider_order_id) {
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
          `Order #${order.id} cancelled by customer - full refund of $${order.charge.toFixed(2)}`
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

      return successResponse(res, {
        order_id: order.id,
        status: 'cancelled',
        refunded: order.charge
      }, 'Order cancelled and funds refunded to your wallet.');
    }

    // Otherwise mark cancel_status = 'requested'
    db.prepare(`
      UPDATE orders SET cancel_status = 'requested', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(order.id);

    return successResponse(res, {
      order_id: order.id,
      cancel_status: 'requested'
    }, 'Cancellation request submitted for processing.');

  } catch (error) {
    console.error('Cancel order error:', error);
    return errorResponse(res, 'Failed to submit cancellation request.', 500);
  }
});

// ──────────────── GET /api/orders ────────────────
// List user's orders
router.get('/', [
  query('status').optional().isIn(['all', 'pending', 'processing', 'in_progress', 'completed', 'partial', 'cancelled', 'refunded', 'failed']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['newest', 'oldest', 'charge_high', 'charge_low']),
  query('search').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { status, sort, search } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    let where = ['o.user_id = ?'];
    let params = [req.user.id];

    if (status && status !== 'all') {
      where.push('o.status = ?');
      params.push(status);
    }
    if (search) {
      where.push('(CAST(o.id AS TEXT) LIKE ? OR o.link LIKE ? OR s.name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const whereClause = 'WHERE ' + where.join(' AND ');

    let orderBy = 'o.created_at DESC';
    if (sort === 'oldest') orderBy = 'o.created_at ASC';
    else if (sort === 'charge_high') orderBy = 'o.charge DESC';
    else if (sort === 'charge_low') orderBy = 'o.charge ASC';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total 
      FROM orders o
      LEFT JOIN services s ON o.service_id = s.id
      ${whereClause}
    `).get(...params);

    const orders = db.prepare(`
      SELECT 
        o.*,
        s.name as service_name, s.rate as service_rate, s.refill as service_refill, s.cancel as service_cancel,
        c.name as category_name, c.icon as category_icon
      FROM orders o
      LEFT JOIN services s ON o.service_id = s.id
      LEFT JOIN categories c ON s.category_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return successResponse(res, {
      orders,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Orders retrieved');

  } catch (error) {
    console.error('Get orders error:', error);
    return errorResponse(res, 'Failed to retrieve orders.', 500);
  }
});

// ──────────────── GET /api/orders/stats ────────────────
// User's order statistics
router.get('/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(charge), 0) as total_spent,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded
      FROM orders WHERE user_id = ?
    `).get(req.user.id);

    return successResponse(res, { stats }, 'Order stats retrieved');

  } catch (error) {
    console.error('Get order stats error:', error);
    return errorResponse(res, 'Failed to retrieve order stats.', 500);
  }
});

// ──────────────── GET /api/orders/:id ────────────────
// Get single order details
router.get('/:id', [
  param('id').isInt().withMessage('Order ID must be an integer')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const order = db.prepare(`
      SELECT o.*, s.name as service_name, s.rate as service_rate, s.type as service_type,
             c.name as category_name, c.icon as category_icon
      FROM orders o
      LEFT JOIN services s ON o.service_id = s.id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE o.id = ? AND o.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    return successResponse(res, { order }, 'Order retrieved');

  } catch (error) {
    console.error('Get order error:', error);
    return errorResponse(res, 'Failed to retrieve order.', 500);
  }
});

module.exports = router;
