const Database = require('better-sqlite3');
const path = require('path');
const config = require('./settings');

// Ensure the data directory exists
const fs = require('fs');
const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(config.dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'admin', 'technician')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    short_description TEXT,
    description TEXT,
    icon TEXT DEFAULT 'snowflake',
    price_starting REAL,
    price_label TEXT DEFAULT 'Starting from',
    duration TEXT,
    category TEXT DEFAULT 'residential' CHECK(category IN ('residential', 'commercial', 'both')),
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_code TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES users(id),
    service_id INTEGER REFERENCES services(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    preferred_date TEXT NOT NULL,
    preferred_time TEXT NOT NULL,
    ac_brand TEXT,
    ac_type TEXT,
    problem_description TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled', 'rejected')),
    technician_id INTEGER REFERENCES users(id),
    admin_notes TEXT,
    total_price REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS technicians_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id),
    specialization TEXT,
    experience_years INTEGER,
    bio TEXT,
    photo_url TEXT,
    is_available INTEGER DEFAULT 1,
    rating REAL DEFAULT 5.0,
    jobs_completed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES users(id),
    booking_id INTEGER REFERENCES bookings(id),
    service_id INTEGER REFERENCES services(id),
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    customer_name TEXT,
    is_approved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Create indexes for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
  CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
  CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference_code);
  CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(service_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved);
  CREATE INDEX IF NOT EXISTS idx_contact_read ON contact_messages(is_read);
  CREATE INDEX IF NOT EXISTS idx_settings_key ON site_settings(setting_key);
`);

module.exports = db;
