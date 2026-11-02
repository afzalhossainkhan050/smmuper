/**
 * SMMuper - Comprehensive Database Seed Script
 * Run with: npm run seed
 * Seeds brand settings, currencies, roles, admin & demo users,
 * social media platforms, categories, services, and payment methods.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = require('./database');

const IS_PROD = process.env.NODE_ENV === 'production';
const SEED_DEMO = process.env.SEED_DEMO === '1' && !IS_PROD;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@smmuper.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (IS_PROD ? '' : 'admin123');
if (IS_PROD && (ADMIN_PASSWORD.length < 12 || ['admin123', 'Admin@123'].includes(ADMIN_PASSWORD))) {
  console.error('FATAL: set ADMIN_PASSWORD (12+ characters, not a default) before seeding in production.');
  process.exit(1);
}

console.log('🌱 Seeding SMMuper database...\n');

// ═══════════════════════════════════════════════════════════
//                  1. SYSTEM SETTINGS
// ═══════════════════════════════════════════════════════════

const settings = [
  { key: 'site_name', value: 'SMMuper', group_name: 'general' },
  { key: 'site_title', value: 'SMMuper – #1 Best & Cheapest Social Media Marketing SaaS Panel', group_name: 'general' },
  { key: 'domain', value: 'https://smmuper.com', group_name: 'general' },
  { key: 'contact_email', value: 'support@smmuper.com', group_name: 'general' },
  { key: 'currency_code', value: 'USD', group_name: 'general' },
  { key: 'currency_symbol', value: '$', group_name: 'general' },
  { key: 'primary_color', value: '#6366F1', group_name: 'theme' },
  { key: 'maintenance_mode', value: '0', group_name: 'system' },
  { key: 'child_panel_monthly_price', value: '25.00', group_name: 'child_panel' },
  { key: 'referral_bonus_percent', value: '5.0', group_name: 'commission' },
];

const insertSetting = db.prepare(
  'INSERT OR IGNORE INTO system_settings (key, value, group_name) VALUES (?, ?, ?)'
);

for (const s of settings) {
  insertSetting.run(s.key, s.value, s.group_name);
}
console.log('✅ System settings seeded');

// ═══════════════════════════════════════════════════════════
//                  2. CURRENCIES
// ═══════════════════════════════════════════════════════════

const currencies = [
  { name: 'US Dollar', code: 'USD', symbol: '$', rate: 1.0, is_default: 1 },
  { name: 'Bangladeshi Taka', code: 'BDT', symbol: '৳', rate: 120.0, is_default: 0 },
  { name: 'Euro', code: 'EUR', symbol: '€', rate: 0.92, is_default: 0 },
  { name: 'British Pound', code: 'GBP', symbol: '£', rate: 0.79, is_default: 0 },
  { name: 'Indian Rupee', code: 'INR', symbol: '₹', rate: 84.5, is_default: 0 },
];

const insertCurrency = db.prepare(
  "INSERT OR IGNORE INTO currencies (name, code, symbol, exchange_rate, is_default, status) VALUES (?, ?, ?, ?, ?, 'active')"
);

for (const c of currencies) {
  insertCurrency.run(c.name, c.code, c.symbol, c.rate, c.is_default);
}
console.log('✅ Currencies seeded');

// ═══════════════════════════════════════════════════════════
//                  3. ROLES & PERMISSIONS
// ═══════════════════════════════════════════════════════════

const roles = [
  {
    name: 'Super Admin',
    description: 'Full uninhibited access to all modules and configurations',
    permissions: JSON.stringify(['*'])
  },
  {
    name: 'Order & Service Manager',
    description: 'Can manage services, provider sync, orders, and refills',
    permissions: JSON.stringify(['orders.*', 'services.*', 'providers.*'])
  },
  {
    name: 'Support Specialist',
    description: 'Can handle tickets, client inquiries, and view users',
    permissions: JSON.stringify(['tickets.*', 'users.view', 'orders.view'])
  },
  {
    name: 'Financial Auditor',
    description: 'Can review payment logs, verify manual transactions, and view ledger',
    permissions: JSON.stringify(['payments.*', 'ledger.view'])
  }
];

const insertRole = db.prepare(
  "INSERT OR IGNORE INTO roles (name, description, permissions, status) VALUES (?, ?, ?, 'active')"
);

for (const r of roles) {
  insertRole.run(r.name, r.description, r.permissions);
}
console.log('✅ Roles seeded');

// ═══════════════════════════════════════════════════════════
//                  4. DEFAULT ACCOUNTS
// ═══════════════════════════════════════════════════════════

// Admin Account
const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);
if (!adminExists) {
  const salt = bcrypt.genSaltSync(12);
  const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, salt);
  const apiKey = 'smm_admin_' + uuidv4().replace(/-/g, '');

  db.prepare(`
    INSERT INTO users (username, email, password, balance, role, api_key, status, referral_code)
    VALUES (?, ?, ?, ?, 'admin', ?, 'active', ?)
  `).run('admin', ADMIN_EMAIL, hashedPassword, IS_PROD ? 0.00 : 1000.00, apiKey, 'ADMIN01');

  console.log('✅ Admin user created: ' + ADMIN_EMAIL);
} else {
  console.log('ℹ️  Admin user already exists');
}

// Demo Customer Account
const demoExists = db.prepare("SELECT id FROM users WHERE email = 'demo@smmuper.com'").get();
if (!demoExists && SEED_DEMO) {
  const salt = bcrypt.genSaltSync(12);
  const hashedPassword = bcrypt.hashSync('demo123', salt);
  const apiKey = 'smm_demo_' + uuidv4().replace(/-/g, '');

  db.prepare(`
    INSERT INTO users (username, email, password, balance, role, api_key, status, referral_code)
    VALUES (?, ?, ?, ?, 'user', ?, 'active', ?)
  `).run('demo', 'demo@smmuper.com', hashedPassword, 50.00, apiKey, 'DEMO99');

  console.log('✅ Demo user created: demo@smmuper.com / demo123');
} else {
  console.log('ℹ️  Demo user already exists');
}

// ═══════════════════════════════════════════════════════════
//                  5. SOCIAL MEDIA PLATFORMS
// ═══════════════════════════════════════════════════════════

const platforms = [
  { name: 'Instagram',       icon: 'instagram',      slug: 'instagram',       sort_order: 1 },
  { name: 'Facebook',        icon: 'facebook',       slug: 'facebook',        sort_order: 2 },
  { name: 'YouTube',         icon: 'youtube',        slug: 'youtube',         sort_order: 3 },
  { name: 'TikTok',          icon: 'music',          slug: 'tiktok',          sort_order: 4 },
  { name: 'Twitter / X',     icon: 'twitter',        slug: 'twitter',         sort_order: 5 },
  { name: 'Telegram',        icon: 'send',           slug: 'telegram',        sort_order: 6 },
  { name: 'Spotify',         icon: 'disc',           slug: 'spotify',         sort_order: 7 },
  { name: 'LinkedIn',        icon: 'linkedin',       slug: 'linkedin',        sort_order: 8 },
  { name: 'Discord',         icon: 'message-square', slug: 'discord',         sort_order: 9 },
  { name: 'Reddit',          icon: 'message-circle', slug: 'reddit',          sort_order: 10 },
  { name: 'Pinterest',       icon: 'image',          slug: 'pinterest',       sort_order: 11 },
  { name: 'Twitch',          icon: 'tv',             slug: 'twitch',          sort_order: 12 },
  { name: 'Threads',         icon: 'at-sign',        slug: 'threads',         sort_order: 13 },
  { name: 'Website Traffic', icon: 'globe',          slug: 'website-traffic', sort_order: 14 },
  { name: 'Snapchat',        icon: 'camera',         slug: 'snapchat',        sort_order: 15 },
  { name: 'SoundCloud',      icon: 'headphones',     slug: 'soundcloud',      sort_order: 16 },
];

const insertSocial = db.prepare(
  "INSERT OR IGNORE INTO social_media (name, icon, slug, sort_order, status) VALUES (?, ?, ?, ?, 'active')"
);

for (const p of platforms) {
  insertSocial.run(p.name, p.icon, p.slug, p.sort_order);
}
console.log('✅ 16 Social Media platforms seeded');

// Map platforms to categories
const ig = db.prepare("SELECT id FROM social_media WHERE slug = 'instagram'").get()?.id;
const fb = db.prepare("SELECT id FROM social_media WHERE slug = 'facebook'").get()?.id;
const yt = db.prepare("SELECT id FROM social_media WHERE slug = 'youtube'").get()?.id;
const tt = db.prepare("SELECT id FROM social_media WHERE slug = 'tiktok'").get()?.id;
const tw = db.prepare("SELECT id FROM social_media WHERE slug = 'twitter'").get()?.id;
const tg = db.prepare("SELECT id FROM social_media WHERE slug = 'telegram'").get()?.id;

// Update existing categories with social_media_id
if (ig) {
  db.prepare("UPDATE categories SET social_media_id = ? WHERE name LIKE '%Instagram%'").run(ig);
}
if (fb) {
  db.prepare("UPDATE categories SET social_media_id = ? WHERE name LIKE '%Facebook%'").run(fb);
}
if (yt) {
  db.prepare("UPDATE categories SET social_media_id = ? WHERE name LIKE '%YouTube%'").run(yt);
}
if (tt) {
  db.prepare("UPDATE categories SET social_media_id = ? WHERE name LIKE '%TikTok%'").run(tt);
}
if (tw) {
  db.prepare("UPDATE categories SET social_media_id = ? WHERE name LIKE '%Twitter%'").run(tw);
}
if (tg) {
  db.prepare("UPDATE categories SET social_media_id = ? WHERE name LIKE '%Telegram%'").run(tg);
}

// ═══════════════════════════════════════════════════════════
//                  6. PAYMENT METHODS
// ═══════════════════════════════════════════════════════════

const paymentMethods = [
  {
    name: 'bKash Personal / Send Money',
    code: 'bkash_manual',
    type: 'manual',
    icon: 'phone',
    currency: 'BDT',
    min_amount: 1.0,
    max_amount: 500.0,
    percentage_charge: 1.5,
    fixed_charge: 0.0,
    exchange_rate: 120.0,
    instructions: 'Send Money to bKash Personal Number: 01700000000. Enter your TrxID and phone number below.',
    sort_order: 1
  },
  {
    name: 'Nagad Personal / Send Money',
    code: 'nagad_manual',
    type: 'manual',
    icon: 'smartphone',
    currency: 'BDT',
    min_amount: 1.0,
    max_amount: 500.0,
    percentage_charge: 1.0,
    fixed_charge: 0.0,
    exchange_rate: 120.0,
    instructions: 'Send Money to Nagad Personal Number: 01800000000. Enter your TrxID below.',
    sort_order: 2
  },
  {
    name: 'Rocket Personal / Send Money',
    code: 'rocket_manual',
    type: 'manual',
    icon: 'send',
    currency: 'BDT',
    min_amount: 1.0,
    max_amount: 500.0,
    percentage_charge: 1.0,
    fixed_charge: 0.0,
    exchange_rate: 120.0,
    instructions: 'Send Money to Rocket Number: 019000000008. Enter your TrxID below.',
    sort_order: 3
  },
  {
    name: 'Binance Pay / USDT (Crypto)',
    code: 'crypto_usdt',
    type: 'manual',
    icon: 'coins',
    currency: 'USD',
    min_amount: 5.0,
    max_amount: 10000.0,
    percentage_charge: 0.0,
    fixed_charge: 0.0,
    exchange_rate: 1.0,
    instructions: 'Send USDT (BEP20 or TRC20) to address: 0x9a8f7c6b5d4e3a2b1c0e9d8c7b6a5f4e3d2c1b0a or Binance Pay ID: 123456789. Submit TX Hash.',
    sort_order: 4
  },
  {
    name: 'Credit / Debit Card (Stripe)',
    code: 'stripe_card',
    type: 'automatic',
    icon: 'credit-card',
    currency: 'USD',
    min_amount: 5.0,
    max_amount: 5000.0,
    percentage_charge: 2.9,
    fixed_charge: 0.30,
    exchange_rate: 1.0,
    instructions: 'Instant automatic deposit via Visa, MasterCard, American Express.',
    sort_order: 5
  },
  {
    name: 'PayPal Express Checkout',
    code: 'paypal',
    type: 'automatic',
    icon: 'credit-card',
    currency: 'USD',
    min_amount: 5.0,
    max_amount: 5000.0,
    percentage_charge: 3.5,
    fixed_charge: 0.40,
    exchange_rate: 1.0,
    instructions: 'Instant automatic deposit via PayPal balance or linked cards.',
    sort_order: 6
  },
  {
    name: 'CoinGate Crypto (BTC / ETH / LTC)',
    code: 'coingate',
    type: 'automatic',
    icon: 'coins',
    currency: 'USD',
    min_amount: 10.0,
    max_amount: 20000.0,
    percentage_charge: 1.0,
    fixed_charge: 0.0,
    exchange_rate: 1.0,
    instructions: 'Automatic deposit supporting Bitcoin, Ethereum, Litecoin, and 50+ cryptocurrencies.',
    sort_order: 7
  },
  {
    name: 'Bank Wire / Local Bank Transfer',
    code: 'bank_transfer',
    type: 'manual',
    icon: 'landmark',
    currency: 'USD',
    min_amount: 50.0,
    max_amount: 50000.0,
    percentage_charge: 0.0,
    fixed_charge: 0.0,
    exchange_rate: 1.0,
    instructions: 'Direct bank transfer. Bank: City Bank, A/C: 1102938475001, Branch: Gulshan, Dhaka. Attach transfer slip receipt.',
    sort_order: 8
  }
];

const insertMethod = db.prepare(`
  INSERT OR IGNORE INTO payment_methods 
  (name, code, type, icon, currency, min_amount, max_amount, percentage_charge, fixed_charge, exchange_rate, instructions, status, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
`);

for (const m of paymentMethods) {
  insertMethod.run(
    m.name, m.code, m.type, m.icon, m.currency, m.min_amount, m.max_amount,
    m.percentage_charge, m.fixed_charge, m.exchange_rate, m.instructions, m.sort_order
  );
}
console.log('✅ Payment methods seeded');

// ═══════════════════════════════════════════════════════════
//                  7. BROADCAST NOTICE
// ═══════════════════════════════════════════════════════════

const noticeCount = db.prepare('SELECT COUNT(*) as c FROM notices').get().c;
if (noticeCount === 0) {
  const insertNotice = db.prepare(`
    INSERT INTO notices (title, description, status)
    VALUES (?, ?, 'active')
  `);
  insertNotice.run(
    'What is an SMM Panel Reseller?',
    '<p>An SMM (Social Media Marketing) Panel Reseller platform enables entrepreneurs and agencies to sell social media engagement services—such as followers, likes, comments, and views—directly to clients while automating fulfillment through wholesale APIs.</p>'
  );
  insertNotice.run(
    'How Does It Work?',
    '<p>When a client places an order on SMMuper, our intelligent order dispatcher automatically checks wallet balance, validates inputs, and hands the order off to high-speed API providers with real-time status and refill tracking.</p>'
  );
  insertNotice.run(
    'Welcome to SMMuper Platform!',
    '<p>Enjoy wholesale pricing, high-speed automated delivery across Instagram, Facebook, TikTok, YouTube & Telegram, with 24/7 client support and multi-currency billing.</p>'
  );
  console.log('✅ Notices seeded successfully');
}

// ═══════════════════════════════════════════════════════════
//                  7B. BLOG AUTHORS
// ═══════════════════════════════════════════════════════════

const authorCount = db.prepare('SELECT COUNT(*) as c FROM blog_authors').get().c;
if (authorCount === 0) {
  const insertAuthor = db.prepare(`
    INSERT INTO blog_authors (name, address, slug, about, social_links, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);
  insertAuthor.run(
    'Hermione Granger',
    'Dublin, Ireland',
    'hermione-granger',
    'Passionate about transforming complex ideas into engaging stories, Hermione Granger is a skilled blog writer with a knack for creating content that resonates with readers. A voracious reader and meticulous researcher, they have a talent for weaving facts into compelling narratives that inform and enchant.',
    JSON.stringify([
      { name: 'Facebook', icon: 'facebook', link: 'https://facebook.com/' },
      { name: 'Twitter', icon: 'twitter', link: 'https://x.com/' },
      { name: 'Linkedin', icon: 'linkedin', link: 'https://www.linkedin.com/' },
      { name: 'Instagram', icon: 'instagram', link: 'https://www.instagram.com/' }
    ])
  );
  insertAuthor.run(
    'Jubayer Islam',
    'Dhaka, Bangladesh',
    'jubayer-islam',
    'Senior Full Stack & SMM Platform Architect with deep expertise in high-throughput reseller APIs, automated order dispatching, and multi-currency payment integrations.',
    JSON.stringify([
      { name: 'Facebook', icon: 'facebook', link: 'https://facebook.com/' },
      { name: 'Linkedin', icon: 'linkedin', link: 'https://www.linkedin.com/' }
    ])
  );
  insertAuthor.run(
    'Harry Porter',
    'London, United Kingdom',
    'harry-porter',
    'Digital marketing strategist and social media growth specialist focused on high-conversion social campaigns and engagement analytics.',
    JSON.stringify([
      { name: 'Twitter', icon: 'twitter', link: 'https://x.com/' },
      { name: 'Linkedin', icon: 'linkedin', link: 'https://www.linkedin.com/' }
    ])
  );
  console.log('✅ Blog authors seeded successfully');
}

// ═══════════════════════════════════════════════════════════
//                  7C. API PROVIDERS (PHASE 3)
// ═══════════════════════════════════════════════════════════

const providerCount = db.prepare('SELECT COUNT(*) as c FROM api_providers').get().c;
if (providerCount === 0 && SEED_DEMO) {
  const insertProvider = db.prepare(`
    INSERT INTO api_providers (name, api_url, api_key, balance, currency, conversion_rate, status, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProvider.run(
    'vipsmmpro',
    'https://vipsmmpro.com/api/v2',
    'smm_vip_live_9a7b8c1d2e3f4g5h6j',
    15420.00,
    'INR',
    83.95,
    'active',
    'Wholesale provider specializing in Asian and global high-speed Instagram and Telegram services.'
  );

  insertProvider.run(
    'smmworldpanel',
    'https://smmworldpanel.com/api/v2',
    'smm_world_live_8b3c4d5e6f7a1b2c3d',
    245.50,
    'USD',
    1.00,
    'active',
    'Primary international provider for YouTube watch time, monetized views, and verified Twitter metrics.'
  );

  insertProvider.run(
    'smmpakpanel',
    'https://smmpakpanel.com/api/v2',
    'smm_pak_live_7c2d3e4f5a6b7c8d9e',
    85.20,
    'USD',
    1.00,
    'active',
    'Secondary redundancy provider for TikTok likes, video saves, and real targeted comments.'
  );

  insertProvider.run(
    'justanotherpanel',
    'https://justanotherpanel.com/api/v2',
    'smm_jap_live_6d1e2f3a4b5c6d7e8f',
    310.00,
    'USD',
    1.00,
    'active',
    'High volume provider with instant automated refill and cancellation API support.'
  );

  console.log('✅ API providers seeded successfully');
}

// ═══════════════════════════════════════════════════════════
//                  8. EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════

const emailTemplates = [
  {
    code: 'welcome_email',
    name: 'Welcome Email',
    subject: 'Welcome to [[site_name]]! Your Account is Ready',
    body: 'Hello [[username]],<br><br>Welcome to [[site_name]]! Your account has been registered successfully.<br>You can now log in, deposit funds, and automate your social media orders.<br><br>Best regards,<br>The [[site_name]] Team',
    shortcodes: '[[username]], [[email]], [[site_name]], [[login_url]]'
  },
  {
    code: 'password_reset',
    name: 'Password Reset Notification',
    subject: 'Reset Your Password - [[site_name]]',
    body: 'Hello [[username]],<br><br>We received a request to reset your password. If you initiated this, please follow the link below to set a new password:<br><br><a href="[[reset_link]]">Reset Password</a><br><br>If you did not request this, please disregard this email.<br><br>Support Team',
    shortcodes: '[[username]], [[reset_link]], [[site_name]]'
  },
  {
    code: 'order_completed',
    name: 'Order Completed Notification',
    subject: 'Order #[[order_id]] Completed - [[site_name]]',
    body: 'Hello [[username]],<br><br>Great news! Your order #[[order_id]] for [[service_name]] has been successfully completed.<br>Target: [[target_link]]<br>Quantity: [[quantity]]<br><br>Thank you for choosing [[site_name]]!',
    shortcodes: '[[username]], [[order_id]], [[service_name]], [[quantity]], [[target_link]], [[site_name]]'
  },
  {
    code: 'deposit_confirmed',
    name: 'Deposit / Payment Confirmation',
    subject: 'Payment Confirmed: [[amount]] Added to Wallet',
    body: 'Hello [[username]],<br><br>Your payment of [[amount]] via [[payment_method]] has been verified and added to your wallet balance.<br>Transaction ID: [[trx_id]]<br>New Balance: [[new_balance]]<br><br>Thank you!',
    shortcodes: '[[username]], [[amount]], [[payment_method]], [[trx_id]], [[new_balance]], [[site_name]]'
  }
];

const insertEmailTpl = db.prepare(`
  INSERT OR IGNORE INTO email_templates (code, name, subject, body, shortcodes, status)
  VALUES (?, ?, ?, ?, ?, 'active')
`);

for (const t of emailTemplates) {
  insertEmailTpl.run(t.code, t.name, t.subject, t.body, t.shortcodes);
}
console.log('✅ Email templates seeded');

// ═══════════════════════════════════════════════════════════
//                  9. PUSH NOTIFICATION TEMPLATES
// ═══════════════════════════════════════════════════════════

const notifTemplates = [
  {
    code: 'order_status',
    name: 'Order Status Change',
    title: 'Order #[[order_id]] Update',
    body: 'Your order #[[order_id]] status has been changed to [[status]].',
    shortcodes: '[[order_id]], [[status]]'
  },
  {
    code: 'wallet_credit',
    name: 'Funds Credited',
    title: 'Balance Credited',
    body: '[[amount]] has been credited to your wallet balance.',
    shortcodes: '[[amount]], [[new_balance]]'
  },
  {
    code: 'ticket_reply',
    name: 'Ticket Staff Reply',
    title: 'Ticket #[[ticket_id]] Answered',
    body: 'A staff member has responded to your support ticket.',
    shortcodes: '[[ticket_id]], [[subject]]'
  }
];

const insertNotifTpl = db.prepare(`
  INSERT OR IGNORE INTO notification_templates (code, name, title, body, shortcodes, status)
  VALUES (?, ?, ?, ?, ?, 'active')
`);

for (const n of notifTemplates) {
  insertNotifTpl.run(n.code, n.name, n.title, n.body, n.shortcodes);
}
console.log('✅ Notification templates seeded');

// ═══════════════════════════════════════════════════════════
//                  10. SYSTEM ADDONS
// ═══════════════════════════════════════════════════════════

const addons = [
  {
    name: 'Child Panel System',
    code: 'child_panel',
    description: 'Enables customers to purchase and operate white-label child panels with custom domains.',
    version: '1.2.0',
    icon: 'layout',
    status: 'active'
  },
  {
    name: 'Multi-Provider API Engine',
    code: 'provider_api',
    description: 'Centralized API engine for syncing services, checking balances, and routing automated orders.',
    version: '2.0.0',
    icon: 'server',
    status: 'active'
  },
  {
    name: 'Multi-Currency Realtime Engine',
    code: 'currency_engine',
    description: 'Live multi-currency conversion system supporting USD, BDT, EUR, GBP, and INR.',
    version: '1.1.0',
    icon: 'coins',
    status: 'active'
  },
  {
    name: 'Firebase Push Notifications',
    code: 'firebase_push',
    description: 'Web push notifications powered by Google Firebase Cloud Messaging.',
    version: '1.0.4',
    icon: 'bell',
    status: 'active'
  },
  {
    name: 'PWA Mobile App Engine',
    code: 'pwa_support',
    description: 'Progressive Web App support allowing instant install and app shortcuts on mobile and desktop.',
    version: '1.0.0',
    icon: 'smartphone',
    status: 'active'
  }
];

const insertAddon = db.prepare(`
  INSERT OR IGNORE INTO addons (name, code, description, version, icon, status)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const a of addons) {
  insertAddon.run(a.name, a.code, a.description, a.version, a.icon, a.status);
}
console.log('✅ System addons seeded');

// ═══════════════════════════════════════════════════════════
//                  11. SEED DEDICATED STAFF ACCOUNT
// ═══════════════════════════════════════════════════════════

const staffExists = db.prepare("SELECT id FROM users WHERE email = 'staff@smmuper.com'").get();
let staffUserId;
if (!staffExists && SEED_DEMO) {
  const salt = bcrypt.genSaltSync(12);
  const hashedPassword = bcrypt.hashSync('staff123', salt);
  const apiKey = 'smm_staff_' + uuidv4().replace(/-/g, '');

  const res = db.prepare(`
    INSERT INTO users (username, email, password, balance, role, api_key, status, referral_code)
    VALUES (?, ?, ?, 0.00, 'admin', ?, 'active', 'STAFF01')
  `).run('staff_support', 'staff@smmuper.com', hashedPassword, apiKey);
  staffUserId = res.lastInsertRowid;
  console.log('✅ Staff user created: staff@smmuper.com / staff123');
} else if (staffExists) {
  staffUserId = staffExists.id;
}

// Link to staff table with Support Specialist role
const supportRole = db.prepare("SELECT id FROM roles WHERE name = 'Support Specialist'").get();
if (SEED_DEMO && supportRole && staffUserId) {
  const existingStaffEntry = db.prepare("SELECT id FROM staff WHERE user_id = ?").get(staffUserId);
  if (!existingStaffEntry) {
    db.prepare(`
      INSERT INTO staff (user_id, role_id, designation, status)
      VALUES (?, ?, 'Lead Support Agent', 'active')
    `).run(staffUserId, supportRole.id);
    console.log('✅ Staff member linked to Support Specialist role');
  }
}

console.log('\n🎉 SMMuper Phase 1 seed complete!\n');

const stats = {
  users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
  roles: db.prepare('SELECT COUNT(*) as c FROM roles').get().c,
  platforms: db.prepare('SELECT COUNT(*) as c FROM social_media').get().c,
  categories: db.prepare('SELECT COUNT(*) as c FROM categories').get().c,
  services: db.prepare('SELECT COUNT(*) as c FROM services').get().c,
  gateways: db.prepare('SELECT COUNT(*) as c FROM payment_methods').get().c,
};
console.log('Database summary:', stats);

db.close();
