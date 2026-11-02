const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');

/**
 * Create a new appointment booking
 */
async function createBooking(req, res) {
  try {
    const {
      service_id,
      customer_name,
      customer_email,
      customer_phone,
      address,
      city,
      preferred_date,
      preferred_time,
      ac_brand,
      ac_type,
      problem_description,
      total_price,
    } = req.body;

    const service = Service.findById(service_id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Selected AC service does not exist.',
      });
    }

    // Attach logged in customer ID if available
    const customerId = req.user ? req.user.id : null;

    // Default price to service starting price if not specified
    const price = total_price !== undefined ? parseFloat(total_price) : service.price_starting;

    const booking = Booking.create({
      service_id: parseInt(service_id, 10),
      customer_id: customerId,
      customer_name,
      customer_email,
      customer_phone,
      address,
      city: city || null,
      preferred_date,
      preferred_time,
      ac_brand: ac_brand || null,
      ac_type: ac_type || null,
      problem_description: problem_description || null,
      total_price: price,
    });

    return res.status(201).json({
      success: true,
      message: 'Booking submitted successfully. Your request is pending confirmation.',
      data: {
        id: booking.id,
        reference_code: booking.reference_code,
        status: booking.status,
        service_name: booking.service_name,
        preferred_date: booking.preferred_date,
        preferred_time: booking.preferred_time,
        customer_name: booking.customer_name,
        total_price: booking.total_price,
      },
    });
  } catch (error) {
    console.error('createBooking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create booking.',
      error: error.message,
    });
  }
}

/**
 * Public search for booking status by Reference Code
 */
async function getStatusByReference(req, res) {
  try {
    const { referenceCode } = req.params;
    const cleanRef = referenceCode.trim().toUpperCase();

    const booking = Booking.findByReference(cleanRef);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking found matching reference "${cleanRef}". Please check your code.`,
      });
    }

    // Include technician info if assigned
    let technician = null;
    if (booking.technician_id) {
      const techUser = User.findById(booking.technician_id);
      if (techUser) {
        technician = {
          name: techUser.name,
          phone: techUser.phone,
        };
      }
    }

    return res.json({
      success: true,
      data: {
        ...booking,
        technician,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch booking status.',
      error: error.message,
    });
  }
}

/**
 * Get all bookings for the logged-in customer
 */
async function getMyBookings(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = Booking.findByCustomer(req.user.id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your bookings.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Get all bookings with filtering and pagination
 */
async function getAllBookings(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = Booking.getAll({
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings for admin.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Update booking status and optional notes
 */
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, admin_notes, total_price } = req.body;

    const existing = Booking.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const updatePayload = {};
    if (status) updatePayload.status = status;
    if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes;
    if (total_price !== undefined) updatePayload.total_price = parseFloat(total_price);

    const updated = Booking.update(id, updatePayload);

    return res.json({
      success: true,
      message: `Booking status updated to ${status}.`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update booking status.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Assign technician to booking
 */
async function assignTechnician(req, res) {
  try {
    const { id } = req.params;
    const { technician_id } = req.body;

    const existing = Booking.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const techUser = User.findById(technician_id);
    if (!techUser || techUser.role !== 'technician') {
      return res.status(400).json({
        success: false,
        message: 'Invalid technician ID.',
      });
    }

    const updated = Booking.assignTechnician(id, technician_id);

    return res.json({
      success: true,
      message: `Technician ${techUser.name} assigned to booking ${updated.reference_code}.`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to assign technician.',
      error: error.message,
    });
  }
}

/**
 * Reschedule booking date & time
 */
async function rescheduleBooking(req, res) {
  try {
    const { id } = req.params;
    const { preferred_date, preferred_time } = req.body;

    if (!preferred_date || !preferred_time) {
      return res.status(400).json({
        success: false,
        message: 'Both preferred date and time are required for rescheduling.',
      });
    }

    const existing = Booking.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const updated = Booking.update(id, {
      preferred_date,
      preferred_time,
      status: 'confirmed',
    });

    return res.json({
      success: true,
      message: 'Booking appointment rescheduled successfully.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reschedule booking.',
      error: error.message,
    });
  }
}

module.exports = {
  createBooking,
  getStatusByReference,
  getMyBookings,
  getAllBookings,
  updateStatus,
  assignTechnician,
  rescheduleBooking,
};
