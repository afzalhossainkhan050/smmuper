const db = require('../config/database');
const { generateReferenceCode } = require('../utils/helpers');

class Booking {
  /**
   * Create a new booking
   * @param {object} data - Booking data
   * @returns {object} Created booking
   */
  static create(data) {
    // Generate a unique reference code
    let referenceCode;
    let exists = true;
    while (exists) {
      referenceCode = generateReferenceCode();
      const check = db.prepare('SELECT id FROM bookings WHERE reference_code = ?').get(referenceCode);
      exists = !!check;
    }

    const stmt = db.prepare(`
      INSERT INTO bookings (
        reference_code, customer_id, service_id, customer_name, customer_email,
        customer_phone, address, city, preferred_date, preferred_time,
        ac_brand, ac_type, problem_description, total_price
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      referenceCode,
      data.customer_id || null,
      data.service_id,
      data.customer_name,
      data.customer_email,
      data.customer_phone,
      data.address,
      data.city || null,
      data.preferred_date,
      data.preferred_time,
      data.ac_brand || null,
      data.ac_type || null,
      data.problem_description || null,
      data.total_price || null
    );

    return Booking.findById(result.lastInsertRowid);
  }

  /**
   * Find booking by ID with service and technician info
   * @param {number} id
   * @returns {object|undefined}
   */
  static findById(id) {
    const stmt = db.prepare(`
      SELECT b.*, s.name as service_name, s.slug as service_slug,
             u.name as technician_name
      FROM bookings b
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN users u ON b.technician_id = u.id
      WHERE b.id = ?
    `);
    return stmt.get(id);
  }

  /**
   * Find booking by reference code
   * @param {string} referenceCode
   * @returns {object|undefined}
   */
  static findByReference(referenceCode) {
    const stmt = db.prepare(`
      SELECT b.*, s.name as service_name, s.slug as service_slug,
             u.name as technician_name
      FROM bookings b
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN users u ON b.technician_id = u.id
      WHERE b.reference_code = ?
    `);
    return stmt.get(referenceCode);
  }

  /**
   * Find all bookings for a customer
   * @param {number} customerId
   * @param {object} options - { page, limit }
   * @returns {object} { bookings, total }
   */
  static findByCustomer(customerId, { page = 1, limit = 20 } = {}) {
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM bookings WHERE customer_id = ?');
    const { total } = countStmt.get(customerId);

    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT b.*, s.name as service_name, s.slug as service_slug,
             u.name as technician_name
      FROM bookings b
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN users u ON b.technician_id = u.id
      WHERE b.customer_id = ?
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const bookings = stmt.all(customerId, limit, offset);

    return { bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get all bookings with optional filters
   * @param {object} options - { status, page, limit }
   * @returns {object} { bookings, total }
   */
  static getAll({ status, page = 1, limit = 20 } = {}) {
    let whereClause = '';
    const params = [];

    if (status) {
      whereClause = 'WHERE b.status = ?';
      params.push(status);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM bookings b ${whereClause}`);
    const { total } = countStmt.get(...params);

    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT b.*, s.name as service_name, s.slug as service_slug,
             u.name as technician_name
      FROM bookings b
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN users u ON b.technician_id = u.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const bookings = stmt.all(...params, limit, offset);

    return { bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Update booking fields
   * @param {number} id
   * @param {object} data - Fields to update
   * @returns {object} Updated booking
   */
  static update(id, data) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'customer_name', 'customer_email', 'customer_phone',
      'address', 'city', 'preferred_date', 'preferred_time',
      'ac_brand', 'ac_type', 'problem_description',
      'status', 'technician_id', 'admin_notes', 'total_price'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return Booking.findById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const stmt = db.prepare(`UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return Booking.findById(id);
  }

  /**
   * Update booking status
   * @param {number} id
   * @param {string} status
   * @param {string} adminNotes - Optional notes
   * @returns {object} Updated booking
   */
  static updateStatus(id, status, adminNotes) {
    const data = { status };
    if (adminNotes !== undefined) data.admin_notes = adminNotes;
    return Booking.update(id, data);
  }

  /**
   * Assign a technician to a booking
   * @param {number} bookingId
   * @param {number} technicianId
   * @returns {object} Updated booking
   */
  static assignTechnician(bookingId, technicianId) {
    return Booking.update(bookingId, {
      technician_id: technicianId,
      status: 'assigned',
    });
  }

  /**
   * Get booking statistics
   * @returns {object} Stats object
   */
  static getStats() {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM bookings');
    const pendingStmt = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'");
    const confirmedStmt = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'");
    const assignedStmt = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'assigned'");
    const inProgressStmt = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'in_progress'");
    const completedStmt = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'");
    const cancelledStmt = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'cancelled'");
    const revenueStmt = db.prepare("SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status = 'completed'");

    const recentStmt = db.prepare(`
      SELECT b.*, s.name as service_name
      FROM bookings b
      LEFT JOIN services s ON b.service_id = s.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    return {
      total: totalStmt.get().count,
      pending: pendingStmt.get().count,
      confirmed: confirmedStmt.get().count,
      assigned: assignedStmt.get().count,
      in_progress: inProgressStmt.get().count,
      completed: completedStmt.get().count,
      cancelled: cancelledStmt.get().count,
      total_revenue: revenueStmt.get().total,
      recent: recentStmt.all(),
    };
  }
}

module.exports = Booking;
