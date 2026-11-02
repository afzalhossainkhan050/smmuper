const db = require('../config/database');

class Contact {
  /**
   * Create a new contact message
   * @param {object} data - { name, email, phone, subject, message }
   * @returns {object} Created message
   */
  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO contact_messages (name, email, phone, subject, message)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.name,
      data.email,
      data.phone || null,
      data.subject || null,
      data.message
    );
    return Contact.findById(result.lastInsertRowid);
  }

  /**
   * Find a contact message by ID
   * @param {number} id
   * @returns {object|undefined}
   */
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM contact_messages WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Get all contact messages with optional filters
   * @param {object} options - { is_read, page, limit }
   * @returns {object} { messages, total }
   */
  static getAll({ is_read, page = 1, limit = 20 } = {}) {
    let whereClause = '';
    const params = [];

    if (is_read !== undefined) {
      whereClause = 'WHERE is_read = ?';
      params.push(is_read ? 1 : 0);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM contact_messages ${whereClause}`);
    const { total } = countStmt.get(...params);

    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT * FROM contact_messages ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const messages = stmt.all(...params, limit, offset);

    return { messages, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Mark a message as read
   * @param {number} id
   * @returns {object} Updated message
   */
  static markRead(id) {
    const stmt = db.prepare('UPDATE contact_messages SET is_read = 1 WHERE id = ?');
    stmt.run(id);
    return Contact.findById(id);
  }

  /**
   * Delete a contact message
   * @param {number} id
   * @returns {boolean}
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM contact_messages WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get count of unread messages
   * @returns {number}
   */
  static getUnreadCount() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM contact_messages WHERE is_read = 0');
    return stmt.get().count;
  }
}

module.exports = Contact;
