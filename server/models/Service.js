const db = require('../config/database');
const { slugify } = require('../utils/helpers');

class Service {
  /**
   * Create a new service
   * @param {object} data - Service data
   * @returns {object} Created service
   */
  static create(data) {
    const slug = data.slug || slugify(data.name);
    const stmt = db.prepare(`
      INSERT INTO services (name, slug, short_description, description, icon, price_starting, price_label, duration, category, is_active, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.name,
      slug,
      data.short_description || null,
      data.description || null,
      data.icon || 'snowflake',
      data.price_starting || null,
      data.price_label || 'Starting from',
      data.duration || null,
      data.category || 'residential',
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      data.display_order || 0
    );
    return Service.findById(result.lastInsertRowid);
  }

  /**
   * Find a service by ID
   * @param {number} id
   * @returns {object|undefined}
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM services WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Find a service by slug
   * @param {string} slug
   * @returns {object|undefined}
   */
  static findBySlug(slug) {
    const stmt = db.prepare('SELECT * FROM services WHERE slug = ?');
    return stmt.get(slug);
  }

  /**
   * Get all services (optionally filtered)
   * @param {object} options - { category, page, limit }
   * @returns {object} { services, total }
   */
  static getAll({ category, page = 1, limit = 50 } = {}) {
    let whereClause = '';
    const params = [];

    if (category) {
      whereClause = "WHERE (category = ? OR category = 'both')";
      params.push(category);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM services ${whereClause}`);
    const { total } = countStmt.get(...params);

    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT * FROM services ${whereClause}
      ORDER BY display_order ASC, created_at DESC
      LIMIT ? OFFSET ?
    `);
    const services = stmt.all(...params, limit, offset);

    return { services, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get only active services
   * @param {string} category - Optional category filter
   * @returns {Array} Active services
   */
  static getActive(category) {
    let query = 'SELECT * FROM services WHERE is_active = 1';
    const params = [];

    if (category) {
      query += " AND (category = ? OR category = 'both')";
      params.push(category);
    }

    query += ' ORDER BY display_order ASC, created_at DESC';
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Update a service
   * @param {number} id
   * @param {object} data - Fields to update
   * @returns {object} Updated service
   */
  static update(id, data) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'name', 'short_description', 'description', 'icon',
      'price_starting', 'price_label', 'duration', 'category',
      'is_active', 'display_order'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(field === 'is_active' ? (data[field] ? 1 : 0) : data[field]);
      }
    }

    // Update slug if name changed
    if (data.name) {
      fields.push('slug = ?');
      values.push(data.slug || slugify(data.name));
    }

    if (fields.length === 0) return Service.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return Service.findById(id);
  }

  /**
   * Delete a service by ID
   * @param {number} id
   * @returns {boolean}
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM services WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

module.exports = Service;
