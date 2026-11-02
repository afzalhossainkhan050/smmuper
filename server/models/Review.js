const db = require('../config/database');

class Review {
  /**
   * Create a new review
   * @param {object} data - Review data
   * @returns {object} Created review
   */
  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO reviews (customer_id, booking_id, service_id, rating, comment, customer_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.customer_id || null,
      data.booking_id,
      data.service_id || null,
      data.rating,
      data.comment || null,
      data.customer_name || null
    );

    return Review.findById(result.lastInsertRowid);
  }

  /**
   * Find review by ID
   * @param {number} id
   * @returns {object|undefined}
   */
  static findById(id) {
    const stmt = db.prepare(`
      SELECT r.*, s.name as service_name
      FROM reviews r
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.id = ?
    `);
    return stmt.get(id);
  }

  /**
   * Get reviews by service
   * @param {number} serviceId
   * @param {boolean} approvedOnly - Only return approved reviews
   * @returns {Array}
   */
  static findByService(serviceId, approvedOnly = true) {
    let query = `
      SELECT r.*, s.name as service_name
      FROM reviews r
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.service_id = ?
    `;
    if (approvedOnly) {
      query += ' AND r.is_approved = 1';
    }
    query += ' ORDER BY r.created_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(serviceId);
  }

  /**
   * Get all approved reviews
   * @param {object} options - { limit }
   * @returns {Array}
   */
  static getApproved({ limit = 50 } = {}) {
    const stmt = db.prepare(`
      SELECT r.*, s.name as service_name
      FROM reviews r
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.is_approved = 1
      ORDER BY r.created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  /**
   * Get featured reviews (highest rated, approved)
   * @param {number} limit
   * @returns {Array}
   */
  static getFeatured(limit = 6) {
    const stmt = db.prepare(`
      SELECT r.*, s.name as service_name
      FROM reviews r
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.is_approved = 1
      ORDER BY r.rating DESC, r.created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  /**
   * Get all reviews (admin)
   * @param {object} options - { page, limit, is_approved }
   * @returns {object} { reviews, total }
   */
  static getAll({ page = 1, limit = 20, is_approved } = {}) {
    let whereClause = '';
    const params = [];

    if (is_approved !== undefined) {
      whereClause = 'WHERE r.is_approved = ?';
      params.push(is_approved ? 1 : 0);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM reviews r ${whereClause}`);
    const { total } = countStmt.get(...params);

    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT r.*, s.name as service_name
      FROM reviews r
      LEFT JOIN services s ON r.service_id = s.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const reviews = stmt.all(...params, limit, offset);

    return { reviews, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Approve or disapprove a review
   * @param {number} id
   * @param {boolean} approved
   * @returns {object} Updated review
   */
  static approve(id, approved = true) {
    const stmt = db.prepare('UPDATE reviews SET is_approved = ? WHERE id = ?');
    stmt.run(approved ? 1 : 0, id);
    return Review.findById(id);
  }

  /**
   * Delete a review
   * @param {number} id
   * @returns {boolean}
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM reviews WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get average rating stats
   * @returns {object}
   */
  static getAverageRating() {
    const stmt = db.prepare(`
      SELECT
        ROUND(AVG(rating), 1) as average_rating,
        COUNT(*) as total_reviews
      FROM reviews
      WHERE is_approved = 1
    `);
    return stmt.get();
  }
}

module.exports = Review;
