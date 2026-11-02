const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * GET /api/system/config
 * Public system settings, branding, active currencies, and platforms
 */
router.get('/config', (req, res) => {
  try {
    const rawSettings = db.prepare('SELECT key, value, group_name FROM system_settings').all();
    const settings = {};
    for (const s of rawSettings) {
      settings[s.key] = s.value;
    }

    const currencies = db.prepare("SELECT id, name, code, symbol, exchange_rate, is_default FROM currencies WHERE status = 'active'").all();
    const platforms = db.prepare("SELECT id, name, icon, slug FROM social_media WHERE status = 'active' ORDER BY sort_order ASC").all();
    const notice = db.prepare("SELECT id, title, description, created_at FROM notices WHERE status = 'active' ORDER BY id DESC LIMIT 1").get() || null;

    return successResponse(res, {
      brand: {
        name: settings.site_name || 'SMMuper',
        title: settings.site_title || 'SMMuper – #1 Best & Cheapest Social Media Marketing SaaS Panel',
        domain: settings.domain || 'https://smmuper.com',
        contact_email: settings.contact_email || 'support@smmuper.com',
        primary_color: settings.primary_color || '#6366F1',
        currency_code: settings.currency_code || 'USD',
        currency_symbol: settings.currency_symbol || '$',
        maintenance_mode: settings.maintenance_mode === '1',
      },
      currencies,
      defaultCurrency: currencies.find(c => c.is_default === 1) || currencies[0] || { code: 'USD', symbol: '$', exchange_rate: 1.0 },
      platforms,
      notice,
      version: '1.0.0',
    }, 'System configuration loaded');
  } catch (error) {
    console.error('System config error:', error);
    return errorResponse(res, 'Failed to fetch system configuration.', 500);
  }
});

/**
 * GET /api/system/currencies
 */
router.get('/currencies', (req, res) => {
  try {
    const currencies = db.prepare("SELECT * FROM currencies WHERE status = 'active' ORDER BY is_default DESC, name ASC").all();
    return successResponse(res, { currencies }, 'Currencies fetched');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch currencies.', 500);
  }
});

/**
 * GET /api/system/notice
 */
router.get('/notice', (req, res) => {
  try {
    const notices = db.prepare("SELECT * FROM notices WHERE status = 'active' ORDER BY id DESC").all();
    return successResponse(res, { notices }, 'Notices fetched');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch notices.', 500);
  }
});

module.exports = router;
