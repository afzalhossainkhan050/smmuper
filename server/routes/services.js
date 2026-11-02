const express = require('express');
const router = express.Router();
const { query, param, validationResult } = require('express-validator');
const db = require('../db/database');
const { optionalAuth } = require('../middleware/auth');
const { successResponse, errorResponse, paginate, paginationMeta } = require('../utils/helpers');

// ──────────────── GET /api/services ────────────────
// List all active services (with optional filters)
router.get('/', optionalAuth, [
  query('category_id').optional().isInt().withMessage('category_id must be integer'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('type').optional().isIn(['default', 'package', 'custom_comments', 'subscriptions'])
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { category_id, search, type } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    let where = ['s.status = ?'];
    let params = ['active'];

    if (category_id) {
      where.push('s.category_id = ?');
      params.push(parseInt(category_id));
    }

    if (search) {
      where.push('(s.name LIKE ? OR s.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (type) {
      where.push('s.type = ?');
      params.push(type);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Count total
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM services s ${whereClause}`).get(...params);
    const total = countRow.total;

    // Fetch services with category info
    const services = db.prepare(`
      SELECT s.*, c.name as category_name, c.icon as category_icon
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      ${whereClause}
      ORDER BY c.sort_order ASC, s.id ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return successResponse(res, {
      services,
      pagination: paginationMeta(total, page, limit)
    }, 'Services retrieved');

  } catch (error) {
    console.error('Get services error:', error);
    return errorResponse(res, 'Failed to retrieve services.', 500);
  }
});

// ──────────────── GET /api/services/categories ────────────────
// List all active categories with service count
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(s.id) as service_count
      FROM categories c
      LEFT JOIN services s ON c.id = s.category_id AND s.status = 'active'
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `).all();

    return successResponse(res, { categories }, 'Categories retrieved');

  } catch (error) {
    console.error('Get categories error:', error);
    return errorResponse(res, 'Failed to retrieve categories.', 500);
  }
});

// ──────────────── GET /api/services/search ────────────────
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required').trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const { q } = req.query;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    const searchTerm = `%${q}%`;

    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM services s
      WHERE s.status = 'active' AND (s.name LIKE ? OR s.description LIKE ?)
    `).get(searchTerm, searchTerm);

    const services = db.prepare(`
      SELECT s.*, c.name as category_name, c.icon as category_icon
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.status = 'active' AND (s.name LIKE ? OR s.description LIKE ?)
      ORDER BY s.name ASC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, limit, offset);

    return successResponse(res, {
      services,
      query: q,
      pagination: paginationMeta(countRow.total, page, limit)
    }, 'Search results');

  } catch (error) {
    console.error('Search services error:', error);
    return errorResponse(res, 'Search failed.', 500);
  }
});

// ──────────────── GET /api/services/:id ────────────────
router.get('/:id', [
  param('id').isInt().withMessage('Service ID must be an integer')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const service = db.prepare(`
      SELECT s.*, c.name as category_name, c.icon as category_icon
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.id = ? AND s.status = 'active'
    `).get(req.params.id);

    if (!service) {
      return errorResponse(res, 'Service not found.', 404);
    }

    return successResponse(res, { service }, 'Service retrieved');

  } catch (error) {
    console.error('Get service error:', error);
    return errorResponse(res, 'Failed to retrieve service.', 500);
  }
});

module.exports = router;
