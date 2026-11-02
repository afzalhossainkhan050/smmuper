const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  /**
   * Create a new user
   * @param {object} data - { name, email, phone, password, role }
   * @returns {object} Created user (without password)
   */
  static create({ name, email, phone, password, role = 'customer' }) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(`
      INSERT INTO users (name, email, phone, password, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, email, phone || null, hashedPassword, role);
    return User.findById(result.lastInsertRowid);
  }

  /**
   * Find a user by email
   * @param {string} email
   * @returns {object|undefined} User row (includes password hash)
   */
  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  /**
   * Find a user by ID (excludes password)
   * @param {number} id
   * @returns {object|undefined} User row without password
   */
  static findById(id) {
    const stmt = db.prepare('SELECT id, name, email, phone, role, created_at, updated_at FROM users WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Get all users, optionally filtered by role
   * @param {object} options - { role, page, limit }
   * @returns {object} { users, total }
   */
  static getAll({ role, page = 1, limit = 20 } = {}) {
    let whereClause = '';
    const params = [];

    if (role) {
      whereClause = 'WHERE role = ?';
      params.push(role);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM users ${whereClause}`);
    const { total } = countStmt.get(...params);

    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT id, name, email, phone, role, created_at, updated_at
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const users = stmt.all(...params, limit, offset);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Update a user
   * @param {number} id
   * @param {object} data - Fields to update
   * @returns {object} Updated user
   */
  static update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      values.push(data.phone);
    }
    if (data.password !== undefined) {
      fields.push('password = ?');
      values.push(bcrypt.hashSync(data.password, 10));
    }
    if (data.role !== undefined) {
      fields.push('role = ?');
      values.push(data.role);
    }

    if (fields.length === 0) return User.findById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return User.findById(id);
  }

  /**
   * Delete a user by ID
   * @param {number} id
   * @returns {boolean} True if deleted
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain password
   * @param {string} hash - Hashed password
   * @returns {boolean}
   */
  static verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }
}

module.exports = User;
