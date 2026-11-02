const Settings = require('../models/Settings');

/**
 * Get all public website & business settings
 */
async function getSettings(req, res) {
  try {
    const settings = Settings.getAll();
    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('getSettings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch site settings.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Update website & business settings
 */
async function updateSettings(req, res) {
  try {
    const settingsData = req.body;
    if (!settingsData || typeof settingsData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings payload.',
      });
    }

    const updated = Settings.setBulk(settingsData);
    return res.json({
      success: true,
      message: 'Website settings updated successfully.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings.',
      error: error.message,
    });
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
