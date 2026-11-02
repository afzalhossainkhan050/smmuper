const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Admin route
router.get('/stats', verifyToken, isAdmin, dashboardController.getDashboardStats);

module.exports = router;
