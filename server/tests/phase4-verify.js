/**
 * SMMuper - Phase 4 Service & Order Management Verification Suite
 * Verifies Social Media Platform CRUD, Category CRUD, Service catalog with provider mapping,
 * Single & Mass orders, Atomic financial ledger deductions, Idempotency protection,
 * Refill & Cancel workflows, and Automatic partial/cancellation refunds.
 */

const http = require('http');
const app = require('../index');
const db = require('../db/database');
const providerEngine = require('../services/providerEngine');

let server;
let adminToken = '';
let demoToken = '';
let demoUserId = null;
let testPlatformId = null;
let testCategoryId = null;
let testServiceId = null;
let testOrderId = null;

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAILED: ${message}`);
  }
}

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5007,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n============================================================');
  console.log('  SMMuper - PHASE 4 SERVICE & ORDER MANAGEMENT VERIFICATION');
  console.log('============================================================\n');

  try {
    // Start HTTP server on port 5007
    server = app.listen(5007);
    await new Promise(r => setTimeout(r, 600));

    // ──────────────── 1. AUTHENTICATION SETUP ────────────────
    console.log('1. Authentication Setup:');
    const adminLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'admin@smmuper.com',
      password: 'admin123'
    });
    assert(adminLogin.status === 200 && adminLogin.body?.token, 'Admin authenticated successfully');
    adminToken = adminLogin.body?.token;

    const demoLogin = await request({ path: '/api/auth/login', method: 'POST' }, {
      email: 'demo@smmuper.com',
      password: 'demo123'
    });
    assert(demoLogin.status === 200 && demoLogin.body?.token, 'Demo customer authenticated successfully');
    demoToken = demoLogin.body?.token;
    demoUserId = demoLogin.body?.user?.id;

    // Ensure demo user has sufficient balance for test suite
    db.prepare("UPDATE users SET balance = 100.00 WHERE email = 'demo@smmuper.com'").run();

    // ──────────────── 2. SOCIAL MEDIA PLATFORMS CRUD ────────────────
    console.log('\n2. Social Media Platforms (Screenshots: admin_social_media.png):');
    const getSocial = await request({
      path: '/api/admin/social-media',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getSocial.status === 200, 'GET /api/admin/social-media returns 200');
    assert(Array.isArray(getSocial.body?.platforms) && getSocial.body.platforms.length >= 16, 'Returns 16 standard social media platforms');
    assert(getSocial.body?.stats?.total >= 16, 'Platform statistics card values returned');

    // Create custom platform
    const createSocial = await request({
      path: '/api/admin/social-media',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Threads Testing Platform',
      icon: 'at-sign',
      sort_order: 99,
      status: 'active'
    });
    assert(createSocial.status === 201, 'POST /api/admin/social-media creates platform');
    testPlatformId = createSocial.body?.platform?.id;
    assert(testPlatformId, 'New platform received database ID');

    // Update platform
    const updateSocial = await request({
      path: `/api/admin/social-media/${testPlatformId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Threads Pro Testing',
      status: 'active'
    });
    assert(updateSocial.status === 200 && updateSocial.body?.platform?.name === 'Threads Pro Testing', 'PUT /api/admin/social-media/:id updates platform');

    // Sort platforms
    const sortSocial = await request({
      path: '/api/admin/social-media/sort',
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      items: [{ id: testPlatformId, sort_order: 100 }]
    });
    assert(sortSocial.status === 200, 'PUT /api/admin/social-media/sort updates sort order');

    // ──────────────── 3. CATEGORY MANAGEMENT CRUD ────────────────
    console.log('\n3. Category Management (Screenshots: admin_category.png):');
    const getCats = await request({
      path: '/api/admin/categories',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getCats.status === 200, 'GET /api/admin/categories returns 200');
    assert(Array.isArray(getCats.body?.categories), 'Categories array returned with service counts');

    // Create Category tied to Social Media Platform
    const createCat = await request({
      path: '/api/admin/categories',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Threads Pro Followers Test',
      social_media_id: testPlatformId,
      icon: '🧵',
      sort_order: 10,
      status: 'active'
    });
    assert(createCat.status === 201, 'POST /api/admin/categories creates new category');
    testCategoryId = createCat.body?.category?.id;
    assert(testCategoryId, 'Category assigned primary key');

    // Update Category
    const updateCat = await request({
      path: `/api/admin/categories/${testCategoryId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Threads Pro Real Followers Test',
      icon: '🧵'
    });
    assert(updateCat.status === 200 && updateCat.body?.category?.name === 'Threads Pro Real Followers Test', 'PUT /api/admin/categories/:id updates category details');

    // Sort categories
    const sortCat = await request({
      path: '/api/admin/categories/sort',
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      items: [{ id: testCategoryId, sort_order: 15 }]
    });
    assert(sortCat.status === 200, 'PUT /api/admin/categories/sort executes bulk sorting');

    // ──────────────── 4. SERVICE MANAGEMENT & PROVIDER BINDING ────────────────
    console.log('\n4. Service Management (Screenshots: admin_service.png & admin_service_create.png):');
    const getServices = await request({
      path: '/api/admin/services',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getServices.status === 200, 'GET /api/admin/services returns 200');
    assert(getServices.body?.stats?.total >= 100, 'Existing wholesale services catalog retrieved');

    // Fetch an existing API provider to bind
    const providers = db.prepare('SELECT id, name FROM api_providers WHERE status = ? LIMIT 1').get('active');

    // Create Service with Wholesale Provider Mapping
    const createSvc = await request({
      path: '/api/admin/services',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      category_id: testCategoryId,
      name: 'Threads Real HQ Followers [Instant | Refill 30D]',
      description: 'High quality Threads followers. Instant start.',
      rate: 3.50,
      original_rate: 1.50,
      min_quantity: 100,
      max_quantity: 10000,
      type: 'default',
      status: 'active',
      provider_id: providers ? providers.id : null,
      provider_service_id: '8821',
      avg_time: '0-1 hours',
      dripfeed: 0,
      refill: 1,
      cancel: 1,
      sort_order: 1
    });
    assert(createSvc.status === 201, 'POST /api/admin/services creates service with provider mapping');
    testServiceId = createSvc.body?.service?.id;
    assert(testServiceId, 'Service created with ID');
    assert(createSvc.body?.service?.refill === 1, 'Service refill toggle stored');
    assert(createSvc.body?.service?.cancel === 1, 'Service cancel toggle stored');
    assert(createSvc.body?.service?.original_rate === 1.5, 'Wholesale buying price stored');

    // Update Service
    const updateSvc = await request({
      path: `/api/admin/services/${testServiceId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      rate: 4.00,
      avg_time: '15-30 minutes'
    });
    assert(updateSvc.status === 200 && updateSvc.body?.service?.rate === 4.0, 'PUT /api/admin/services/:id updates selling rate');

    // Toggle Service Status
    const toggleSvc = await request({
      path: `/api/admin/services/${testServiceId}/toggle-status`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(toggleSvc.status === 200 && toggleSvc.body?.status === 'inactive', 'PUT /api/admin/services/:id/toggle-status toggles to inactive');
    // Reactivate for ordering tests
    await request({
      path: `/api/admin/services/${testServiceId}/toggle-status`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Bulk Action: Margin Adjustment
    const bulkAction = await request({
      path: '/api/admin/services/bulk-action',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      action: 'adjust_margin',
      service_ids: [testServiceId],
      margin_percent: 100 // 100% markup on original_rate 1.50 = 3.00
    });
    assert(bulkAction.status === 200, 'POST /api/admin/services/bulk-action applies margin calculator');
    const checkedSvc = db.prepare('SELECT rate FROM services WHERE id = ?').get(testServiceId);
    assert(checkedSvc.rate === 3.00, 'Markup correctly calculated: 1.50 * 2 = 3.00');

    // ──────────────── 5. CUSTOMER SINGLE ORDER & ATOMIC LEDGER ────────────────
    console.log('\n5. Customer Single Order & Atomic Ledger:');
    const demoBefore = db.prepare('SELECT balance FROM users WHERE id = ?').get(demoUserId);

    // Place single order for 1,000 units: at rate $3.00 / 1k, charge is $3.00
    const placeOrder = await request({
      path: '/api/orders',
      method: 'POST',
      headers: { Authorization: `Bearer ${demoToken}` }
    }, {
      service_id: testServiceId,
      link: 'https://threads.net/@smmuper_test',
      quantity: 1000
    });
    assert(placeOrder.status === 201, 'POST /api/orders places order successfully');
    testOrderId = placeOrder.body?.order?.id;
    assert(testOrderId, 'Order assigned unique ID');
    assert(placeOrder.body?.order?.charge === 3.00, 'Order charge correctly calculated as $3.00');

    // Verify balance deduction
    const demoAfter = db.prepare('SELECT balance FROM users WHERE id = ?').get(demoUserId);
    assert(Math.abs(demoAfter.balance - (demoBefore.balance - 3.00)) < 0.001, 'User wallet balance atomically deducted');

    // Verify immutable financial ledger entry
    const ledgerEntry = db.prepare(`
      SELECT * FROM financial_ledger 
      WHERE user_id = ? AND reference_id = ? AND transaction_type = 'order_charge'
    `).get(demoUserId, String(testOrderId));
    assert(ledgerEntry !== undefined, 'Financial ledger records immutable order_charge event');
    assert(ledgerEntry?.amount === 3.00, 'Ledger recorded exact deducted amount');
    assert(ledgerEntry?.balance_after === demoAfter.balance, 'Ledger audit trail matches live balance');

    // Idempotency: Immediate duplicate order submission within debounce window
    const dupOrder = await request({
      path: '/api/orders',
      method: 'POST',
      headers: { Authorization: `Bearer ${demoToken}` }
    }, {
      service_id: testServiceId,
      link: 'https://threads.net/@smmuper_test',
      quantity: 1000
    });
    assert(dupOrder.status === 429, 'Idempotency debouncer rejected duplicate submission (HTTP 429)');

    // ──────────────── 6. CUSTOMER MASS ORDER ENGINE ────────────────
    console.log('\n6. Customer Mass Order Engine:');
    const massText = `${testServiceId} | https://threads.net/@user1 | 500\n${testServiceId} | https://threads.net/@user2 | 500\n999999 | invalid | 100`;

    const massRes = await request({
      path: '/api/orders/mass',
      method: 'POST',
      headers: { Authorization: `Bearer ${demoToken}` }
    }, {
      orders: massText
    });
    assert(massRes.status === 201, 'POST /api/orders/mass processes bulk order batch');
    assert(massRes.body?.total_submitted === 2, '2 valid orders processed');
    assert(massRes.body?.failed_lines?.length === 1, '1 invalid service line detected and reported');
    assert(massRes.body?.total_charged === 3.00, 'Mass total charge calculated: 2 x (3.00 * 500 / 1000) = 3.00');

    // ──────────────── 7. REFILL & CANCELLATION WORKFLOWS ────────────────
    console.log('\n7. Refill & Cancellation Workflows:');

    // Set order status to completed so refill is eligible
    db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").run(testOrderId);

    // Customer Refill Request
    const customerRefill = await request({
      path: `/api/orders/${testOrderId}/refill`,
      method: 'POST',
      headers: { Authorization: `Bearer ${demoToken}` }
    });
    assert(customerRefill.status === 200, 'POST /api/orders/:id/refill customer initiates refill');
    assert(customerRefill.body?.refill_status === 'requested', 'Order marked with refill_status = requested');

    const refillRecord = db.prepare('SELECT * FROM order_refills WHERE order_id = ?').get(testOrderId);
    assert(refillRecord !== undefined, 'Order refill record stored in order_refills table');

    // Admin Refill Dispatch
    const adminRefill = await request({
      path: `/api/admin/orders/${testOrderId}/refill`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminRefill.status === 200, 'POST /api/admin/orders/:id/refill admin triggers refill dispatch');

    // ──────────────── 8. ORDER CANCELLATION & AUTOMATIC FULL REFUND ────────────────
    console.log('\n8. Order Cancellation & Automatic Full Refund:');
    const balBeforeCancel = db.prepare('SELECT balance FROM users WHERE id = ?').get(demoUserId).balance;

    const cancelRes = await request({
      path: `/api/admin/orders/${testOrderId}/cancel`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(cancelRes.status === 200, 'POST /api/admin/orders/:id/cancel cancels order');

    const balAfterCancel = db.prepare('SELECT balance FROM users WHERE id = ?').get(demoUserId).balance;
    assert(Math.abs(balAfterCancel - (balBeforeCancel + 3.00)) < 0.001, 'Full charge ($3.00) automatically refunded to customer wallet');

    const refundLedger = db.prepare(`
      SELECT * FROM financial_ledger 
      WHERE user_id = ? AND reference_id = ? AND transaction_type = 'order_refund'
    `).get(demoUserId, String(testOrderId));
    assert(refundLedger !== undefined, 'Immutable financial_ledger record created for full order refund');

    // ──────────────── 9. PARTIAL ORDER & AUTOMATIC PARTIAL REFUND ────────────────
    console.log('\n9. Partial Order & Automatic Partial Refund:');
    // Place a new order for partial test
    const partialOrderRes = await request({
      path: '/api/orders',
      method: 'POST',
      headers: { Authorization: `Bearer ${demoToken}` }
    }, {
      service_id: testServiceId,
      link: 'https://threads.net/@partial_test',
      quantity: 1000 // Charge is $3.00
    });
    const pOrderId = partialOrderRes.body?.order?.id;
    assert(pOrderId, 'New order placed for partial refund test');

    const balBeforePartial = db.prepare('SELECT balance FROM users WHERE id = ?').get(demoUserId).balance;

    // Admin changes status to partial with remains = 400 (400 / 1000 * $3.00 = $1.20 refund)
    const updatePartial = await request({
      path: `/api/admin/orders/${pOrderId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      status: 'partial',
      remains: 400
    });
    assert(updatePartial.status === 200, 'Admin marks order as partial with remains');

    const balAfterPartial = db.prepare('SELECT balance FROM users WHERE id = ?').get(demoUserId).balance;
    assert(Math.abs(balAfterPartial - (balBeforePartial + 1.20)) < 0.001, 'Partial refund ($1.20) credited to wallet for 400 remains');

    const partialLedger = db.prepare(`
      SELECT * FROM financial_ledger 
      WHERE user_id = ? AND reference_id = ? AND transaction_type = 'order_partial_refund'
    `).get(demoUserId, String(pOrderId));
    assert(partialLedger !== undefined, 'Immutable financial_ledger record created for partial refund');

    // ──────────────── 10. ORDER STATUS SYNCHRONIZATION ENGINE ────────────────
    console.log('\n10. Order Status Synchronization Engine:');
    const syncRes = await request({
      path: '/api/admin/orders/sync-status',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(syncRes.status === 200, 'POST /api/admin/orders/sync-status synchronizes orders with provider APIs');
    assert(syncRes.body?.hasOwnProperty('synced_count') || syncRes.body?.message, 'Sync status response contains synchronization metrics');

    // Clean up test entities
    if (testServiceId) {
      db.prepare('DELETE FROM orders WHERE service_id = ?').run(testServiceId);
      db.prepare('DELETE FROM services WHERE id = ?').run(testServiceId);
    }
    if (testCategoryId) {
      db.prepare('DELETE FROM categories WHERE id = ?').run(testCategoryId);
    }
    if (testPlatformId) {
      db.prepare('DELETE FROM social_media WHERE id = ?').run(testPlatformId);
    }

  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    if (server) server.close();
  }

  console.log('\n------------------------------------------------------------');
  console.log(`Phase 4 Test Results: ${passedTests} / ${totalTests} Passed`);
  console.log('------------------------------------------------------------\n');

  if (passedTests === totalTests && totalTests > 0) {
    console.log('🎉 PHASE 4 – SERVICE & ORDER MANAGEMENT: 100% VERIFIED!\n');
    process.exit(0);
  } else {
    console.error('❌ Some tests failed.');
    process.exit(1);
  }
}

runTests();

