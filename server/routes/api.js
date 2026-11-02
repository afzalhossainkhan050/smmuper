const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate, apiKeyAuth } = require('../middleware/auth');
const { successResponse, errorResponse, generateApiKey, calculateCharge, paginate, paginationMeta } = require('../utils/helpers');
const providerEngine = require('../services/providerEngine');

// ═══════════════════════════════════════════════════════════
//            API KEY MANAGEMENT (JWT auth required)
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/user-api/key ────────────────
// Get current API key
router.get('/key', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT api_key FROM users WHERE id = ?').get(req.user.id);
    return successResponse(res, { api_key: user.api_key }, 'API key retrieved successfully');
  } catch (error) {
    console.error('Get API key error:', error);
    return errorResponse(res, 'Failed to retrieve API key.', 500);
  }
});

// ──────────────── POST /api/user-api/key/regenerate ────────────────
// Generate new API key
router.post('/key/regenerate', authenticate, (req, res) => {
  try {
    const newKey = generateApiKey();
    db.prepare('UPDATE users SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newKey, req.user.id);

    return successResponse(res, { api_key: newKey }, 'API key regenerated successfully');
  } catch (error) {
    console.error('Regenerate API key error:', error);
    return errorResponse(res, 'Failed to regenerate API key.', 500);
  }
});

// ──────────────── GET /api/user-api/docs ────────────────
// API documentation endpoint
router.get('/docs', (req, res) => {
  const docs = {
    title: 'SMMuper Wholesale Reseller API',
    version: '2.0',
    base_url: 'https://smmuper.com/api/v2',
    standard: 'SMM Standard Protocol v2',
    authentication: 'Include your API key as parameter "key" in POST requests',
    actions: [
      {
        action: 'services',
        description: 'Retrieve the complete list of available active services with wholesale rates and limits.',
        parameters: { key: 'Your SMMuper API Key', action: '"services"' },
        response_example: [
          {
            service: 1,
            name: 'Instagram Followers [Real / Instant / 30D Refill]',
            type: 'Default',
            category: 'Instagram Followers',
            rate: '1.20',
            min: 100,
            max: 50000,
            refill: true,
            cancel: true
          }
        ]
      },
      {
        action: 'add',
        description: 'Submit a new order. Wallet balance is deducted automatically.',
        parameters: {
          key: 'Your SMMuper API Key',
          action: '"add"',
          service: 'Service ID (integer)',
          link: 'Target social media URL / profile',
          quantity: 'Order quantity (integer)'
        },
        response_example: { order: 1042 }
      },
      {
        action: 'status',
        description: 'Query live status and progress of an order or multiple comma-separated orders.',
        parameters: { key: 'Your SMMuper API Key', action: '"status"', order: '1042 (or orders: "1041,1042")' },
        response_example: {
          charge: '1.20',
          start_count: 520,
          status: 'In progress',
          remains: 200,
          currency: 'USD'
        }
      },
      {
        action: 'refill',
        description: 'Request a refill for a completed or partial order.',
        parameters: { key: 'Your SMMuper API Key', action: '"refill"', order: '1042' },
        response_example: { refill: 85 }
      },
      {
        action: 'balance',
        description: 'Check your available account wallet balance.',
        parameters: { key: 'Your SMMuper API Key', action: '"balance"' },
        response_example: { balance: '150.25', currency: 'USD' }
      }
    ]
  };

  return successResponse(res, { docs }, 'API documentation retrieved');
});

// ═══════════════════════════════════════════════════════════
//     STANDARD SMM V2 PROTOCOL HANDLER (POST /api/v2)
// ═══════════════════════════════════════════════════════════
router.post('/', (req, res) => {
  try {
    const key = req.body.key || req.query.key || req.headers['x-api-key'];
    const action = req.body.action || req.query.action;

    if (!key) {
      return res.status(401).json({ error: 'API key is missing' });
    }

    const user = db.prepare("SELECT * FROM users WHERE api_key = ? AND status = 'active'").get(key);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    if (!action) {
      return res.status(400).json({ error: 'Action parameter is required' });
    }

    // 1. ACTION: services
    if (action === 'services') {
      const services = db.prepare(`
        SELECT 
          s.id as service,
          s.name,
          s.type,
          c.name as category,
          s.rate,
          s.min_quantity as min,
          s.max_quantity as max,
          CASE WHEN s.refill = 1 THEN 1 ELSE 0 END as refill,
          CASE WHEN s.cancel = 1 THEN 1 ELSE 0 END as cancel
        FROM services s
        LEFT JOIN categories c ON s.category_id = c.id
        WHERE s.status = 'active'
        ORDER BY c.sort_order ASC, s.sort_order ASC, s.id ASC
      `).all();

      const formatted = services.map(s => ({
        service: s.service,
        name: s.name,
        type: s.type || 'Default',
        category: s.category || 'General',
        rate: parseFloat(s.rate).toFixed(4),
        min: s.min,
        max: s.max,
        refill: Boolean(s.refill),
        cancel: Boolean(s.cancel)
      }));

      return res.json(formatted);
    }

    // 2. ACTION: balance
    if (action === 'balance') {
      return res.json({
        balance: parseFloat(user.balance || 0).toFixed(4),
        currency: 'USD'
      });
    }

    // 3. ACTION: add
    if (action === 'add') {
      const { service: serviceId, link, quantity } = req.body;

      if (!serviceId || !link || !quantity) {
        return res.status(400).json({ error: 'Missing service, link, or quantity parameter' });
      }

      const numQty = parseInt(quantity);
      if (isNaN(numQty) || numQty <= 0) {
        return res.status(400).json({ error: 'Invalid quantity' });
      }

      const service = db.prepare("SELECT * FROM services WHERE id = ? AND status = 'active'").get(serviceId);
      if (!service) {
        return res.status(404).json({ error: 'Service not found or inactive' });
      }

      if (numQty < service.min_quantity) {
        return res.status(400).json({ error: `Quantity must be at least ${service.min_quantity}` });
      }
      if (numQty > service.max_quantity) {
        return res.status(400).json({ error: `Quantity cannot exceed ${service.max_quantity}` });
      }

      const charge = calculateCharge(service.rate, numQty);
      if (user.balance < charge) {
        return res.status(400).json({ error: 'Insufficient wallet balance', required: charge, balance: user.balance });
      }

      let orderId = 0;
      let newBalance = 0;

      const orderTx = db.transaction(() => {
        // Atomic wallet deduction
        const curUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(user.id);
        newBalance = Math.round((curUser.balance - charge) * 10000) / 10000;

        db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newBalance, user.id);

        // Insert order
        const oRes = db.prepare(`
          INSERT INTO orders (
            user_id, service_id, link, quantity, charge, status, remains, provider_id, cost
          ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        `).run(
          user.id,
          service.id,
          link.trim(),
          numQty,
          charge,
          numQty,
          service.provider_id || null,
          service.provider_id ? (calculateCharge(service.original_rate || service.rate * 0.5, numQty)) : 0.00
        );
        orderId = oRes.lastInsertRowid;

        // Record into immutable financial ledger
        db.prepare(`
          INSERT INTO financial_ledger (
            user_id, transaction_type, amount, balance_before, balance_after,
            currency, reference_id, reference_type, description, created_at
          ) VALUES (?, 'order_charge', ?, ?, ?, 'USD', ?, 'order', ?, CURRENT_TIMESTAMP)
        `).run(
          user.id,
          charge,
          curUser.balance,
          newBalance,
          String(orderId),
          `API Order #${orderId} charge for ${numQty} units of ${service.name}`
        );

        // Check referral commission
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

      orderTx();

      // Trigger background provider dispatch if mapped
      if (service.provider_id && service.provider_service_id) {
        setImmediate(async () => {
          try {
            await providerEngine.submitOrder(orderId);
          } catch (e) {
            console.error(`API provider background dispatch error for order #${orderId}:`, e.message);
          }
        });
      }

      return res.json({ order: orderId });
    }

    // 4. ACTION: status
    if (action === 'status') {
      const orderParam = req.body.order || req.query.order;
      const ordersParam = req.body.orders || req.query.orders;

      if (orderParam) {
        const order = db.prepare(`
          SELECT id, charge, start_count, status, remains
          FROM orders WHERE id = ? AND user_id = ?
        `).get(orderParam, user.id);

        if (!order) {
          return res.status(404).json({ error: 'Order not found' });
        }

        // Format status to SMM standard naming
        let formattedStatus = 'Pending';
        if (order.status === 'processing' || order.status === 'in_progress') formattedStatus = 'In progress';
        else if (order.status === 'completed') formattedStatus = 'Completed';
        else if (order.status === 'partial') formattedStatus = 'Partial';
        else if (order.status === 'cancelled') formattedStatus = 'Canceled';
        else if (order.status === 'failed') formattedStatus = 'Fail';

        return res.json({
          charge: parseFloat(order.charge || 0).toFixed(4),
          start_count: order.start_count || 0,
          status: formattedStatus,
          remains: order.remains || 0,
          currency: 'USD'
        });
      }

      if (ordersParam) {
        const ids = String(ordersParam).split(',').map(s => parseInt(s.trim())).filter(Boolean);
        if (ids.length === 0) return res.status(400).json({ error: 'No valid order IDs provided' });

        const placeholders = ids.map(() => '?').join(',');
        const rows = db.prepare(`
          SELECT id, charge, start_count, status, remains
          FROM orders WHERE id IN (${placeholders}) AND user_id = ?
        `).all(...ids, user.id);

        const result = {};
        for (const r of rows) {
          let formattedStatus = 'Pending';
          if (r.status === 'processing' || r.status === 'in_progress') formattedStatus = 'In progress';
          else if (r.status === 'completed') formattedStatus = 'Completed';
          else if (r.status === 'partial') formattedStatus = 'Partial';
          else if (r.status === 'cancelled') formattedStatus = 'Canceled';
          else if (r.status === 'failed') formattedStatus = 'Fail';

          result[r.id] = {
            charge: parseFloat(r.charge || 0).toFixed(4),
            start_count: r.start_count || 0,
            status: formattedStatus,
            remains: r.remains || 0
          };
        }
        return res.json(result);
      }

      return res.status(400).json({ error: 'Order or orders parameter required' });
    }

    // 5. ACTION: refill
    if (action === 'refill') {
      const orderId = req.body.order;
      if (!orderId) return res.status(400).json({ error: 'Order ID is required' });

      const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, user.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const ins = db.prepare(`
        INSERT INTO order_refills (order_id, user_id, provider_id, status)
        VALUES (?, ?, ?, 'pending')
      `).run(order.id, user.id, order.provider_id);

      db.prepare("UPDATE orders SET refill_status = 'requested', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(order.id);

      return res.json({ refill: ins.lastInsertRowid });
    }

    // 6. ACTION: refill_status
    if (action === 'refill_status') {
      const refillId = req.body.refill;
      if (!refillId) return res.status(400).json({ error: 'Refill ID is required' });

      const refill = db.prepare('SELECT status FROM order_refills WHERE id = ? AND user_id = ?').get(refillId, user.id);
      if (!refill) return res.status(404).json({ error: 'Refill record not found' });

      let formatted = 'Pending';
      if (refill.status === 'completed') formatted = 'Completed';
      else if (refill.status === 'rejected') formatted = 'Rejected';
      else if (refill.status === 'refilling') formatted = 'In progress';

      return res.json({ status: formatted });
    }

    return res.status(400).json({ error: `Unknown action '${action}'` });

  } catch (error) {
    console.error('SMM v2 protocol error:', error);
    return res.status(500).json({ error: 'Internal API error' });
  }
});

// ═══════════════════════════════════════════════════════════
//      RESTFUL JSON API (API Key in header or query)
// ═══════════════════════════════════════════════════════════

// ──────────────── GET /api/user-api/v1/services ────────────────
router.get('/v1/services', apiKeyAuth, (req, res) => {
  try {
    const { category_id } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    let where = ["s.status = 'active'"];
    let params = [];

    if (category_id) {
      where.push('s.category_id = ?');
      params.push(parseInt(category_id));
    }

    const whereClause = 'WHERE ' + where.join(' AND ');
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM services s ${whereClause}`).get(...params);

    const services = db.prepare(`
      SELECT s.id, s.category_id, s.name, s.rate, s.min_quantity as min, s.max_quantity as max, s.type,
             c.name as category
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      ${whereClause}
      ORDER BY c.sort_order ASC, s.id ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return res.json({ services, pagination: paginationMeta(countRow.total, page, limit) });
  } catch (error) {
    console.error('API get services error:', error);
    return errorResponse(res, 'Failed to retrieve services.', 500);
  }
});

// ──────────────── POST /api/user-api/v1/order ────────────────
router.post('/v1/order', apiKeyAuth, [
  body('service_id').isInt({ min: 1 }).withMessage('service_id is required'),
  body('link').trim().notEmpty().withMessage('link is required'),
  body('quantity').isInt({ min: 1 }).withMessage('quantity is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: 'Validation failed', details: errors.array() });
    }

    const { service_id, link, quantity } = req.body;
    const service = db.prepare("SELECT * FROM services WHERE id = ? AND status = 'active'").get(service_id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found or inactive' });
    }

    if (quantity < service.min_quantity || quantity > service.max_quantity) {
      return res.status(400).json({
        error: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}`
      });
    }

    const charge = calculateCharge(service.rate, quantity);
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);

    if (user.balance < charge) {
      return res.status(400).json({ error: 'Insufficient balance', required: charge, available: user.balance });
    }

    let orderId = 0;
    let newBalance = 0;

    const createOrder = db.transaction(() => {
      newBalance = Math.round((user.balance - charge) * 10000) / 10000;
      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newBalance, req.user.id);

      const result = db.prepare(`
        INSERT INTO orders (user_id, service_id, link, quantity, charge, status, remains)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `).run(req.user.id, service_id, link, quantity, charge, quantity);
      orderId = result.lastInsertRowid;

      db.prepare(`
        INSERT INTO financial_ledger (
          user_id, transaction_type, amount, balance_before, balance_after,
          currency, reference_id, reference_type, description, created_at
        ) VALUES (?, 'order_charge', ?, ?, ?, 'USD', ?, 'order', ?, CURRENT_TIMESTAMP)
      `).run(
        req.user.id,
        charge,
        user.balance,
        newBalance,
        String(orderId),
        `REST API Order #${orderId} charge for ${quantity} units of ${service.name}`
      );
    });

    createOrder();

    return res.status(201).json({ order: orderId, charge, balance: newBalance });
  } catch (error) {
    console.error('API create order error:', error);
    return errorResponse(res, 'Failed to create order.', 500);
  }
});

// ──────────────── GET /api/user-api/v1/order/:id ────────────────
router.get('/v1/order/:id', apiKeyAuth, (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.id, o.service_id, o.link, o.quantity, o.charge, o.status, o.start_count, o.remains, o.created_at
      FROM orders o WHERE o.id = ? AND o.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(order);
  } catch (error) {
    console.error('API get order error:', error);
    return errorResponse(res, 'Failed to retrieve order.', 500);
  }
});

// ──────────────── GET /api/user-api/v1/orders ────────────────
router.get('/v1/orders', apiKeyAuth, (req, res) => {
  try {
    const { status } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    let where = ['user_id = ?'];
    let params = [req.user.id];

    if (status) {
      where.push('status = ?');
      params.push(status);
    }

    const whereClause = 'WHERE ' + where.join(' AND ');
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM orders ${whereClause}`).get(...params);

    const orders = db.prepare(`
      SELECT id, service_id, link, quantity, charge, status, start_count, remains, created_at
      FROM orders ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return res.json({ orders, pagination: paginationMeta(countRow.total, page, limit) });
  } catch (error) {
    console.error('API get orders error:', error);
    return errorResponse(res, 'Failed to retrieve orders.', 500);
  }
});

// ──────────────── GET /api/user-api/v1/balance ────────────────
router.get('/v1/balance', apiKeyAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
    return res.json({ balance: user.balance, currency: 'USD' });
  } catch (error) {
    console.error('API get balance error:', error);
    return errorResponse(res, 'Failed to retrieve balance.', 500);
  }
});

module.exports = router;
