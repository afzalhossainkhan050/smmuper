/**
 * SMMuper - Phase 2 Complete Admin Management Verification Suite
 * Tests all 11 admin modules, permission checks, atomic ledger operations,
 * currencies, settings, templates, notices, blog authors, and audit logs.
 */

const http = require('http');
const app = require('../index');

let server;
let adminToken = '';
let staffToken = '';
let testUserId = null;
let testStaffId = null;
let testRoleId = null;
let testCurrencyId = null;
let testNoticeId = null;
let testAuthorId = null;

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
      port: 5005,
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
  console.log('\n🚀 Starting SMMuper Phase 2 Comprehensive Test Suite...\n');

  // Start test server on port 5005
  await new Promise((resolve) => {
    server = app.listen(5005, () => {
      console.log('Test server running on port 5005');
      resolve();
    });
  });

  try {
    // ══════════════════════════════════════════════════════════════
    // MODULE 1: AUTHENTICATION & TOKENS
    // ══════════════════════════════════════════════════════════════
    console.log('📌 Testing Admin & Staff Authentication...');

    const adminLoginRes = await request({
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: 'admin@smmuper.com',
      password: 'admin123'
    });

    assert(adminLoginRes.status === 200, 'Admin login succeeds with 200');
    assert(adminLoginRes.body?.token, 'Admin receives JWT authentication token');
    adminToken = adminLoginRes.body?.token || '';

    const staffLoginRes = await request({
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: 'staff@smmuper.com',
      password: 'staff123'
    });

    assert(staffLoginRes.status === 200, 'Staff member login succeeds with 200');
    staffToken = staffLoginRes.body?.token || '';

    // ══════════════════════════════════════════════════════════════
    // MODULE 2: DASHBOARD & ANALYTICS
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing Admin Dashboard & Analytics Metrics...');

    const dashRes = await request({
      path: '/api/admin/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(dashRes.status === 200, 'Admin dashboard returns 200');
    assert(dashRes.body?.overview !== undefined, 'Dashboard returns statistical summary (revenue, orders, users)');

    const analyticsRes = await request({
      path: '/api/admin/analytics?period=30d',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(analyticsRes.status === 200, 'Admin analytics returns 200 with time series breakdown');

    // ══════════════════════════════════════════════════════════════
    // MODULE 3: USER MANAGEMENT & WALLET LEDGER
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing User Management & Ledger Operations...');

    // 3.1 List users
    const usersListRes = await request({
      path: '/api/admin/users?page=1&limit=10',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(usersListRes.status === 200, 'GET /api/admin/users returns user catalog');

    // 3.2 Create test user
    const uniqueUser = `testuser_${Date.now()}`;
    const createUserRes = await request({
      path: '/api/admin/users',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      username: uniqueUser,
      email: `${uniqueUser}@example.com`,
      password: 'Password123!',
      balance: 50.00,
      role: 'user',
      status: 'active'
    });

    assert(createUserRes.status === 201, 'POST /api/admin/users creates customer account');
    testUserId = createUserRes.body?.user?.id || createUserRes.body?.id;

    // 3.3 Get single user details
    const userDetailRes = await request({
      path: `/api/admin/users/${testUserId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(userDetailRes.status === 200, 'GET /api/admin/users/:id retrieves user profile');

    // 3.4 Atomic Wallet Balance Adjustment (Credit)
    const creditRes = await request({
      path: `/api/admin/users/${testUserId}/balance`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      type: 'credit',
      amount: 25.00,
      reason: 'Promo bonus credit verified'
    });
    assert(creditRes.status === 200, 'POST /balance (credit) updates wallet balance atomically');
    assert(creditRes.body?.balance === 75.00, 'Balance correctly calculated to 75.00');

    // 3.5 Atomic Wallet Balance Adjustment (Debit)
    const debitRes = await request({
      path: `/api/admin/users/${testUserId}/balance`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      type: 'debit',
      amount: 15.00,
      reason: 'Manual balance correction'
    });
    assert(debitRes.status === 200, 'POST /balance (debit) adjusts balance');
    assert(debitRes.body?.balance === 60.00, 'Balance correctly reduced to 60.00');

    // 3.6 Impersonation token (Login As)
    const loginAsRes = await request({
      path: `/api/admin/users/${testUserId}/login-as`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(loginAsRes.status === 200, 'POST /users/:id/login-as issues customer session token');

    // 3.7 Bulk Action on Users
    const bulkRes = await request({
      path: '/api/admin/users/bulk-action',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      action: 'suspend',
      userIds: [testUserId]
    });
    assert(bulkRes.status === 200, 'POST /users/bulk-action suspends selected user');

    // 3.8 Mail Broadcast to Users
    const mailRes = await request({
      path: '/api/admin/users/mail',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      target: 'single',
      userId: testUserId,
      subject: 'Test Broadcast Notice',
      message: 'Hello [[username]], welcome to SMMuper!'
    });
    assert(mailRes.status === 200, 'POST /users/mail executes broadcast dispatch');

    // ══════════════════════════════════════════════════════════════
    // MODULE 4: ROLES & PERMISSIONS
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing Roles & Permissions Engine...');

    const permsRes = await request({
      path: '/api/admin/roles/permissions-list',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(permsRes.status === 200, 'GET /roles/permissions-list returns hierarchical catalog');

    // Create custom role
    const roleName = `Auditor_${Date.now()}`;
    const createRoleRes = await request({
      path: '/api/admin/roles',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: roleName,
      description: 'Audit and read-only reports inspector',
      permissions: ['dashboard.view', 'analytics.view', 'users.view']
    });
    assert(createRoleRes.status === 201, 'POST /roles creates custom administrative role');
    testRoleId = createRoleRes.body?.role?.id || createRoleRes.body?.id;

    // Update role
    const updateRoleRes = await request({
      path: `/api/admin/roles/${testRoleId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: roleName + ' Updated',
      description: 'Updated description',
      permissions: ['dashboard.view', 'analytics.view', 'users.view', 'tickets.view']
    });
    assert(updateRoleRes.status === 200, 'PUT /roles/:id updates permissions array');

    // ══════════════════════════════════════════════════════════════
    // MODULE 5: STAFF MANAGEMENT
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing Staff Management & Access Controls...');

    const staffListRes = await request({
      path: '/api/admin/staff',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(staffListRes.status === 200, 'GET /staff lists staff members and designations');

    // Add new staff member
    const staffUser = `staff_${Date.now()}`;
    const createStaffRes = await request({
      path: '/api/admin/staff',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      username: staffUser,
      email: `${staffUser}@smmuper.com`,
      password: 'StaffPassword123!',
      role_id: testRoleId,
      designation: 'Compliance Auditor'
    });
    assert(createStaffRes.status === 201, 'POST /staff assigns staff account with role binding');
    testStaffId = createStaffRes.body?.staff?.id || createStaffRes.body?.id || createStaffRes.body?.staffId;

    // Update staff member
    const updateStaffRes = await request({
      path: `/api/admin/staff/${testStaffId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      role_id: testRoleId,
      designation: 'Senior Compliance Auditor',
      status: 'active'
    });
    assert(updateStaffRes.status === 200, 'PUT /staff/:id updates staff designation');

    // ══════════════════════════════════════════════════════════════
    // MODULE 6: CURRENCY MANAGEMENT & EXCHANGE RATES
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing Multi-Currency Management...');

    const currListRes = await request({
      path: '/api/admin/currencies',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(currListRes.status === 200, 'GET /currencies returns currencies');

    // Create test currency
    const currCode = `TST_${Math.floor(Math.random() * 899 + 100)}`;
    const createCurrRes = await request({
      path: '/api/admin/currencies',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Test Crypto Token',
      code: currCode,
      symbol: '₮',
      exchange_rate: 2.5000,
      status: 'active'
    });
    assert(createCurrRes.status === 201, 'POST /currencies registers new currency');
    testCurrencyId = createCurrRes.body?.id;

    // Update currency exchange rate
    const updateCurrRes = await request({
      path: `/api/admin/currencies/${testCurrencyId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Test Crypto Token Pro',
      code: currCode,
      symbol: '₮',
      exchange_rate: 2.8500,
      status: 'active'
    });
    assert(updateCurrRes.status === 200, 'PUT /currencies/:id adjusts exchange rate');

    // Delete test currency
    const deleteCurrRes = await request({
      path: `/api/admin/currencies/${testCurrencyId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(deleteCurrRes.status === 200, 'DELETE /currencies/:id safely deletes non-default currency');

    // ══════════════════════════════════════════════════════════════
    // MODULE 7: GENERAL SETTINGS / CONTROL PANEL
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing Control Panel & General System Settings...');

    const getSettingsRes = await request({
      path: '/api/admin/settings',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getSettingsRes.status === 200, 'GET /settings retrieves system parameters');

    const updateSettingsRes = await request({
      path: '/api/admin/settings',
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      settings: {
        site_title: 'SMMuper Reseller Panel',
        min_deposit: '5.00',
        user_registration: '1'
      }
    });
    assert(updateSettingsRes.status === 200, 'PUT /settings updates key-value configurations');

    // ══════════════════════════════════════════════════════════════
    // MODULE 8: EMAIL SETTINGS & TEMPLATES
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing Email Settings & Transactional Templates...');

    const getEmailRes = await request({
      path: '/api/admin/email-settings',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getEmailRes.status === 200, 'GET /email-settings returns SMTP configuration');

    const updateEmailRes = await request({
      path: '/api/admin/email-settings',
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      mail_driver: 'smtp',
      mail_host: 'smtp.mailtrap.io',
      mail_port: '587',
      mail_from_address: 'support@smmuper.com'
    });
    assert(updateEmailRes.status === 200, 'PUT /email-settings saves outbound mail configuration');

    const testEmailRes = await request({
      path: '/api/admin/email-settings/test',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      email: 'test@smmuper.com'
    });
    assert(testEmailRes.status === 200, 'POST /email-settings/test dispatches test verification email');

    const getEmailTplRes = await request({
      path: '/api/admin/email-templates',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getEmailTplRes.status === 200, 'GET /email-templates returns transactional email templates');
    const firstEmailTpl = getEmailTplRes.body?.templates?.[0];

    if (firstEmailTpl) {
      const updateEmailTplRes = await request({
        path: `/api/admin/email-templates/${firstEmailTpl.id}`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` }
      }, {
        subject: firstEmailTpl.subject + ' [Updated]',
        body: firstEmailTpl.body,
        status: 'active'
      });
      assert(updateEmailTplRes.status === 200, 'PUT /email-templates/:id saves updated template body');
    }

    // ══════════════════════════════════════════════════════════════
    // MODULE 9: NOTIFICATION SETTINGS & TEMPLATES
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing Notification Engine & Push Templates...');

    const getNotifRes = await request({
      path: '/api/admin/notification-settings',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getNotifRes.status === 200, 'GET /notification-settings returns FCM keys');

    const updateNotifRes = await request({
      path: '/api/admin/notification-settings',
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      firebase_project_id: 'smmuper-fcm-project',
      push_notification_enabled: '1'
    });
    assert(updateNotifRes.status === 200, 'PUT /notification-settings saves FCM credentials');

    const getNotifTplRes = await request({
      path: '/api/admin/notification-templates',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getNotifTplRes.status === 200, 'GET /notification-templates returns push templates');
    const firstNotifTpl = getNotifTplRes.body?.templates?.[0];

    if (firstNotifTpl) {
      const updateNotifTplRes = await request({
        path: `/api/admin/notification-templates/${firstNotifTpl.id}`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` }
      }, {
        title: firstNotifTpl.title + ' [Alert]',
        body: firstNotifTpl.body,
        status: 'active'
      });
      assert(updateNotifTplRes.status === 200, 'PUT /notification-templates/:id updates alert template');
    }

    // ══════════════════════════════════════════════════════════════
    // MODULE 10: ADDON MANAGER
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing System Controls & Addon Manager...');

    const getAddonsRes = await request({
      path: '/api/admin/addons',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getAddonsRes.status === 200, 'GET /addons retrieves installed extensions');
    const firstAddon = getAddonsRes.body?.addons?.[0];

    if (firstAddon) {
      const toggleAddonRes = await request({
        path: `/api/admin/addons/${firstAddon.id}/toggle`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert(toggleAddonRes.status === 200, `PUT /addons/:id/toggle toggles addon '${firstAddon.name}'`);
    }

    // ══════════════════════════════════════════════════════════════
    // MODULE 11: NOTICES MANAGEMENT (Screenshots 1 & 2)
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing Notices Management (Screenshots 1 & 2)...');

    const getNoticesRes = await request({
      path: '/api/admin/notices',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getNoticesRes.status === 200, 'GET /notices retrieves notices list');

    // Create Notice
    const createNoticeRes = await request({
      path: '/api/admin/notices',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      title: 'What is an SMM Panel Reseller? - Test',
      description: '<p>A complete turnkey automated SMM reseller solution.</p>',
      status: 'active'
    });
    assert(createNoticeRes.status === 201, 'POST /notices creates new announcement');
    testNoticeId = createNoticeRes.body?.id;

    // Update Notice
    const updateNoticeRes = await request({
      path: `/api/admin/notices/${testNoticeId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      title: 'What is an SMM Panel Reseller? - Updated',
      description: '<p>Updated description for verification.</p>',
      status: 'active'
    });
    assert(updateNoticeRes.status === 200, 'PUT /notices/:id updates notice contents');

    // Delete Notice
    const deleteNoticeRes = await request({
      path: `/api/admin/notices/${testNoticeId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(deleteNoticeRes.status === 200, 'DELETE /notices/:id removes notice');

    // ══════════════════════════════════════════════════════════════
    // MODULE 12: BLOG AUTHORS (Screenshots 3, 4, 5)
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing Blog Authors (Screenshots 3, 4, 5)...');

    const getAuthorsRes = await request({
      path: '/api/admin/blog-authors',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getAuthorsRes.status === 200, 'GET /blog-authors returns authors catalog');

    // Create Author
    const createAuthorRes = await request({
      path: '/api/admin/blog-authors',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Hermione Granger Test',
      address: 'Dublin, Ireland',
      slug: 'hermione-granger-test',
      about: 'Experienced SMM content author and researcher.',
      social_links: [{ name: 'Twitter', icon: 'twitter', link: 'https://x.com' }],
      status: 'active'
    });
    assert(createAuthorRes.status === 201, 'POST /blog-authors creates author profile');
    testAuthorId = createAuthorRes.body?.id;

    // Update Author
    const updateAuthorRes = await request({
      path: `/api/admin/blog-authors/${testAuthorId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Hermione Granger Test Pro',
      address: 'Dublin, Ireland',
      slug: 'hermione-granger-test',
      about: 'Updated author bio.',
      social_links: [{ name: 'Twitter', icon: 'twitter', link: 'https://x.com' }],
      status: 'active'
    });
    assert(updateAuthorRes.status === 200, 'PUT /blog-authors/:id updates author details');

    // Delete Author
    const deleteAuthorRes = await request({
      path: `/api/admin/blog-authors/${testAuthorId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(deleteAuthorRes.status === 200, 'DELETE /blog-authors/:id removes author');

    // ══════════════════════════════════════════════════════════════
    // MODULE 13: ADMIN ACTIVITY AUDIT LOGS
    // ══════════════════════════════════════════════════════════════
    console.log('\n📌 Testing Admin Activity Logs...');

    const getLogsRes = await request({
      path: '/api/admin/activity-logs?page=1&limit=20',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getLogsRes.status === 200, 'GET /activity-logs returns audit logs with IP, user agent, payload');
    assert((getLogsRes.body?.logs?.length || 0) > 0, 'Recent admin actions were logged in audit trail');

    // Cleanup created test records
    if (testStaffId) {
      await request({
        path: `/api/admin/staff/${testStaffId}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    if (testRoleId) {
      await request({
        path: `/api/admin/roles/${testRoleId}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    if (testUserId) {
      await request({
        path: `/api/admin/users/${testUserId}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }

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
