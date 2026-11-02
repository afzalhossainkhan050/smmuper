const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { contactRules, handleValidationErrors } = require('../middleware/validate');

// Public route
router.post('/', contactRules, handleValidationErrors, contactController.submitContact);

// Admin routes
router.get('/', verifyToken, isAdmin, contactController.getAllMessages);
router.put('/:id/read', verifyToken, isAdmin, contactController.markMessageRead);
router.delete('/:id', verifyToken, isAdmin, contactController.deleteMessage);

module.exports = router;
