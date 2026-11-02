const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const rawDbPath = process.env.DB_PATH || 'smm_uper.db';
const dbPath = path.isAbsolute(rawDbPath)
  ? rawDbPath
  : path.resolve(__dirname, path.basename(rawDbPath));

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for high concurrency & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Safe column addition helper
function safeAddColumn(table, columnDefinition) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDefinition}`);
  } catch (err) {
    // Column already exists or table doesn't support alter
  }
}

// ---------- 1. CORE SYSTEM TABLES ----------

db.exec(`
  -- Users & Accounts
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    balance REAL DEFAULT 0.00,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'staff')),
    api_key TEXT UNIQUE,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'banned', 'inactive')),
    avatar TEXT DEFAULT NULL,
    phone TEXT DEFAULT NULL,
    address TEXT DEFAULT NULL,
    two_factor_enabled INTEGER DEFAULT 0,
    two_factor_secret TEXT DEFAULT NULL,
    email_verified INTEGER DEFAULT 1,
    referral_code TEXT UNIQUE,
    referred_by INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Roles & Permissions
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    permissions TEXT DEFAULT '[]', -- JSON array of granted permission keys
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Staff Members
  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    role_id INTEGER NOT NULL,
    designation TEXT DEFAULT 'Support Staff',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
  );

  -- Admin Activity Logs
  CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT NOT NULL,
    ip_address TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    details TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
  );

  -- Global System Settings
  CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT DEFAULT '',
    group_name TEXT DEFAULT 'general',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Currencies
  CREATE TABLE IF NOT EXISTS currencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL,
    exchange_rate REAL DEFAULT 1.0,
    is_default INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Social Media Platforms
  CREATE TABLE IF NOT EXISTS social_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT 'share-2',
    slug TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Categories
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    social_media_id INTEGER DEFAULT NULL,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📦',
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (social_media_id) REFERENCES social_media(id) ON DELETE SET NULL
  );

  -- Multi-Provider API Integrations
  CREATE TABLE IF NOT EXISTS api_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    api_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    balance REAL DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    last_synced_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Provider Logs
  CREATE TABLE IF NOT EXISTS provider_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    request_data TEXT DEFAULT '',
    response_data TEXT DEFAULT '',
    status_code INTEGER DEFAULT 200,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES api_providers(id) ON DELETE CASCADE
  );

  -- Services
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    provider_id INTEGER DEFAULT NULL,
    provider_service_id TEXT DEFAULT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    rate REAL NOT NULL,
    original_rate REAL DEFAULT 0.00,
    min_quantity INTEGER NOT NULL DEFAULT 100,
    max_quantity INTEGER NOT NULL DEFAULT 10000,
    type TEXT DEFAULT 'default' CHECK(type IN ('default', 'package', 'custom_comments', 'subscriptions')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    avg_time TEXT DEFAULT '0-1 hours',
    dripfeed INTEGER DEFAULT 0,
    refill INTEGER DEFAULT 0,
    cancel INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES api_providers(id) ON DELETE SET NULL
  );

  -- Orders
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    provider_id INTEGER DEFAULT NULL,
    provider_order_id TEXT DEFAULT NULL,
    link TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    charge REAL NOT NULL,
    cost REAL DEFAULT 0.00,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'in_progress', 'completed', 'partial', 'cancelled', 'refunded', 'failed')),
    start_count INTEGER DEFAULT 0,
    remains INTEGER DEFAULT 0,
    refill_status TEXT DEFAULT 'none' CHECK(refill_status IN ('none', 'requested', 'refilling', 'completed', 'rejected')),
    cancel_status TEXT DEFAULT 'none' CHECK(cancel_status IN ('none', 'requested', 'cancelled', 'rejected')),
    error_message TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES api_providers(id) ON DELETE SET NULL
  );

  -- Payment Methods
  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'manual' CHECK(type IN ('automatic', 'manual')),
    icon TEXT DEFAULT '',
    currency TEXT DEFAULT 'USD',
    min_amount REAL DEFAULT 1.00,
    max_amount REAL DEFAULT 10000.00,
    percentage_charge REAL DEFAULT 0.00,
    fixed_charge REAL DEFAULT 0.00,
    exchange_rate REAL DEFAULT 1.00,
    instructions TEXT DEFAULT '',
    parameters TEXT DEFAULT '{}', -- JSON credentials / account details
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Payments / Deposits
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    payment_method_id INTEGER DEFAULT NULL,
    amount REAL NOT NULL,
    local_amount REAL DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    charge REAL DEFAULT 0.00,
    rate REAL DEFAULT 1.00,
    method TEXT NOT NULL,
    transaction_id TEXT UNIQUE,
    payment_proof TEXT DEFAULT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'rejected', 'refunded')),
    notes TEXT DEFAULT '',
    admin_feedback TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
  );

  -- Immutable Financial Ledger
  CREATE TABLE IF NOT EXISTS financial_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('deposit', 'order_charge', 'order_refund', 'order_partial_refund', 'referral_commission', 'manual_credit', 'manual_debit')),
    amount REAL NOT NULL,
    balance_before REAL NOT NULL,
    balance_after REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    reference_id TEXT DEFAULT NULL,
    reference_type TEXT DEFAULT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Support Tickets
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_id INTEGER DEFAULT NULL,
    order_id INTEGER DEFAULT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'answered', 'replied', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Ticket Replies
  CREATE TABLE IF NOT EXISTS ticket_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    is_admin INTEGER DEFAULT 0,
    message TEXT NOT NULL,
    attachment TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Notices
  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT DEFAULT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- KYC Settings
  CREATE TABLE IF NOT EXISTS kyc_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    fields TEXT NOT NULL DEFAULT '[]', -- JSON schema of required fields
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- KYC Submissions
  CREATE TABLE IF NOT EXISTS kyc_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    kyc_setting_id INTEGER NOT NULL,
    form_data TEXT NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT DEFAULT '',
    reviewed_by INTEGER DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (kyc_setting_id) REFERENCES kyc_settings(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  );

  -- Child Panels
  CREATE TABLE IF NOT EXISTS child_panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    price REAL DEFAULT 25.00,
    currency TEXT DEFAULT 'USD',
    admin_user TEXT NOT NULL,
    admin_password TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'expired', 'suspended')),
    expires_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- CMS Content Sections
  CREATE TABLE IF NOT EXISTS cms_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_name TEXT NOT NULL UNIQUE,
    content_json TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Blog Categories
  CREATE TABLE IF NOT EXISTS blog_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Blog Authors
  CREATE TABLE IF NOT EXISTS blog_authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT DEFAULT '',
    about TEXT DEFAULT '',
    image TEXT DEFAULT NULL,
    social_links TEXT DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Blogs
  CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    author_id INTEGER DEFAULT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    image TEXT DEFAULT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    views_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES blog_authors(id) ON DELETE SET NULL
  );

  -- Newsletter Subscribers
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Email Templates
  CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    shortcodes TEXT DEFAULT '[[username]], [[email]], [[site_name]]',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Push Notification Templates
  CREATE TABLE IF NOT EXISTS notification_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    shortcodes TEXT DEFAULT '[[username]], [[site_name]]',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Order Refill Requests
  CREATE TABLE IF NOT EXISTS order_refills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    provider_id INTEGER DEFAULT NULL,
    provider_order_id TEXT DEFAULT NULL,
    provider_refill_id TEXT DEFAULT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'refilling', 'completed', 'rejected')),
    reason TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES api_providers(id) ON DELETE SET NULL
  );

  -- System Addons
  CREATE TABLE IF NOT EXISTS addons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    version TEXT DEFAULT '1.0.0',
    icon TEXT DEFAULT 'puzzle',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Referral Commissions (Phase 6)
  CREATE TABLE IF NOT EXISTS referral_commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_user_id INTEGER NOT NULL,
    order_id INTEGER DEFAULT NULL,
    deposit_id INTEGER DEFAULT NULL,
    commission_amount REAL NOT NULL,
    commission_rate REAL NOT NULL DEFAULT 5.0,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'credited' CHECK(status IN ('pending', 'credited', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (deposit_id) REFERENCES payments(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_referral_referrer ON referral_commissions(referrer_id);
  CREATE INDEX IF NOT EXISTS idx_referral_referred ON referral_commissions(referred_user_id);

  -- Website Custom Pages (Phase 7)
  CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    meta_title TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',
    meta_keywords TEXT DEFAULT '',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Website Menus (Phase 7)
  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT NOT NULL DEFAULT 'header' CHECK(location IN ('header', 'footer')),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    target TEXT DEFAULT '_self',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ---------- 2. MIGRATION OF MISSING COLUMNS ON EXISTING TABLES ----------
safeAddColumn('users', 'phone TEXT DEFAULT NULL');
safeAddColumn('users', 'address TEXT DEFAULT NULL');
safeAddColumn('users', 'two_factor_enabled INTEGER DEFAULT 0');
safeAddColumn('users', 'two_factor_secret TEXT DEFAULT NULL');
safeAddColumn('users', 'email_verified INTEGER DEFAULT 1');
safeAddColumn('users', 'referral_code TEXT DEFAULT NULL');
safeAddColumn('users', 'referred_by INTEGER DEFAULT NULL');

safeAddColumn('categories', 'social_media_id INTEGER DEFAULT NULL');
safeAddColumn('categories', 'updated_at DATETIME DEFAULT NULL');

safeAddColumn('services', 'provider_id INTEGER DEFAULT NULL');
safeAddColumn('services', 'provider_service_id TEXT DEFAULT NULL');
safeAddColumn('services', 'original_rate REAL DEFAULT 0.00');
safeAddColumn('services', 'cancel INTEGER DEFAULT 0');
safeAddColumn('services', 'sort_order INTEGER DEFAULT 0');

safeAddColumn('orders', 'provider_id INTEGER DEFAULT NULL');
safeAddColumn('orders', 'provider_order_id TEXT DEFAULT NULL');
safeAddColumn('orders', 'cost REAL DEFAULT 0.00');
safeAddColumn('orders', "refill_status TEXT DEFAULT 'none'");
safeAddColumn('orders', "cancel_status TEXT DEFAULT 'none'");
safeAddColumn('orders', 'error_message TEXT DEFAULT NULL');

safeAddColumn('payments', 'payment_method_id INTEGER DEFAULT NULL');
safeAddColumn('payments', 'local_amount REAL DEFAULT 0.00');
safeAddColumn('payments', "currency TEXT DEFAULT 'USD'");
safeAddColumn('payments', 'charge REAL DEFAULT 0.00');
safeAddColumn('payments', 'rate REAL DEFAULT 1.00');
safeAddColumn('payments', 'payment_proof TEXT DEFAULT NULL');
safeAddColumn('payments', "admin_feedback TEXT DEFAULT ''");
safeAddColumn('payments', 'reviewed_by INTEGER DEFAULT NULL');
safeAddColumn('payments', 'reviewed_at DATETIME DEFAULT NULL');
safeAddColumn('payments', "payer_details TEXT DEFAULT '{}'");
safeAddColumn('payments', 'updated_at DATETIME DEFAULT NULL');

safeAddColumn('tickets', 'service_id INTEGER DEFAULT NULL');
safeAddColumn('tickets', 'order_id INTEGER DEFAULT NULL');

safeAddColumn('ticket_replies', 'is_admin INTEGER DEFAULT 0');
safeAddColumn('ticket_replies', 'attachment TEXT DEFAULT NULL');

safeAddColumn('blog_authors', 'slug TEXT DEFAULT NULL');
safeAddColumn('blog_authors', 'updated_at DATETIME DEFAULT NULL');

safeAddColumn('api_providers', 'conversion_rate REAL DEFAULT 1.0');
safeAddColumn('api_providers', 'description TEXT DEFAULT ""');

// ---------- 3. INDEXES FOR HIGH-THROUGHPUT PERFORMANCE ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS order_refills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    provider_id INTEGER DEFAULT NULL,
    provider_order_id TEXT DEFAULT NULL,
    provider_refill_id TEXT DEFAULT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'refilling', 'completed', 'rejected')),
    reason TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES api_providers(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_order_refills_order_id ON order_refills(order_id);
  CREATE INDEX IF NOT EXISTS idx_order_refills_user_id ON order_refills(user_id);
  CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
  CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
  CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
  CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
  CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
  CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_ledger_user ON financial_ledger(user_id);
  CREATE INDEX IF NOT EXISTS idx_admin_logs ON admin_activity_logs(admin_id);
`);

// ---------- Google Sign-In support ----------
safeAddColumn('users', 'google_id TEXT DEFAULT NULL');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL');

module.exports = db;
