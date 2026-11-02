const Review = require('../models/Review');
const Booking = require('../models/Booking');

/**
 * Get approved customer reviews with summary stats
 */
async function getReviews(req, res) {
  try {
    const { service_id, limit = 20 } = req.query;
    let reviews;

    if (service_id) {
      reviews = Review.findByService(parseInt(service_id, 10), true);
    } else {
      reviews = Review.getApproved({ limit: parseInt(limit, 10) });
    }

    const stats = Review.getAverageRating();

    return res.json({
      success: true,
      data: {
        reviews,
        stats,
      },
    });
  } catch (error) {
    console.error('getReviews error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews.',
      error: error.message,
    });
  }
}

/**
 * Submit a customer review
 */
async function createReview(req, res) {
  try {
    const { booking_id, reference_code, service_id, rating, comment, customer_name } = req.body;

    let targetBookingId = booking_id;
    let targetServiceId = service_id;
    let name = customer_name;

    if (reference_code && !targetBookingId) {
      const booking = Booking.findByReference(reference_code);
      if (booking) {
        targetBookingId = booking.id;
        targetServiceId = targetServiceId || booking.service_id;
        name = name || booking.customer_name;
      }
    }

    if (!targetBookingId) {
      return res.status(400).json({
        success: false,
        message: 'A valid Booking ID or Reference Code is required to submit a review.',
      });
    }

    const review = Review.create({
      customer_id: req.user ? req.user.id : null,
      booking_id: parseInt(targetBookingId, 10),
      service_id: targetServiceId ? parseInt(targetServiceId, 10) : null,
      rating: parseInt(rating, 10),
      comment,
      customer_name: name || (req.user ? req.user.name : 'Valued Customer'),
    });

    // Auto-approve review for smooth demo experience
    Review.approve(review.id, true);

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been submitted and published.',
      data: review,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to submit review.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Get all reviews with approval filters
 */
async function getAllReviewsAdmin(req, res) {
  try {
    const { is_approved, page = 1, limit = 20 } = req.query;
    const result = Review.getAll({
      is_approved: is_approved !== undefined ? is_approved === 'true' || is_approved === '1' : undefined,
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
      message: 'Failed to fetch reviews for admin.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Approve or hide review
 */
async function toggleApproval(req, res) {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const existing = Review.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    const updated = Review.approve(id, approved !== undefined ? approved : !existing.is_approved);

    return res.json({
      success: true,
      message: `Review ${updated.is_approved ? 'approved' : 'hidden'} successfully.`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update review status.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Delete review
 */
async function deleteReview(req, res) {
  try {
    const { id } = req.params;
    const existing = Review.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    Review.delete(id);
    return res.json({
      success: true,
      message: 'Review deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete review.',
      error: error.message,
    });
  }
}

module.exports = {
  getReviews,
  createReview,
  getAllReviewsAdmin,
  toggleApproval,
  deleteReview,
};
