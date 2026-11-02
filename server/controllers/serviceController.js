const Service = require('../models/Service');
const { slugify } = require('../utils/helpers');

/**
 * Get active services for customers
 */
async function getServices(req, res) {
  try {
    const { category } = req.query;
    const services = Service.getActive(category);
    return res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('getServices error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch services.',
      error: error.message,
    });
  }
}

/**
 * Get service by slug
 */
async function getServiceBySlug(req, res) {
  try {
    const { slug } = req.params;
    const service = Service.findBySlug(slug);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.',
      });
    }

    return res.json({
      success: true,
      data: service,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch service.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Get all services with pagination
 */
async function getAllServicesAdmin(req, res) {
  try {
    const { category, page = 1, limit = 50 } = req.query;
    const result = Service.getAll({
      category,
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
      message: 'Failed to fetch services for admin.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Create a new service
 */
async function createService(req, res) {
  try {
    const {
      name,
      slug,
      short_description,
      description,
      icon,
      price_starting,
      price_label,
      duration,
      category,
      is_active,
      display_order,
    } = req.body;

    const existingSlug = Service.findBySlug(slug || slugify(name));
    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: 'A service with this name or slug already exists.',
      });
    }

    const service = Service.create({
      name,
      slug: slug || slugify(name),
      short_description,
      description,
      icon,
      price_starting: price_starting ? parseFloat(price_starting) : null,
      price_label,
      duration,
      category,
      is_active: is_active !== undefined ? is_active : 1,
      display_order: display_order ? parseInt(display_order, 10) : 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      data: service,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create service.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Update an existing service
 */
async function updateService(req, res) {
  try {
    const { id } = req.params;
    const existing = Service.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.',
      });
    }

    const updated = Service.update(id, req.body);
    return res.json({
      success: true,
      message: 'Service updated successfully.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update service.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Delete a service
 */
async function deleteService(req, res) {
  try {
    const { id } = req.params;
    const existing = Service.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.',
      });
    }

    Service.delete(id);
    return res.json({
      success: true,
      message: 'Service deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete service.',
      error: error.message,
    });
  }
}

module.exports = {
  getServices,
  getServiceBySlug,
  getAllServicesAdmin,
  createService,
  updateService,
  deleteService,
};
