const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, isAdmin, optionalAuth } = require('../middleware/auth');
const { bookingRules, handleValidationErrors } = require('../middleware/validate');

// Public routes
router.post('/', optionalAuth, bookingRules, handleValidationErrors, bookingController.createBooking);
router.get('/status/:referenceCode', bookingController.getStatusByReference);

// Customer routes
router.get('/my', verifyToken, bookingController.getMyBookings);

// Admin routes
router.get('/', verifyToken, isAdmin, bookingController.getAllBookings);
router.put('/:id/status', verifyToken, isAdmin, bookingController.updateStatus);
router.put('/:id/assign', verifyToken, isAdmin, bookingController.assignTechnician);
router.put('/:id/reschedule', verifyToken, isAdmin, bookingController.rescheduleBooking);

module.exports = router;
