const Booking = require('../models/Booking');
const Contact = require('../models/Contact');
const Review = require('../models/Review');
const Service = require('../models/Service');
const Technician = require('../models/Technician');
const User = require('../models/User');

/**
 * (Admin) Get comprehensive dashboard metrics & overview
 */
async function getDashboardStats(req, res) {
  try {
    const bookingStats = Booking.getStats();
    const unreadMessages = Contact.getUnreadCount();
    const reviewStats = Review.getAverageRating();
    const allReviews = Review.getAll({ limit: 1 });
    const pendingReviewsCount = Review.getAll({ is_approved: false, limit: 1 }).total;
    const services = Service.getAll({ limit: 100 });
    const technicians = Technician.getAll({ limit: 100 });
    const recentContacts = Contact.getAll({ limit: 5 });

    return res.json({
      success: true,
      data: {
        bookings: {
          total: bookingStats.total,
          pending: bookingStats.pending,
          confirmed: bookingStats.confirmed,
          assigned: bookingStats.assigned,
          in_progress: bookingStats.in_progress,
          completed: bookingStats.completed,
          cancelled: bookingStats.cancelled,
          total_revenue: bookingStats.total_revenue,
          recent: bookingStats.recent,
        },
        services_count: services.total,
        technicians_count: technicians.total,
        unread_messages: unreadMessages,
        pending_reviews: pendingReviewsCount,
        rating_summary: reviewStats,
        recent_contacts: recentContacts.messages,
      },
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics.',
      error: error.message,
    });
  }
}

module.exports = {
  getDashboardStats,
};
