const db = require('../config/database');

class Technician {
  /**
   * Create a technician profile for a user
   * @param {object} data - Technician profile data
   * @returns {object} Created profile
   */
  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO technicians_profile (user_id, specialization, experience_years, bio, photo_url, is_available, rating, jobs_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.user_id,
      data.specialization || null,
      data.experience_years || 0,
      data.bio || null,
      data.photo_url || null,
      data.is_available !== undefined ? (data.is_available ? 1 : 0) : 1,
      data.rating || 5.0,
      data.jobs_completed || 0
    );
    return Technician.findById(result.lastInsertRowid);
  }

  /**
   * Find technician profile by profile ID
   * @param {number} id
   * @returns {object|undefined}
   */
  static findById(id) {
    const stmt = db.prepare(`
      SELECT tp.*, u.name, u.email, u.phone
      FROM technicians_profile tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.id = ?
    `);
    return stmt.get(id);
  }

  /**
   * Find technician profile by user ID
   * @param {number} userId
   * @returns {object|undefined}
   */
  static findByUserId(userId) {
    const stmt = db.prepare(`
      SELECT tp.*, u.name, u.email, u.phone
      FROM technicians_profile tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.user_id = ?
    `);
    return stmt.get(userId);
  }

  /**
   * Get all technician profiles
   * @param {object} options - { page, limit }
   * @returns {object} { technicians, total }
   */
  static getAll({ page = 1, limit = 20 } = {}) {
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM technicians_profile');
    const { total } = countStmt.get();

    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT tp.*, u.name, u.email, u.phone
      FROM technicians_profile tp
      JOIN users u ON tp.user_id = u.id
      ORDER BY tp.rating DESC
      LIMIT ? OFFSET ?
    `);
    const technicians = stmt.all(limit, offset);

    return { technicians, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get available technicians
   * @returns {Array}
   */
  static getAvailable() {
    const stmt = db.prepare(`
      SELECT tp.*, u.name, u.email, u.phone
      FROM technicians_profile tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.is_available = 1
      ORDER BY tp.rating DESC
    `);
    return stmt.all();
  }

  /**
   * Update a technician profile
   * @param {number} id - Profile ID
   * @param {object} data - Fields to update
   * @returns {object} Updated profile
   */
  static update(id, data) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'specialization', 'experience_years', 'bio', 'photo_url',
      'is_available', 'rating', 'jobs_completed'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(field === 'is_available' ? (data[field] ? 1 : 0) : data[field]);
      }
    }

    if (fields.length === 0) return Technician.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE technicians_profile SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return Technician.findById(id);
  }

  /**
   * Increment the jobs completed counter
   * @param {number} userId
   */
  static incrementJobsCompleted(userId) {
    const stmt = db.prepare(`
      UPDATE technicians_profile
      SET jobs_completed = jobs_completed + 1
      WHERE user_id = ?
    `);
    stmt.run(userId);
  }
  /**
   * Delete a technician profile
   * @param {number} id
   * @returns {boolean}
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM technicians_profile WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

module.exports = Technician;
