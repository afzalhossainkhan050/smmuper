const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  businessName: process.env.BUSINESS_NAME || 'CoolAir Pro Services',
  businessPhone: process.env.BUSINESS_PHONE || '+1-555-123-4567',
  businessEmail: process.env.BUSINESS_EMAIL || 'info@coolairpro.com',
  businessAddress: process.env.BUSINESS_ADDRESS || '123 Main Street, Suite 100',
  businessCity: process.env.BUSINESS_CITY || 'New York',
  businessWhatsapp: process.env.BUSINESS_WHATSAPP || '15551234567',
  dbPath: path.join(__dirname, '..', 'data', 'database.sqlite'),
  uploadsDir: path.join(__dirname, '..', 'uploads'),
};

module.exports = config;
