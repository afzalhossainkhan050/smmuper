const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Public route
router.get('/', settingsController.getSettings);

// Admin route
router.put('/', verifyToken, isAdmin, settingsController.updateSettings);

module.exports = router;
