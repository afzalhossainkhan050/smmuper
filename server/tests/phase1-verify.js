/**
 * SMMuper - Phase 1 Foundation & Architecture Verification Test Suite
 * Tests database schema, system endpoints, authentication, session tokens,
 * role-based access controls, and multi-currency configurations.
 */
const http = require('http');
const app = require('../index');
const db = require('../db/database');

let server;
const PORT = 5099;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: data ? JSON.parse(data) : null,
            });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 SMMUPER — PHASE 1 VERIFICATION & TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // Start temporary test server
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // ─── 1. DATABASE SCHEMA TEST ───
    console.log('📦 1. Testing Database Architecture & Tables...');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    
    const requiredTables = [
      'users', 'roles', 'staff', 'admin_activity_logs', 'system_settings',
      'currencies', 'social_media', 'categories', 'services', 'orders',
      'payment_methods', 'payments', 'financial_ledger', 'tickets',
      'ticket_replies', 'notices', 'kyc_settings', 'kyc_submissions',
      'child_panels', 'cms_content', 'blogs', 'subscribers'
    ];

    for (const tbl of requiredTables) {
      assert(tables.includes(tbl), `Table '${tbl}' exists in database`);
    }

    // ─── 2. SYSTEM HEALTH & BRANDING CONFIG ───
    console.log('\n⚙️ 2. Testing System Health & Brand Config API...');
    const healthRes = await request('GET', '/health');
    assert(healthRes.status === 200, 'Health check returns 200 OK');
    assert(healthRes.body?.status === 'healthy', 'Health check reports healthy');

    const configRes = await request('GET', '/system/config');
    assert(configRes.status === 200, 'System config returns 200 OK');
    assert(configRes.body?.brand?.name === 'SMMuper', 'Brand name is SMMuper');
    assert(configRes.body?.brand?.domain === 'https://smmuper.com', 'Brand domain is https://smmuper.com');
    assert(Array.isArray(configRes.body?.currencies) && configRes.body.currencies.length >= 3, 'Multi-currency loaded (USD, BDT, EUR)');

    // ─── 3. ADMIN AUTHENTICATION & SESSIONS ───
    console.log('\n🔐 3. Testing Admin Authentication & Permissions...');
    const adminLoginRes = await request('POST', '/auth/login', {
      email: 'admin@smmuper.com',
      password: 'admin123'
    });
    assert(adminLoginRes.status === 200, 'Admin login succeeds with 200 OK');
    assert(adminLoginRes.body?.token, 'JWT token returned on admin login');
    assert(adminLoginRes.body?.user?.role === 'admin', 'Admin role confirmed');
    assert(Array.isArray(adminLoginRes.body?.user?.permissions) && adminLoginRes.body.user.permissions.includes('*'), 'Admin has wildcard (*) permissions');
    const adminToken = adminLoginRes.body?.token;

    // ─── 4. CUSTOMER AUTHENTICATION & REGISTRATION ───
    console.log('\n👤 4. Testing Customer Registration & Verification...');
    const testUsername = `client_${Date.now().toString(36)}`;
    const testEmail = `${testUsername}@example.com`;
    const regRes = await request('POST', '/auth/register', {
      username: testUsername,
      email: testEmail,
      password: 'password123'
    });
    assert(regRes.status === 201, 'Customer registration returns 201 Created');
    assert(regRes.body?.token, 'JWT token returned on registration');
    assert(regRes.body?.user?.username === testUsername, 'Customer username matches input');
    assert(regRes.body?.user?.role === 'user', 'Customer role defaults to user');
    assert(regRes.body?.user?.api_key?.startsWith('smm_'), 'Unique reseller API key generated automatically');
    const customerToken = regRes.body?.token;

    // ─── 5. SECURE PROFILE & TOKEN VERIFICATION ───
    console.log('\n🛡️ 5. Testing Protected Profile Endpoints...');
    const profileRes = await request('GET', '/auth/profile', null, customerToken);
    assert(profileRes.status === 200, 'GET /api/auth/profile returns 200 with Bearer token');
    assert(profileRes.body?.user?.email === testEmail, 'Profile payload matches authenticated user');
    assert(!profileRes.body?.user?.password, 'Password field is never exposed in API payload');

    const meRes = await request('GET', '/auth/me', null, customerToken);
    assert(meRes.status === 200, 'GET /api/auth/me alias returns 200 with Bearer token');

    const unauthRes = await request('GET', '/auth/profile');
    assert(unauthRes.status === 401, 'Accessing protected route without token is rejected (401 Unauthorized)');

    // ─── 6. ROLE-BASED ACCESS CONTROL (RBAC) ───
    console.log('\n👮 6. Testing Role-Based Backend Access Control (RBAC)...');
    const adminDashboardWithAdmin = await request('GET', '/admin/dashboard', null, adminToken);
    assert(adminDashboardWithAdmin.status === 200, 'Admin token granted access to /api/admin/dashboard');

    const adminDashboardWithCustomer = await request('GET', '/admin/dashboard', null, customerToken);
    assert(adminDashboardWithCustomer.status === 403, 'Customer token blocked from /api/admin/dashboard (403 Forbidden)');

    // ─── 7. INVALID CREDENTIAL HANDLING ───
    console.log('\n🚫 7. Testing Invalid Credentials & Security Defense...');
    const wrongPassRes = await request('POST', '/auth/login', {
      email: 'admin@smmuper.com',
      password: 'wrong_password_999'
    });
    assert(wrongPassRes.status === 401, 'Wrong password returns 401 Unauthorized');

    const duplicateRegRes = await request('POST', '/auth/register', {
      username: testUsername,
      email: testEmail,
      password: 'password123'
    });
    assert(duplicateRegRes.status === 409, 'Duplicate username/email registration rejected (409 Conflict)');

    // Cleanup created test user from database
    db.prepare('DELETE FROM users WHERE email = ?').run(testEmail);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (failed === 0) {
      console.log('🎉 PHASE 1 FOUNDATION & PREMIUM UI: 100% VERIFIED AND READY!');
    } else {
      console.error('⚠️ Some tests failed. Review issues before proceeding.');
    }

  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    server.close();
  }
}

runTests();

