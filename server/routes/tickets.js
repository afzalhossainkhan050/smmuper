const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse, paginate, paginationMeta } = require('../utils/helpers');

// All ticket routes require authentication
router.use(authenticate);

// ──────────────── POST /api/tickets ────────────────
// Create a new support ticket
router.post('/', [
  body('subject').trim().isLength({ min: 3, max: 200 }).withMessage('Subject must be 3-200 characters'),
  body('message').trim().isLength({ min: 10, max: 5000 }).withMessage('Message must be 10-5000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority level')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { subject, message, priority } = req.body;

    const result = db.prepare(`
      INSERT INTO tickets (user_id, subject, message, priority, status)
      VALUES (?, ?, ?, ?, 'open')
    `).run(req.user.id, subject, message, priority || 'medium');

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid);

    return successResponse(res, { ticket }, 'Ticket created successfully', 201);

  } catch (error) {
    console.error('Create ticket error:', error);
    return errorResponse(res, 'Failed to create ticket.', 500);
  }
});

// ──────────────── GET /api/tickets ────────────────
// List user's tickets
router.get('/', [
  query('status').optional().isIn(['open', 'answered', 'closed', 'pending']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { status } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    let where = ['user_id = ?'];
    let params = [req.user.id];

    if (status) {
      where.push('status = ?');
      params.push(status);
    }

    const whereClause = 'WHERE ' + where.join(' AND ');

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM tickets ${whereClause}`).get(...params);

    const tickets = db.prepare(`
      SELECT * FROM tickets
      ${whereClause}
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        updated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return successResponse(res, {
      tickets,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Tickets retrieved');

  } catch (error) {
    console.error('Get tickets error:', error);
    return errorResponse(res, 'Failed to retrieve tickets.', 500);
  }
});

// ──────────────── GET /api/tickets/:id ────────────────
// Get single ticket with replies
router.get('/:id', [
  param('id').isInt().withMessage('Ticket ID must be an integer')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!ticket) {
      return errorResponse(res, 'Ticket not found.', 404);
    }

    // Get replies
    const replies = db.prepare(`
      SELECT tr.*, u.username, u.role
      FROM ticket_replies tr
      LEFT JOIN users u ON tr.user_id = u.id
      WHERE tr.ticket_id = ?
      ORDER BY tr.created_at ASC
    `).all(ticket.id);

    return successResponse(res, { ticket, replies }, 'Ticket retrieved');

  } catch (error) {
    console.error('Get ticket error:', error);
    return errorResponse(res, 'Failed to retrieve ticket.', 500);
  }
});

// ──────────────── POST /api/tickets/:id/reply ────────────────
// Reply to a ticket
router.post('/:id/reply', [
  param('id').isInt().withMessage('Ticket ID must be an integer'),
  body('message').trim().isLength({ min: 2, max: 5000 }).withMessage('Message must be 2-5000 characters')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!ticket) {
      return errorResponse(res, 'Ticket not found.', 404);
    }

    if (ticket.status === 'closed') {
      return errorResponse(res, 'Cannot reply to a closed ticket.', 400);
    }

    const { message } = req.body;

    const addReply = db.transaction(() => {
      // Insert reply
      const result = db.prepare(
        'INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES (?, ?, ?)'
      ).run(ticket.id, req.user.id, message);

      // Update ticket status to pending (awaiting admin response)
      db.prepare(
        "UPDATE tickets SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(ticket.id);

      return result.lastInsertRowid;
    });

    const replyId = addReply();
    const reply = db.prepare(`
      SELECT tr.*, u.username, u.role
      FROM ticket_replies tr
      LEFT JOIN users u ON tr.user_id = u.id
      WHERE tr.id = ?
    `).get(replyId);

    return successResponse(res, { reply }, 'Reply added successfully', 201);

  } catch (error) {
    console.error('Reply to ticket error:', error);
    return errorResponse(res, 'Failed to add reply.', 500);
  }
});

// ──────────────── PUT / POST /api/tickets/:id/close ────────────────
const handleCloseTicket = (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!ticket) {
      return errorResponse(res, 'Ticket not found.', 404);
    }

    if (ticket.status === 'closed') {
      return errorResponse(res, 'Ticket is already closed.', 400);
    }

    db.prepare("UPDATE tickets SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(ticket.id);

    return successResponse(res, {}, 'Ticket closed successfully');

  } catch (error) {
    console.error('Close ticket error:', error);
    return errorResponse(res, 'Failed to close ticket.', 500);
  }
};

router.put('/:id/close', [
  param('id').isInt().withMessage('Ticket ID must be an integer')
], handleCloseTicket);

router.post('/:id/close', [
  param('id').isInt().withMessage('Ticket ID must be an integer')
], handleCloseTicket);

module.exports = router;
