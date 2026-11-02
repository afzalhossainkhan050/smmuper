const Technician = require('../models/Technician');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * Get public list of technicians / team members
 */
async function getTechnicians(req, res) {
  try {
    const { available_only } = req.query;
    let data;

    if (available_only === 'true') {
      data = Technician.getAvailable();
    } else {
      const result = Technician.getAll({ limit: 50 });
      data = result.technicians;
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('getTechnicians error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch technicians.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Create a new technician user and profile
 */
async function createTechnician(req, res) {
  try {
    const {
      name,
      email,
      phone,
      password,
      specialization,
      experience_years,
      bio,
      photo_url,
    } = req.body;

    const existingUser = User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const user = User.create({
      name,
      email,
      phone,
      password: password || 'Tech@123',
      role: 'technician',
    });

    const profile = Technician.create({
      user_id: user.id,
      specialization,
      experience_years: experience_years ? parseInt(experience_years, 10) : 0,
      bio,
      photo_url: photo_url || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80',
      is_available: 1,
      rating: 5.0,
      jobs_completed: 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Technician added successfully.',
      data: {
        ...profile,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create technician.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Update technician profile and availability
 */
async function updateTechnician(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      specialization,
      experience_years,
      bio,
      photo_url,
      is_available,
      rating,
      jobs_completed,
    } = req.body;

    const existing = Technician.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found.',
      });
    }

    if (name || phone) {
      User.update(existing.user_id, { name, phone });
    }

    const updated = Technician.update(id, {
      specialization,
      experience_years: experience_years !== undefined ? parseInt(experience_years, 10) : undefined,
      bio,
      photo_url,
      is_available,
      rating: rating !== undefined ? parseFloat(rating) : undefined,
      jobs_completed: jobs_completed !== undefined ? parseInt(jobs_completed, 10) : undefined,
    });

    return res.json({
      success: true,
      message: 'Technician profile updated.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update technician.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Delete technician
 */
async function deleteTechnician(req, res) {
  try {
    const { id } = req.params;
    const existing = Technician.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found.',
      });
    }

    Technician.delete(id);
    return res.json({
      success: true,
      message: 'Technician removed successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete technician.',
      error: error.message,
    });
  }
}

module.exports = {
  getTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
};
