const db = require('./database');

console.log('--- Initializing Phase 7 Schema & Default Assets ---');

// 1. Create Pages Table
db.exec(`
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
`);

// 2. Create Menus Table
db.exec(`
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

// 3. Migrate financial_ledger to support child panel transactions
try {
  const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='financial_ledger'").get()?.sql || '';
  if (!tableSql.includes('child_panel_purchase')) {
    console.log('Migrating financial_ledger CHECK constraint for child panel transactions...');
    db.exec(`
      CREATE TABLE financial_ledger_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('deposit', 'order_charge', 'order_refund', 'order_partial_refund', 'referral_commission', 'manual_credit', 'manual_debit', 'child_panel_purchase', 'child_panel_renewal')),
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

      INSERT INTO financial_ledger_new SELECT * FROM financial_ledger;
      DROP TABLE financial_ledger;
      ALTER TABLE financial_ledger_new RENAME TO financial_ledger;
      CREATE INDEX IF NOT EXISTS idx_ledger_user ON financial_ledger(user_id);
    `);
    console.log('✓ financial_ledger successfully migrated.');
  }
} catch (e) {
  console.log('financial_ledger check passed or skipped:', e.message);
}

// 4. Migrate child_panels CHECK constraint to allow renew_requested
try {
  const cpSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='child_panels'").get()?.sql || '';
  if (!cpSql.includes('renew_requested')) {
    console.log('Migrating child_panels CHECK constraint...');
    db.exec(`
      CREATE TABLE child_panels_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        domain TEXT NOT NULL UNIQUE,
        price REAL DEFAULT 15.00,
        currency TEXT DEFAULT 'USD',
        admin_user TEXT NOT NULL,
        admin_password TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'expired', 'suspended', 'renew_requested', 'rejected')),
        expires_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      INSERT INTO child_panels_new SELECT * FROM child_panels;
      DROP TABLE child_panels;
      ALTER TABLE child_panels_new RENAME TO child_panels;
    `);
    console.log('✓ child_panels successfully migrated.');
  }
} catch (e) {
  console.log('child_panels check passed or skipped:', e.message);
}

// 5. Seed System Settings for Child Panels and SEO
const defaultSettings = [
  { key: 'child_panel_monthly_price', value: '15.00' },
  { key: 'child_panel_nameservers', value: 'ns1.smmuper.com, ns2.smmuper.com' },
  { key: 'child_panel_system_enabled', value: '1' },
  { key: 'site_meta_title', value: 'SMMuper | #1 Social Media Marketing Wholesale SMM Reseller Panel' },
  { key: 'site_meta_description', value: 'Wholesale SMM Panel provider offering high-speed social media marketing growth, automated multi-provider API engine, instant delivery and 24/7 support.' },
  { key: 'site_meta_keywords', value: 'smm panel, wholesale smm, smm reseller, buy followers, instagram growth, smm api, smmuper' },
  { key: 'maintenance_mode', value: '0' }
];

defaultSettings.forEach(s => {
  db.prepare("INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)").run(s.key, s.value);
});

// 6. Seed Default KYC Setting Form
const existingKyc = db.prepare('SELECT id FROM kyc_settings LIMIT 1').get();
if (!existingKyc) {
  const fields = [
    { name: 'full_name', label: 'Full Legal Name', type: 'text', required: true, placeholder: 'Enter your full government-registered name' },
    { name: 'document_type', label: 'Document Type', type: 'select', required: true, options: ['National ID', 'Passport', 'Driving License', 'Business Trade License'] },
    { name: 'document_number', label: 'Document ID Number', type: 'text', required: true, placeholder: 'e.g. NID or Passport number' },
    { name: 'front_image', label: 'Front Document Image', type: 'file', required: true, placeholder: 'Upload clear photo of document front' },
    { name: 'back_image', label: 'Back Document Image', type: 'file', required: false, placeholder: 'Upload back photo (if applicable)' }
  ];

  db.prepare(`
    INSERT INTO kyc_settings (title, description, fields, status)
    VALUES (?, ?, ?, 'active')
  `).run(
    'Individual Identity Verification',
    'To prevent payment fraud, comply with KYC guidelines, and unlock elevated balance limits, please submit valid government documentation.',
    JSON.stringify(fields)
  );
  console.log('✓ Seeded default KYC verification form.');
}

// 7. Seed Default CMS Content Sections
const defaultSections = [
  {
    section_name: 'hero',
    content_json: JSON.stringify({
      badge: "World's #1 Wholesale SMM Panel & SaaS Engine",
      heading: "Scale Your Agency With Instant Wholesale Social Media Delivery",
      subheading: "Automated multi-provider API engine, real-time status synchronization, auto-refill guarantees, and direct wholesale pricing starting at $0.001/k.",
      cta_primary_text: "Get Started Now",
      cta_primary_url: "/register",
      cta_secondary_text: "Explore Services Catalog",
      cta_secondary_url: "/services",
      stats: [
        { label: "Delivered Orders", value: "2.4M+" },
        { label: "Active Resellers", value: "35,000+" },
        { label: "Platform Uptime", value: "99.98%" },
        { label: "Starting Price", value: "$0.001/k" }
      ]
    })
  },
  {
    section_name: 'about',
    content_json: JSON.stringify({
      title: "The Premier Infrastructure for Social Media Resellers",
      description: "SMMuper powers thousands of social media agencies, brands, and wholesale resellers worldwide with automated routing across top-tier provider APIs, enterprise security, and 24/7 dedicated support.",
      features: [
        "100% Automated Multi-Provider Routing & Fallbacks",
        "Dual Currency & Local Payment Gateways (bKash, Nagad, Stripe)",
        "Instant Child Panel Whitelabel SaaS Deployment",
        "Double-Entry Financial Ledger Invariance"
      ]
    })
  },
  {
    section_name: 'features',
    content_json: JSON.stringify({
      title: "Built For High-Volume SMM Resellers",
      items: [
        { icon: "Zap", title: "Instant Delivery", desc: "Orders are processed through our low-latency provider engine within seconds." },
        { icon: "RefreshCw", title: "Automated Refill", desc: "Guaranteed drop restoration with single-click manual or automated API refill." },
        { icon: "ShieldCheck", title: "RFC 6238 2FA Security", desc: "Protect account balances and API endpoints with authenticator app two-factor login." },
        { icon: "Cpu", title: "Universal SMM v2 API", desc: "Easily integrate your custom panel, Telegram bot, or CRM with standard endpoints." },
        { icon: "Layers", title: "Whitelabel Child Panels", desc: "Launch your own branded SMM panel in minutes with automated order forwarding." },
        { icon: "Headphones", title: "24/7 Dedicated Support", desc: "Round-the-clock live ticketing with average response times under 15 minutes." }
      ]
    })
  },
  {
    section_name: 'faq',
    content_json: JSON.stringify({
      title: "Frequently Asked Questions",
      items: [
        { q: "What is an SMM Panel?", a: "An SMM (Social Media Marketing) panel is an online wholesale service platform where individuals and marketing agencies purchase social media engagement like followers, views, likes, and subscribers." },
        { q: "How fast are orders delivered?", a: "Most services begin immediately within 0 to 5 minutes of order placement, powered by automated provider API dispatch." },
        { q: "What happens if followers or views drop?", a: "Services flagged with 'Refill' guarantee drop restoration within their guarantee window (typically 30-365 days). Click Refill on your order to request auto-topup." },
        { q: "How do I connect my own panel using API?", a: "Use our Standard SMM Protocol v2 endpoint at https://smmuper.com/api/v2. Your secret API key can be found in your Dashboard Profile." },
        { q: "What payment gateways are supported?", a: "We support both instant automated gateways (Stripe, Cards, Binance Pay) and local manual gateways (bKash, Nagad, Rocket)." }
      ]
    })
  },
  {
    section_name: 'testimonials',
    content_json: JSON.stringify({
      title: "Trusted By Top Marketing Agencies",
      items: [
        { name: "Alex Harrison", company: "GrowthScale Digital", role: "Agency Founder", content: "SMMuper is by far the fastest and most dependable wholesale panel we have integrated. The multi-provider routing eliminated failed orders entirely." },
        { name: "Sarah Jenkins", company: "Apex Media Group", role: "Operations Lead", content: "Our child panel handles over 5,000 orders daily through SMMuper API. The uptime is flawless and refill requests resolve automatically." },
        { name: "Tanvir Ahmed", company: "Dhaka Social Boost", role: "Wholesale Reseller", content: "Having seamless bKash and Nagad payment options alongside USD makes funding hassle-free. Best support in the industry." }
      ]
    })
  },
  {
    section_name: 'payment_partners',
    content_json: JSON.stringify({
      title: "Supported Payment Methods & Gateways",
      partners: [
        { name: "bKash", type: "Mobile Wallet", fee: "0%" },
        { name: "Nagad", type: "Mobile Wallet", fee: "0%" },
        { name: "Rocket", type: "Mobile Banking", fee: "0%" },
        { name: "Stripe", type: "Credit / Debit Cards", fee: "2.9%" },
        { name: "Binance Pay", type: "USDT / Crypto", fee: "0%" },
        { name: "PayPal", type: "Digital Wallet", fee: "3.5%" }
      ]
    })
  }
];

defaultSections.forEach(sec => {
  db.prepare(`
    INSERT OR IGNORE INTO cms_content (section_name, content_json)
    VALUES (?, ?)
  `).run(sec.section_name, sec.content_json);
});
console.log('✓ Seeded default CMS content sections.');

// 8. Seed Default Website Pages
const defaultPages = [
  {
    name: 'Terms & Conditions',
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions of Service',
    content: `<h3>1. Introduction</h3><p>Welcome to SMMuper. By registering and placing orders on smmuper.com, you agree to comply with all applicable terms, laws, and guidelines set forth herein.</p><h3>2. Service Delivery</h3><p>SMMuper will deliver services as ordered. Delivery start times are estimates and may vary during peak server utilization. Refill guarantees apply exclusively to services explicitly labeled with Refill tags.</p><h3>3. Account Responsibility</h3><p>Customers are responsible for maintaining the confidentiality of their credentials and API keys. SMMuper enforces Two-Factor Authentication (2FA) for sensitive operations.</p>`,
    meta_title: 'Terms of Service | SMMuper',
    meta_description: 'Read the official terms and conditions for SMMuper wholesale SMM reseller services.'
  },
  {
    name: 'Privacy Policy',
    slug: 'privacy-policy',
    title: 'Privacy and Data Protection Policy',
    content: `<h3>1. Information We Collect</h3><p>SMMuper collects account credentials, order targets (public links), and transaction histories required to fulfill social media marketing orders.</p><h3>2. Security & Encryption</h3><p>All passwords are encrypted with bcrypt. We never store raw payment credentials or third-party provider keys in plain text.</p><h3>3. Data Retention</h3><p>Customer data is maintained according to standard audit and accounting ledger requirements.</p>`,
    meta_title: 'Privacy Policy | SMMuper',
    meta_description: 'Learn how SMMuper protects your privacy, transaction records, and personal account data.'
  },
  {
    name: 'Refund Policy',
    slug: 'refund-policy',
    title: 'Order Refund & Cancellation Policy',
    content: `<h3>1. Wallet Balance Refunds</h3><p>Once funds are deposited to SMMuper, they may be utilized for any wholesale service in our catalog. Remaining funds are maintained in your account indefinitely.</p><h3>2. Order Cancellations</h3><p>If an order fails or is cancelled by our network, the exact deducted amount is automatically refunded back to your wallet balance instantly.</p><h3>3. Partial Deliveries</h3><p>For orders partially fulfilled, your wallet receives an immediate partial refund proportionate to the undelivered remainder.</p>`,
    meta_title: 'Refund Policy | SMMuper',
    meta_description: 'Review the refund, cancellation, and partial delivery terms for SMMuper orders.'
  }
];

defaultPages.forEach(p => {
  db.prepare(`
    INSERT OR IGNORE INTO pages (name, slug, title, content, meta_title, meta_description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(p.name, p.slug, p.title, p.content, p.meta_title, p.meta_description);
});
console.log('✓ Seeded default website pages.');

