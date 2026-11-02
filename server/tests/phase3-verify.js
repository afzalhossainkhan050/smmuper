/**
 * SMMuper - Phase 3 Multi-Provider API Engine Verification Suite
 * Verifies centralized SMM v2 protocol, connection tests, balance synchronization,
 * service catalog importing, rate markup calculations, idempotency engine, and masked logs.
 */

const http = require('http');
const app = require('../index');
const providerEngine = require('../services/providerEngine');
const db = require('../db/database');

let server;
let adminToken = '';
let testProviderId = null;

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
      port: 5006,
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
  console.log('\n🚀 Starting SMMuper Phase 3 Multi-Provider API Engine Verification Suite...\n');

  // Start test server on port 5006
  await new Promise((resolve) => {
    server = app.listen(5006, () => {
      console.log('Test server running on port 5006');
      resolve();
    });
  });

  try {
    // ══════════════════════════════════════════════════════════════
    // MODULE 1: AUTHENTICATION
    // ══════════════════════════════════════════════════════════════
    console.log('📌 1. Admin Authentication for Provider Controls...');

    const adminLoginRes = await request({
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: 'admin@smmuper.com',
      password: 'admin123'
    });

    assert(adminLoginRes.status === 200, 'Admin login succeeds with 200 OK');
    assert(adminLoginRes.body?.token, 'Admin receives JWT authentication token');
    adminToken = adminLoginRes.body?.token || '';

    // ══════════════════════════════════════════════════════════════
    // MODULE 2: PROVIDER MANAGEMENT (CRUD)
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 2. Testing Provider Listing & Statistics...');

    const getProvidersRes = await request({
      path: '/api/admin/providers',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(getProvidersRes.status === 200, 'GET /api/admin/providers returns 200 OK');
    assert(Array.isArray(getProvidersRes.body?.providers), 'Returns array of registered API providers');
    assert(getProvidersRes.body?.stats?.total >= 4, 'Includes pre-seeded SMM providers (vipsmmpro, smmworldpanel, etc.)');
    assert(getProvidersRes.body?.providers[0]?.masked_key?.includes('••••'), 'Provider API keys are masked for security');

    console.log('\n📌 3. Creating New API Provider...');
    const uniqueProvName = `provider_${Date.now()}`;
    const createProvRes = await request({
      path: '/api/admin/providers',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: uniqueProvName,
      api_url: 'https://test-provider.smmuper.com/api/v2',
      api_key: 'smm_test_secret_key_998877665544',
      currency: 'USD',
      conversion_rate: 1.0,
      status: 'active',
      description: 'Automated test provider connection'
    });

    assert(createProvRes.status === 201, 'POST /api/admin/providers registers new provider with 201');
    testProviderId = createProvRes.body?.id;
    assert(testProviderId !== undefined, 'Provider ID generated successfully');

    console.log('\n📌 4. Fetching Single Provider Details...');
    const singleProvRes = await request({
      path: `/api/admin/providers/${testProviderId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(singleProvRes.status === 200, 'GET /api/admin/providers/:id returns provider');
    assert(singleProvRes.body?.provider?.name === uniqueProvName, 'Provider name matches input');
    assert(singleProvRes.body?.provider?.status === 'active', 'Initial status is active');

    console.log('\n📌 5. Updating Provider Configuration...');
    const updateProvRes = await request({
      path: `/api/admin/providers/${testProviderId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: uniqueProvName + '_updated',
      currency: 'INR',
      conversion_rate: 83.95,
      status: 'active',
      description: 'Updated conversion rate to 83.95 INR/USD'
    });

    assert(updateProvRes.status === 200, 'PUT /api/admin/providers/:id updates currency and conversion rate');

    // ══════════════════════════════════════════════════════════════
    // MODULE 3: CONNECTION TESTING & LIVE BALANCE
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 6. Testing Provider Live Connection & Handshake...');

    const testConnRes = await request({
      path: `/api/admin/providers/${testProviderId}/test-connection`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(testConnRes.status === 200, 'POST /test-connection performs live handshake (HTTP 200)');
    assert(testConnRes.body?.responseTimeMs !== undefined, 'Measures round-trip API latency in ms');
    assert(testConnRes.body?.balance !== undefined, 'Returns live provider wallet balance');

    console.log('\n📌 7. Checking & Updating Provider Wallet Balance in DB...');
    const checkBalRes = await request({
      path: `/api/admin/providers/${testProviderId}/check-balance`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(checkBalRes.status === 200, 'POST /check-balance fetches remote balance');
    assert(checkBalRes.body?.balance !== undefined, 'Returns updated balance');

    // ══════════════════════════════════════════════════════════════
    // MODULE 4: SERVICE DISCOVERY & IMPORT
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 8. Querying Remote Provider Services Catalog...');

    const remoteServicesRes = await request({
      path: `/api/admin/providers/${testProviderId}/remote-services`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(remoteServicesRes.status === 200, 'GET /remote-services parses provider catalog');
    assert(Array.isArray(remoteServicesRes.body?.services), 'Returns services array');
    assert(remoteServicesRes.body?.services?.length > 0, 'Discovered standard SMM services from provider');

    const sampleService = remoteServicesRes.body?.services[0];
    assert(sampleService?.service !== undefined, 'Service contains remote ID');
    assert(sampleService?.rate !== undefined, 'Service contains provider wholesale rate');
    assert(sampleService?.category !== undefined, 'Service contains category');

    console.log('\n📌 9. Importing Services with Automatic Margin Calculation...');
    const importRes = await request({
      path: `/api/admin/providers/${testProviderId}/import-services`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      serviceIds: [101, 102, 201],
      markupPercent: 35, // 35% profit margin
      autoCreateCategories: true
    });

    assert(importRes.status === 200, 'POST /import-services imports services into platform catalog');
    assert(importRes.body?.importedCount > 0, 'New services mapped and saved to database');

    // Verify imported service exists in services table
    const importedInDb = db.prepare(`
      SELECT * FROM services WHERE provider_id = ? AND provider_service_id = '101'
    `).get(testProviderId);

    assert(importedInDb !== undefined, 'Service #101 successfully mapped in local services table');
    assert(importedInDb?.provider_id === testProviderId, 'Foreign key provider_id matches');
    assert(importedInDb?.rate > importedInDb?.original_rate, 'Customer selling rate reflects profit markup');

    console.log('\n📌 10. Synchronizing Mapped Services (Price & Limit Sync)...');
    const syncRes = await request({
      path: `/api/admin/providers/${testProviderId}/sync-services`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      markupPercent: 40 // adjusted margin
    });

    assert(syncRes.status === 200, 'POST /sync-services synchronizes mapped services');
    assert(syncRes.body?.totalLocal >= 3, 'Evaluated all mapped services for this provider');

    // ══════════════════════════════════════════════════════════════
    // MODULE 5: SMART PROVIDER ENGINE (IDEMPOTENCY & DISPATCH)
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 11. Testing Smart Provider Engine Order Submission...');

    const providerRecord = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(testProviderId);

    const submitOrder1 = await providerEngine.submitOrder(providerRecord, {
      serviceId: '101',
      link: 'https://instagram.com/smmuper_official',
      quantity: 1000
    });

    assert(submitOrder1.success === true, 'Smart Provider Engine dispatches order to provider');
    assert(submitOrder1.orderId !== undefined, 'Provider returns unique order ID');

    console.log('\n📌 12. Testing Idempotency & Duplicate Prevention...');
    // Submitting exact same parameters within 60s window
    const submitOrderDuplicate = await providerEngine.submitOrder(providerRecord, {
      serviceId: '101',
      link: 'https://instagram.com/smmuper_official',
      quantity: 1000
    });

    assert(submitOrderDuplicate.cached === true, 'Idempotency engine caught duplicate submission');
    assert(submitOrderDuplicate.orderId === submitOrder1.orderId, 'Prevented double charge / second provider submission');

    console.log('\n📌 13. Testing Order Status Checks (Single & Batch)...');
    const orderStatusRes = await providerEngine.checkOrderStatus(providerRecord, submitOrder1.orderId);
    assert(orderStatusRes.status !== undefined, 'Single order status query returns status (e.g. Completed)');
    assert(orderStatusRes.startCount !== undefined, 'Returns start count metric');

    const batchStatusRes = await providerEngine.checkMultipleOrders(providerRecord, [submitOrder1.orderId, '99999']);
    assert(batchStatusRes[submitOrder1.orderId] !== undefined, 'Batch status returns map of order statuses');

    console.log('\n📌 14. Testing Refill & Cancellation Protocols...');
    const refillRes = await providerEngine.requestRefill(providerRecord, submitOrder1.orderId);
    assert(refillRes.refill !== undefined, 'Provider accepts refill request and returns refill ID');

    const cancelRes = await providerEngine.requestCancel(providerRecord, [submitOrder1.orderId]);
    assert(Array.isArray(cancelRes) && cancelRes.length > 0, 'Provider accepts cancel request and returns cancellation report');

    // ══════════════════════════════════════════════════════════════
    // MODULE 6: SECURE PROVIDER AUDIT LOGS
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 15. Testing Provider Audit Logs & Key Masking...');

    const getLogsRes = await request({
      path: `/api/admin/providers/${testProviderId}/logs?page=1&limit=20`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(getLogsRes.status === 200, 'GET /providers/:id/logs returns log history');
    assert(getLogsRes.body?.logs?.length > 0, 'API interactions logged in provider_logs table');

    // Verify key masking in request logs
    const firstLog = getLogsRes.body?.logs[0];
    assert(firstLog.request_data.includes('••••'), 'Secret API key is masked in request log payload');
    assert(!firstLog.request_data.includes('smm_test_secret_key'), 'Raw API secret is never stored in plain text in logs');

    console.log('\n📌 16. Clearing Provider Logs...');
    const clearLogsRes = await request({
      path: `/api/admin/providers/${testProviderId}/logs`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(clearLogsRes.status === 200, 'DELETE /providers/:id/logs clears log history');

    // ══════════════════════════════════════════════════════════════
    // MODULE 7: PROVIDER CLEANUP & DELETION
    // ═══════════════════════════════════════════════════════════
    console.log('\n📌 17. Deleting Test Provider & Verifying Safe Unlinking...');
    const deleteProvRes = await request({
      path: `/api/admin/providers/${testProviderId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(deleteProvRes.status === 200, 'DELETE /api/admin/providers/:id removes provider');

    // Check that services were safely unlinked, not deleted
    const unlinkedService = db.prepare(`
      SELECT * FROM services WHERE id = ?
    `).get(importedInDb.id);

    assert(unlinkedService !== undefined, 'Local service preserved in catalog');
    assert(unlinkedService.provider_id === null, 'provider_id safely set to NULL on deletion');

    // Clean up test service
    db.prepare('DELETE FROM services WHERE id = ?').run(importedInDb.id);

  } catch (error) {
    console.error('Fatal test error:', error);
  } finally {
    console.log(`\n══════════════════════════════════════════════════════════════`);
    console.log(`🎯 Test Summary: ${passedTests}/${totalTests} Passed (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`══════════════════════════════════════════════════════════════\n`);
    server.close();
  }
}

runTests();

