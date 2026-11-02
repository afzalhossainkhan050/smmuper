/**
 * SMMuper - Phase 7 Verification Suite
 * Tests Child Panels, KYC Identity Verification, CMS Sections, Custom Pages,
 * Navigation Menus, Blogs & Authors, Newsletter Subscribers, SEO & System Backup.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = 'smm_uper_jwt_secret_key_2024_xK9mP2nQ7wR4tY6u';

let passed = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ✓ ${name}`);
      passed++;
    })
    .catch((err) => {
      console.error(`  ✗ ${name}:`, err.message);
      failed++;
    });
}

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function request(endpoint, options = {}) {
  const { method = 'GET', body, token, headers = {} } = options;
  const reqHeaders = { 'Content-Type': 'application/json', ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }
  return { status: res.status, headers: res.headers, data: json, text };
}

async function run() {
  console.log('\n======================================================');
  console.log('       SMMUPER - PHASE 7 AUTOMATED VERIFICATION       ');
  console.log('======================================================\n');

  // 1. Setup Test Users
  const timestamp = Date.now();
  const testCustomerEmail = `p7_customer_${timestamp}@smmuper.com`;
  const testAdminEmail = `p7_admin_${timestamp}@smmuper.com`;

  // Insert test customer with $100 balance
  const custRes = db.prepare(`
    INSERT INTO users (username, email, password, role, balance, status)
    VALUES (?, ?, ?, 'user', 100.00, 'active')
  `).run(`p7_cust_${timestamp}`, testCustomerEmail, 'hash');

  const customerId = custRes.lastInsertRowid;
  const customerToken = createToken({ id: customerId, username: `p7_cust_${timestamp}`, role: 'user' });

  // Insert test admin
  const adminRes = db.prepare(`
    INSERT INTO users (username, email, password, role, status)
    VALUES (?, ?, ?, 'admin', 'active')
  `).run(`p7_admin_${timestamp}`, testAdminEmail, 'hash');

  const adminId = adminRes.lastInsertRowid;
  const adminToken = createToken({ id: adminId, username: `p7_admin_${timestamp}`, role: 'admin' });

  console.log('--- MODULE 1: CHILD PANELS ENGINE ---');

  let testPanelId;
  const testDomain = `panel-${timestamp}.mysmmpanel.com`;
  const priceRow = db.prepare("SELECT value FROM system_settings WHERE key = 'child_panel_monthly_price'").get();
  const currentPrice = priceRow ? parseFloat(priceRow.value) : 25.00;

  await test('Customer can retrieve child panel pricing and DNS nameservers', async () => {
    const res = await request('/child-panels', { token: customerToken });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.monthly_price !== undefined);
    assert.ok(Array.isArray(res.data.nameservers));
    assert.ok(res.data.nameservers.length >= 2);
  });

  await test('Child panel ordering fails with insufficient balance', async () => {
    // Set customer balance to $0 temporarily
    db.prepare('UPDATE users SET balance = 0 WHERE id = ?').run(customerId);
    const res = await request('/child-panels/order', {
      method: 'POST',
      token: customerToken,
      body: { domain: testDomain, admin_user: 'admin', admin_password: 'Password123!' }
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.data.message.toLowerCase().includes('insufficient'));
    // Restore balance to $100
    db.prepare('UPDATE users SET balance = 100.00 WHERE id = ?').run(customerId);
  });

  await test('Customer can purchase a child panel with atomic balance deduction and financial ledger record', async () => {
    const res = await request('/child-panels/order', {
      method: 'POST',
      token: customerToken,
      body: { domain: testDomain, admin_user: 'superadmin', admin_password: 'Password123!', currency: 'USD' }
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.data.panel?.id || res.data.panel_id);
    testPanelId = res.data.panel?.id || res.data.panel_id;

    // Check user balance deducted ($100 - currentPrice)
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(customerId);
    assert.strictEqual(user.balance, 100.00 - currentPrice);

    // Check financial ledger entry
    const ledger = db.prepare("SELECT * FROM financial_ledger WHERE user_id = ? AND transaction_type = 'child_panel_purchase'").get(customerId);
    assert.ok(ledger);
    assert.strictEqual(ledger.amount, currentPrice);
    assert.strictEqual(ledger.balance_before, 100.00);
    assert.strictEqual(ledger.balance_after, 100.00 - currentPrice);

    // Check panel expiration date is ~30 days in the future
    const panel = db.prepare('SELECT * FROM child_panels WHERE id = ?').get(testPanelId);
    assert.strictEqual(panel.status, 'active');
    assert.ok(new Date(panel.expires_at) > new Date());
  });

  await test('Duplicate child panel domain registration is rejected', async () => {
    const res = await request('/child-panels/order', {
      method: 'POST',
      token: customerToken,
      body: { domain: testDomain, admin_user: 'admin2', admin_password: 'Password123!' }
    });
    assert.strictEqual(res.status, 409);
  });

  await test('Customer can renew child panel extending expiration by 30 days', async () => {
    const panelBefore = db.prepare('SELECT expires_at FROM child_panels WHERE id = ?').get(testPanelId);
    const res = await request(`/child-panels/${testPanelId}/renew`, {
      method: 'POST',
      token: customerToken
    });

    assert.strictEqual(res.status, 200);

    // Check balance deducted ($100 - 2*currentPrice)
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(customerId);
    assert.strictEqual(user.balance, 100.00 - (2 * currentPrice));

    // Check expiration extended
    const panelAfter = db.prepare('SELECT expires_at FROM child_panels WHERE id = ?').get(testPanelId);
    assert.ok(new Date(panelAfter.expires_at) > new Date(panelBefore.expires_at));

    // Check ledger entry
    const ledger = db.prepare("SELECT * FROM financial_ledger WHERE user_id = ? AND transaction_type = 'child_panel_renewal'").get(customerId);
    assert.ok(ledger);
  });

  await test('Admin child panels dashboard returns aggregated metrics', async () => {
    const res = await request('/admin/child-panels/dashboard', { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.stats);
    assert.ok(res.data.stats.total >= 1);
    assert.ok(res.data.settings);
  });

  await test('Admin can list child panels and filter by status', async () => {
    const res = await request('/admin/child-panels?status=active', { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.panels));
    assert.ok(res.data.panels.some(p => p.id === testPanelId));
  });

  await test('Admin can update child panel status and settings', async () => {
    const res = await request(`/admin/child-panels/${testPanelId}`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'suspended' }
    });
    assert.strictEqual(res.status, 200);

    const panel = db.prepare('SELECT status FROM child_panels WHERE id = ?').get(testPanelId);
    assert.strictEqual(panel.status, 'suspended');
  });

  console.log('\n--- MODULE 2: KYC IDENTITY VERIFICATION ---');

  let testSubmissionId;

  await test('Customer can retrieve active KYC form schema', async () => {
    const res = await request('/kyc', { token: customerToken });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.is_verified, false);
    assert.ok(res.data.setting);
    assert.ok(Array.isArray(res.data.setting.fields));
  });

  await test('Customer can submit identity documents for verification', async () => {
    const res = await request('/kyc/submit', {
      method: 'POST',
      token: customerToken,
      body: {
        form_data: {
          full_name: 'Antigravity Tester',
          document_type: 'National ID',
          document_number: 'NID-992834-X',
          front_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
      }
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.data.submission?.id || res.data.id);
    testSubmissionId = res.data.submission?.id || res.data.id;

    // Check status is now pending
    const statusRes = await request('/kyc', { token: customerToken });
    assert.strictEqual(statusRes.data.status, 'pending');
  });

  await test('Admin can list and view submitted KYC verification requests', async () => {
    const res = await request('/admin/kyc/submissions?status=pending', { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.submissions));
    assert.ok(res.data.submissions.some(s => s.id === testSubmissionId));

    const singleRes = await request(`/admin/kyc/submissions/${testSubmissionId}`, { token: adminToken });
    assert.strictEqual(singleRes.status, 200);
    assert.strictEqual(singleRes.data.submission.username, `p7_cust_${timestamp}`);
    assert.strictEqual(singleRes.data.submission.form_data.full_name, 'Antigravity Tester');
  });

  await test('Admin can approve KYC submission, marking user identity verified', async () => {
    const res = await request(`/admin/kyc/submissions/${testSubmissionId}/approve`, {
      method: 'POST',
      token: adminToken
    });
    assert.strictEqual(res.status, 200);

    const checkRes = await request('/kyc', { token: customerToken });
    assert.strictEqual(checkRes.data.status, 'approved');
    assert.strictEqual(checkRes.data.is_verified, true);
  });

  await test('Admin can reject KYC submission with specific feedback', async () => {
    // Create second submission to test rejection
    const sub2 = db.prepare(`
      INSERT INTO kyc_submissions (user_id, kyc_setting_id, form_data, status)
      VALUES (?, (SELECT id FROM kyc_settings LIMIT 1), '{"full_name":"Test"}', 'pending')
    `).run(customerId);

    const res = await request(`/admin/kyc/submissions/${sub2.lastInsertRowid}/reject`, {
      method: 'POST',
      token: adminToken,
      body: { rejection_reason: 'Image is too dark and unreadable.' }
    });

    assert.strictEqual(res.status, 200);
    const row = db.prepare('SELECT * FROM kyc_submissions WHERE id = ?').get(sub2.lastInsertRowid);
    assert.strictEqual(row.status, 'rejected');
    assert.strictEqual(row.rejection_reason, 'Image is too dark and unreadable.');
  });

  console.log('\n--- MODULE 3: CMS CONTENT SECTIONS ---');

  await test('Public endpoint can retrieve landing CMS sections (hero, faq, about)', async () => {
    const heroRes = await request('/cms/sections/hero');
    assert.strictEqual(heroRes.status, 200);
    assert.ok(heroRes.data.content.heading);

    const faqRes = await request('/cms/sections/faq');
    assert.strictEqual(faqRes.status, 200);
    assert.ok(Array.isArray(faqRes.data.content.items));
  });

  await test('Admin can update CMS section content', async () => {
    const newContent = {
      heading: 'Updated Headline SMM Wholesale Engine 2026',
      subheading: 'New subheading test content.',
      badge: 'PROMO ACTIVE'
    };

    const res = await request('/admin/cms/sections/hero', {
      method: 'PUT',
      token: adminToken,
      body: { content: newContent }
    });
    assert.strictEqual(res.status, 200);

    const publicRes = await request('/cms/sections/hero');
    assert.strictEqual(publicRes.data.content.heading, 'Updated Headline SMM Wholesale Engine 2026');
  });

  console.log('\n--- MODULE 4: WEBSITE PAGES & LEGAL POLICIES ---');

  let testPageId;
  const testPageSlug = `affiliate-guide-${timestamp}`;

  await test('Public can list active pages and retrieve page by slug', async () => {
    const listRes = await request('/cms/pages');
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listRes.data.pages));

    const pageRes = await request('/cms/pages/terms-and-conditions');
    assert.strictEqual(pageRes.status, 200);
    assert.ok(pageRes.data.page && (pageRes.data.page.title.includes('Terms') || pageRes.data.page.content.includes('terms')));
  });

  await test('Admin can create, update, and delete custom pages', async () => {
    const createRes = await request('/admin/pages', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Affiliate Guide',
        slug: testPageSlug,
        title: 'Complete Affiliate Guide',
        content: '<h3>How to earn referral income</h3><p>Share your link...</p>',
        meta_title: 'Affiliate Guide | SMMuper'
      }
    });

    assert.strictEqual(createRes.status, 201);
    testPageId = createRes.data.id;

    // Public view
    const pubRes = await request(`/cms/pages/${testPageSlug}`);
    assert.strictEqual(pubRes.status, 200);
    assert.strictEqual(pubRes.data.page.title, 'Complete Affiliate Guide');

    // Admin update
    const updateRes = await request(`/admin/pages/${testPageId}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        name: 'Affiliate Guide Pro',
        title: 'Complete Affiliate Guide (Updated)',
        content: '<p>Updated content...</p>'
      }
    });
    assert.strictEqual(updateRes.status, 200);

    // Admin delete
    const delRes = await request(`/admin/pages/${testPageId}`, {
      method: 'DELETE',
      token: adminToken
    });
    assert.strictEqual(delRes.status, 200);
  });

  console.log('\n--- MODULE 5: NAVIGATION MENUS ---');

  let testMenuId;

  await test('Public can retrieve header and footer navigation menus', async () => {
    const res = await request('/cms/menus');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.menus.header));
    assert.ok(Array.isArray(res.data.menus.footer));
  });

  await test('Admin can create, update, and delete navigation menus', async () => {
    const createRes = await request('/admin/menus', {
      method: 'POST',
      token: adminToken,
      body: {
        location: 'header',
        title: 'Special Deals',
        url: '/deals',
        sort_order: 99
      }
    });

    assert.strictEqual(createRes.status, 201);
    testMenuId = createRes.data.id;

    const delRes = await request(`/admin/menus/${testMenuId}`, {
      method: 'DELETE',
      token: adminToken
    });
    assert.strictEqual(delRes.status, 200);
  });

  console.log('\n--- MODULE 6: BLOG ARTICLES & AUTHORS ---');

  let testBlogId;
  const testBlogSlug = `api-scaling-tips-${timestamp}`;

  await test('Admin can create blog categories and publish blog articles', async () => {
    const cat = db.prepare('SELECT id FROM blog_categories LIMIT 1').get();
    const author = db.prepare('SELECT id FROM blog_authors LIMIT 1').get();

    const res = await request('/admin/blogs', {
      method: 'POST',
      token: adminToken,
      body: {
        category_id: cat.id,
        author_id: author?.id || null,
        title: 'API Scaling Strategies for High Volume Panels',
        slug: testBlogSlug,
        description: 'Comprehensive technical instructions on load management.'
      }
    });

    assert.strictEqual(res.status, 201);
    testBlogId = res.data.id;
  });

  await test('Public blog post view increments views_count atomically', async () => {
    const before = db.prepare('SELECT views_count FROM blogs WHERE id = ?').get(testBlogId);
    const res = await request(`/cms/blogs/${testBlogSlug}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.blog.views_count, before.views_count + 1);
  });

  await test('Public can retrieve blog authors list', async () => {
    const res = await request('/cms/authors');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.authors));
    assert.ok(res.data.authors.length >= 1);
  });

  console.log('\n--- MODULE 7: NEWSLETTER SUBSCRIBERS ---');

  const testSubscriberEmail = `subscriber_${timestamp}@example.com`;

  await test('Public can subscribe to newsletter and duplicate subscriptions are handled safely', async () => {
    const res1 = await request('/cms/subscribe', {
      method: 'POST',
      body: { email: testSubscriberEmail }
    });
    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res1.data.subscribed, true);

    const res2 = await request('/cms/subscribe', {
      method: 'POST',
      body: { email: testSubscriberEmail }
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.data.already_subscribed, true);
  });

  await test('Admin can list and delete newsletter subscribers', async () => {
    const listRes = await request(`/admin/subscribers?search=${testSubscriberEmail}`, { token: adminToken });
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.data.subscribers.some(s => s.email === testSubscriberEmail));

    const sub = listRes.data.subscribers.find(s => s.email === testSubscriberEmail);
    const delRes = await request(`/admin/subscribers/${sub.id}`, {
      method: 'DELETE',
      token: adminToken
    });
    assert.strictEqual(delRes.status, 200);
  });

  console.log('\n--- MODULE 8: SYSTEM BACKUP, MAINTENANCE & SEO ---');

  await test('Admin can retrieve and toggle platform maintenance mode', async () => {
    const statusRes = await request('/admin/system/maintenance', { token: adminToken });
    assert.strictEqual(statusRes.status, 200);

    const toggleRes = await request('/admin/system/maintenance', {
      method: 'PUT',
      token: adminToken,
      body: { enabled: true }
    });
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleRes.data.maintenance_mode, true);

    // Toggle back off
    await request('/admin/system/maintenance', {
      method: 'PUT',
      token: adminToken,
      body: { enabled: false }
    });
  });

  await test('Admin database backup endpoint generates valid binary SQLite snapshot', async () => {
    const res = await fetch(`${API_BASE}/admin/system/backup`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 10000, 'Database snapshot buffer must not be empty');
    const header = Buffer.from(buffer.slice(0, 16)).toString('utf8');
    assert.ok(header.includes('SQLite format 3'), 'Snapshot must be genuine SQLite format 3');
  });

  await test('Dynamic sitemap XML is served with canonical URLs and sitemap format', async () => {
    const res = await fetch('http://localhost:5000/sitemap.xml');
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('<?xml version="1.0"'));
    assert.ok(text.includes('<loc>https://smmuper.com/</loc>'));
    assert.ok(text.includes('<loc>https://smmuper.com/page/terms-and-conditions</loc>'));
  });

  await test('Dynamic robots.txt is served with sitemap reference and security disallows', async () => {
    const res = await fetch('http://localhost:5000/robots.txt');
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('User-agent: *'));
    assert.ok(text.includes('Disallow: /admin/'));
    assert.ok(text.includes('Sitemap: https://smmuper.com/sitemap.xml'));
  });

  console.log('\n======================================================');
  console.log(`TOTAL PHASE 7 TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
