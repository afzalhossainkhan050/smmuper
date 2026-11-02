const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Public route
router.get('/', technicianController.getTechnicians);

// Admin routes
router.post('/', verifyToken, isAdmin, technicianController.createTechnician);
router.put('/:id', verifyToken, isAdmin, technicianController.updateTechnician);
router.delete('/:id', verifyToken, isAdmin, technicianController.deleteTechnician);

module.exports = router;