// 9. Seed Default Menus
const defaultMenus = [
  { location: 'header', title: 'Services', url: '/services', sort_order: 1 },
  { location: 'header', title: 'API Documentation', url: '/dashboard/api-docs', sort_order: 2 },
  { location: 'header', title: 'Blog', url: '/blogs', sort_order: 3 },
  { location: 'header', title: 'FAQ', url: '/#faq', sort_order: 4 },
  { location: 'footer', title: 'Terms & Conditions', url: '/page/terms-and-conditions', sort_order: 1 },
  { location: 'footer', title: 'Privacy Policy', url: '/page/privacy-policy', sort_order: 2 },
  { location: 'footer', title: 'Refund Policy', url: '/page/refund-policy', sort_order: 3 }
];

defaultMenus.forEach(m => {
  db.prepare(`
    INSERT OR IGNORE INTO menus (location, title, url, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(m.location, m.title, m.url, m.sort_order);
});
console.log('✓ Seeded default menus.');

// 10. Seed Default Blog Categories & Articles
const defaultCats = [
  { name: 'SMM Reselling', slug: 'smm-reselling' },
  { name: 'Platform Growth', slug: 'platform-growth' },
  { name: 'API & Automation', slug: 'api-automation' }
];

defaultCats.forEach(c => {
  db.prepare("INSERT OR IGNORE INTO blog_categories (name, slug) VALUES (?, ?)").run(c.name, c.slug);
});

const cat1 = db.prepare('SELECT id FROM blog_categories WHERE slug = ?').get('smm-reselling');
const author1 = db.prepare('SELECT id FROM blog_authors LIMIT 1').get();

if (cat1 && author1) {
  const defaultBlogs = [
    {
      category_id: cat1.id,
      author_id: author1.id,
      title: 'How to Launch a Profitable SMM Panel in 2026',
      slug: 'how-to-launch-profitable-smm-panel-2026',
      description: 'Discover the complete step-by-step blueprint for building a recurring wholesale SMM reselling business using whitelabel child panels and automated provider APIs.',
      views_count: 1420
    },
    {
      category_id: cat1.id,
      author_id: author1.id,
      title: 'Mastering the SMM Protocol v2 API for Bulk Order Routing',
      slug: 'mastering-smm-protocol-v2-api',
      description: 'A comprehensive technical guide to integrating social media ordering engines with standardized REST endpoints, error recovery, and instant status synchronizations.',
      views_count: 980
    }
  ];

  defaultBlogs.forEach(b => {
    db.prepare(`
      INSERT OR IGNORE INTO blogs (category_id, author_id, title, slug, description, views_count, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(b.category_id, b.author_id, b.title, b.slug, b.description, b.views_count);
  });
  console.log('✓ Seeded default blog articles.');
}

console.log('🎉 Phase 7 Database initialization complete!');

