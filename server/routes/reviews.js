const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken, isAdmin, optionalAuth } = require('../middleware/auth');
const { reviewRules, handleValidationErrors } = require('../middleware/validate');

// Public routes
router.get('/', reviewController.getReviews);
router.post('/', optionalAuth, reviewController.createReview);

// Admin routes
router.get('/admin', verifyToken, isAdmin, reviewController.getAllReviewsAdmin);
router.put('/:id/approve', verifyToken, isAdmin, reviewController.toggleApproval);
router.delete('/:id', verifyToken, isAdmin, reviewController.deleteReview);

module.exports = router;
