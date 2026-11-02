const http = require('http');
const db = require('../db/database');
const { generateTOTP } = require('../utils/totp');

const BASE_URL = 'http://localhost:5000';
let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
  }
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;

    const headers = {
      ...(options.headers || {})
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

const payload = (r) => (r && r.data && r.data.data !== undefined) ? r.data.data : (r ? r.data : {});

async function runPhase6Tests() {
  console.log('\n============================================================');
  console.log('🚀 SMMUPER PHASE 6: CUSTOMER DASHBOARD & PROTOCOL VERIFICATION');
  console.log('============================================================\n');

  const timestamp = Date.now();
  let adminToken = '';
  let customer1Token = '';
  let customer2Token = '';
  let customer1 = null;
  let customer2 = null;

  try {
    // ──────────────── 1. AUTHENTICATION SETUP ────────────────
    console.log('--- Step 1: Authentication & Test Accounts Setup ---');
    const adminLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@smmuper.com', password: 'admin123' }
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.data?.token, 'Admin login successfully');
    adminToken = adminLoginRes.data.token;

    // Register Referrer (Customer 1)
    const ref1Res = await request('/api/auth/register', {
      method: 'POST',
      body: {
        username: `referrer_${timestamp}`,
        email: `referrer_${timestamp}@smmuper.com`,
        password: 'Password123!'
      }
    });
    assert(ref1Res.status === 201 && ref1Res.data?.user?.referral_code, 'Customer 1 registered with unique referral code');
    customer1 = ref1Res.data.user;
    customer1Token = ref1Res.data.token;

    // Deposit funds for Customer 1 to test wallet
    db.prepare('UPDATE users SET balance = 50.0 WHERE id = ?').run(customer1.id);

    // Register Referee (Customer 2) with referral code
    const ref2Res = await request('/api/auth/register', {
      method: 'POST',
      body: {
        username: `referee_${timestamp}`,
        email: `referee_${timestamp}@smmuper.com`,
        password: 'Password123!',
        ref: customer1.referral_code
      }
    });
    assert(ref2Res.status === 201, 'Customer 2 registered using Customer 1 referral code');
    customer2 = ref2Res.data.user;
    customer2Token = ref2Res.data.token;

    // Verify referral link in DB
    const refereeDb = db.prepare('SELECT referred_by FROM users WHERE id = ?').get(customer2.id);
    assert(refereeDb.referred_by === customer1.id, 'Customer 2 permanently linked to Customer 1 in database (referred_by)');

    // ──────────────── 2. REFERRAL PROGRAM & COMMISSIONS ────────────────
    console.log('\n--- Step 2: Referral Engine & Instant Ledger Commissions ---');
    const cust1ReferralsInitial = await request('/api/referrals', {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert(cust1ReferralsInitial.status === 200, 'Customer 1 referral dashboard accessible');
    const refData1 = payload(cust1ReferralsInitial);
    assert(refData1?.stats?.referred_count === 1, 'Referred count reflects Customer 2 (count=1)');
    assert(refData1?.referral_url && refData1.referral_url.includes(customer1.referral_code), 'Unique referral URL generated');

    // Deposit funds for Customer 2 to place an order
    db.prepare('UPDATE users SET balance = 20.0 WHERE id = ?').run(customer2.id);

    // Get an active service
    const activeService = db.prepare("SELECT id, name, rate, min_quantity, max_quantity FROM services WHERE status = 'active' OR status = 1 LIMIT 1").get();
    assert(!!activeService, 'Found active service for commission testing');

    // Place an order as Customer 2
    const initialReferrerBalance = db.prepare('SELECT balance FROM users WHERE id = ?').get(customer1.id).balance;
    const orderQty = 1000;
    const expectedCharge = (activeService.rate * orderQty) / 1000;
    const orderPlacementRes = await request('/api/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer2Token}` },
      body: {
        service_id: activeService.id,
        link: 'https://instagram.com/phase6_test',
        quantity: orderQty
      }
    });
    assert(orderPlacementRes.status === 201, 'Customer 2 placed order successfully');
    const orderPayload = payload(orderPlacementRes);
    const placedOrderId = orderPayload?.order?.id;

    // Check referrer balance credit
    const updatedReferrerBalance = db.prepare('SELECT balance FROM users WHERE id = ?').get(customer1.id).balance;
    const currentRate = parseFloat(db.prepare("SELECT value FROM system_settings WHERE key = 'referral_commission_rate'").get()?.value || '5.0');
    const expectedCommission = Math.round((expectedCharge * (currentRate / 100)) * 10000) / 10000;
    assert(updatedReferrerBalance > initialReferrerBalance, 'Referrer wallet credited automatically on order placement');
    assert(Math.abs(updatedReferrerBalance - (initialReferrerBalance + expectedCommission)) < 0.01, `Correct ${currentRate}% commission credited (expected ~${expectedCommission})`);

    // Verify immutable financial ledger entry
    const ledgerRow = db.prepare("SELECT * FROM financial_ledger WHERE user_id = ? AND transaction_type = 'referral_commission' ORDER BY id DESC LIMIT 1").get(customer1.id);
    assert(!!ledgerRow, 'Immutable financial_ledger entry created for referral commission');
    assert(ledgerRow.reference_id === String(placedOrderId), 'Financial ledger row links directly to placed order ID');

    // Verify referral_commissions table entry
    const refCommRow = db.prepare('SELECT * FROM referral_commissions WHERE referrer_id = ? AND order_id = ?').get(customer1.id, placedOrderId);
    assert(refCommRow && refCommRow.status === 'credited', 'Referral commissions log row status marked as credited');

    // Verify Customer 1 referral dashboard shows the new earnings
    const cust1ReferralsAfter = await request('/api/referrals', {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    const refDataAfter = payload(cust1ReferralsAfter);
    assert(refDataAfter?.stats?.total_earned > 0, 'Customer referral dashboard total_earned updated');
    assert(refDataAfter?.recent_commissions?.length > 0, 'Recent commission record visible in dashboard');

    // ──────────────── 3. TWO-FACTOR AUTHENTICATION (2FA) ────────────────
    console.log('\n--- Step 3: RFC 6238 TOTP Engine & Two-Factor Authentication ---');
    // Generate 2FA Secret
    const gen2FARes = await request('/api/auth/2fa/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    const gen2FAPayload = payload(gen2FARes);
    assert(gen2FARes.status === 200 && gen2FAPayload?.secret, '2FA secret generated successfully');
    const totpSecret = gen2FAPayload?.secret;
    assert(!!gen2FAPayload?.qr_code_url, '2FA QR code URL provided for authenticator apps');

    // Generate valid TOTP code using pure crypto TOTP engine
    const validCode = generateTOTP(totpSecret);
    assert(validCode && validCode.length === 6, 'Valid 6-digit TOTP code generated');

    // Try enabling with invalid code
    const invalidEnableRes = await request('/api/auth/2fa/enable', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { secret: totpSecret, code: '000000' }
    });
    assert(invalidEnableRes.status === 400, 'Invalid TOTP code rejected with 400 Bad Request');

    // Enable with valid code
    const enable2FARes = await request('/api/auth/2fa/enable', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { secret: totpSecret, code: validCode }
    });
    assert(enable2FARes.status === 200, '2FA successfully activated on Customer 1 account');

    // Verify DB flag
    const user2FAFlag = db.prepare('SELECT two_factor_enabled FROM users WHERE id = ?').get(customer1.id);
    assert(user2FAFlag.two_factor_enabled === 1, 'two_factor_enabled flag is 1 in users table');

    // Try standard login: must prompt for 2FA challenge
    const login2FARes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: customer1.email, password: 'Password123!' }
    });
    assert(login2FARes.status === 200 && login2FARes.data?.requires_2fa === true, 'Login intercepts 2FA-enabled account and requires 2FA challenge');
    assert(!!login2FARes.data?.temp_token, 'Temporary short-lived token issued for 2FA challenge');
    const tempToken = login2FARes.data.temp_token;

    // Verify with wrong code
    const verifyWrongCodeRes = await request('/api/auth/2fa/verify-login', {
      method: 'POST',
      body: { temp_token: tempToken, code: '123456' }
    });
    assert(verifyWrongCodeRes.status === 401, 'Wrong 2FA code rejected during login challenge');

    // Verify with correct code
    const freshCode = generateTOTP(totpSecret);
    const verifyLoginRes = await request('/api/auth/2fa/verify-login', {
      method: 'POST',
      body: { temp_token: tempToken, code: freshCode }
    });
    assert(verifyLoginRes.status === 200 && verifyLoginRes.data?.token, 'Login challenge resolved with correct TOTP code; full session JWT returned');

    // Disable 2FA
    const disableCode = generateTOTP(totpSecret);
    const disable2FARes = await request('/api/auth/2fa/disable', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { password: 'Password123!', code: disableCode }
    });
    assert(disable2FARes.status === 200, '2FA disabled successfully using password and current TOTP code');

    // ──────────────── 4. RESELLER API v2 PROTOCOL ────────────────
    console.log('\n--- Step 4: SMM Standard Protocol v2 (/api/v2 & /api/user-api) ---');
    // Retrieve API key
    const apiKeyRes = await request('/api/user-api/key', {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    const keyPayload = payload(apiKeyRes);
    assert(apiKeyRes.status === 200 && keyPayload?.api_key, 'Customer secret reseller API key retrieved');
    const userApiKey = keyPayload.api_key;

    // 4.1 Balance Action
    const apiBalanceRes = await request('/api/v2', {
      method: 'POST',
      body: { key: userApiKey, action: 'balance' }
    });
    assert(apiBalanceRes.status === 200, 'v2 action=balance returned HTTP 200');
    assert(apiBalanceRes.data?.balance !== undefined && apiBalanceRes.data?.currency === 'USD', 'v2 balance response includes balance and currency');

    // 4.2 Services Action
    const apiServicesRes = await request('/api/v2', {
      method: 'POST',
      body: { key: userApiKey, action: 'services' }
    });
    assert(apiServicesRes.status === 200 && Array.isArray(apiServicesRes.data), 'v2 action=services returned standard services array');
    assert(apiServicesRes.data[0]?.service && apiServicesRes.data[0]?.rate, 'Service item contains service ID and rate');

    // 4.3 Add Order Action
    const apiAddOrderRes = await request('/api/v2', {
      method: 'POST',
      body: {
        key: userApiKey,
        action: 'add',
        service: activeService.id,
        link: 'https://youtube.com/watch?v=phase6_test',
        quantity: 1000
      }
    });
    assert(apiAddOrderRes.status === 200 && apiAddOrderRes.data?.order, 'v2 action=add created order successfully and returned { order: ID }');
    const v2OrderId = apiAddOrderRes.data.order;

    // 4.4 Status Action (Single)
    const apiStatusSingleRes = await request('/api/v2', {
      method: 'POST',
      body: {
        key: userApiKey,
        action: 'status',
        order: v2OrderId
      }
    });
    assert(apiStatusSingleRes.status === 200 && apiStatusSingleRes.data?.status, 'v2 action=status returned order status');
    assert(apiStatusSingleRes.data?.charge !== undefined, 'v2 action=status contains charge');

    // 4.5 Status Action (Multiple Comma-Separated)
    const apiStatusMultiRes = await request('/api/v2', {
      method: 'POST',
      body: {
        key: userApiKey,
        action: 'status',
        orders: `${v2OrderId},999999`
      }
    });
    assert(apiStatusMultiRes.status === 200 && typeof apiStatusMultiRes.data === 'object', 'v2 action=status with multiple orders returned dictionary');
    assert(apiStatusMultiRes.data[String(v2OrderId)]?.status, 'Multiple orders status includes target order details');

    // 4.6 Refill Action
    const apiRefillRes = await request('/api/v2', {
      method: 'POST',
      body: {
        key: userApiKey,
        action: 'refill',
        order: v2OrderId
      }
    });
    assert(apiRefillRes.status === 200 && apiRefillRes.data?.refill, 'v2 action=refill created refill task and returned { refill: ID }');
    const v2RefillId = apiRefillRes.data.refill;

    // 4.7 Refill Status Action
    const apiRefillStatusRes = await request('/api/v2', {
      method: 'POST',
      body: {
        key: userApiKey,
        action: 'refill_status',
        refill: v2RefillId
      }
    });
    assert(apiRefillStatusRes.status === 200 && apiRefillStatusRes.data?.status, 'v2 action=refill_status returned refill state');

    // 4.8 Invalid API Key Protection
    const invalidKeyRes = await request('/api/v2', {
      method: 'POST',
      body: { key: 'invalid_key_xyz', action: 'balance' }
    });
    assert(invalidKeyRes.status === 401 && invalidKeyRes.data?.error, 'Unauthorized API key safely blocked with error');

    // 4.9 Regenerate API Key
    const regenKeyRes = await request('/api/user-api/key/regenerate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    const regenPayload = payload(regenKeyRes);
    assert(regenKeyRes.status === 200 && regenPayload?.api_key !== userApiKey, 'Reseller API key regenerated successfully');
    const newApiKey = regenPayload.api_key;

    // Old key should now fail
    const oldKeyTryRes = await request('/api/v2', {
      method: 'POST',
      body: { key: userApiKey, action: 'balance' }
    });
    assert(oldKeyTryRes.status === 401, 'Old API key invalidated immediately after regeneration');

    // New key should succeed
    const newKeyTryRes = await request('/api/v2', {
      method: 'POST',
      body: { key: newApiKey, action: 'balance' }
    });
    assert(newKeyTryRes.status === 200, 'New regenerated API key authenticates successfully');

    // ──────────────── 5. SUPPORT TICKETS & THREAD ISOLATION ────────────────
    console.log('\n--- Step 5: Support Tickets Workflow & Isolation Boundary ---');
    // Customer 1 opens ticket
    const openTicketRes = await request('/api/tickets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: {
        subject: `Order Refill Request #${timestamp}`,
        priority: 'high',
        message: 'Hello Support, followers for my Instagram campaign dropped by 50 count. Please refill.'
      }
    });
    const openTicketPayload = payload(openTicketRes);
    assert(openTicketRes.status === 201 && openTicketPayload?.ticket?.id, 'Customer 1 created support ticket');
    const ticketId = openTicketPayload.ticket.id;

    // Customer 1 retrieves ticket details
    const getTicketCust1Res = await request(`/api/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    const cust1TicketPayload = payload(getTicketCust1Res);
    assert(getTicketCust1Res.status === 200 && cust1TicketPayload?.ticket?.id === ticketId, 'Customer 1 can read own ticket details');

    // Customer 2 tries to read Customer 1's ticket (Data Isolation Boundary Test)
    const getTicketCust2Res = await request(`/api/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${customer2Token}` }
    });
    assert(getTicketCust2Res.status === 404, 'Security Boundary: Customer 2 is blocked from reading Customer 1 ticket (404 Not Found)');

    // Admin views tickets
    const adminGetTicketsRes = await request('/api/admin/tickets', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminTicketsPayload = payload(adminGetTicketsRes);
    assert(adminGetTicketsRes.status === 200 && adminTicketsPayload?.tickets?.length > 0, 'Admin can view all support tickets');

    // Admin views single ticket thread
    const adminGetThreadRes = await request(`/api/admin/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminThreadPayload = payload(adminGetThreadRes);
    assert(adminGetThreadRes.status === 200 && adminThreadPayload?.ticket?.id === ticketId, 'Admin can view ticket thread with customer balance info');

    // Admin replies to ticket
    const adminReplyRes = await request(`/api/admin/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        message: 'Dear Customer, we have verified your drop and submitted an instant refill task to our wholesale network.'
      }
    });
    assert(adminReplyRes.status === 201, 'Admin staff replied to ticket');

    // Ticket status should be 'answered'
    const ticketAnsweredDb = db.prepare('SELECT status FROM tickets WHERE id = ?').get(ticketId);
    assert(ticketAnsweredDb.status === 'answered', 'Ticket status automatically marked as answered after admin reply');

    // Customer 1 views thread and sees staff reply
    const custThreadAfterAdmin = await request(`/api/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    const custRepliesPayload = payload(custThreadAfterAdmin);
    assert(custRepliesPayload?.replies?.length === 1, 'Customer sees staff reply in message thread');
    assert(custRepliesPayload?.replies[0]?.role === 'admin', 'Reply author marked with role admin');

    // Customer 1 replies back
    const custReplyRes = await request(`/api/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: {
        message: 'Thank you for the quick resolution!'
      }
    });
    assert(custReplyRes.status === 201, 'Customer replied to answered ticket');

    // Ticket status should now be 'pending' (awaiting staff)
    const ticketPendingDb = db.prepare('SELECT status FROM tickets WHERE id = ?').get(ticketId);
    assert(ticketPendingDb.status === 'pending', 'Ticket status set to pending after customer response');

    // Customer closes ticket
    const closeTicketRes = await request(`/api/tickets/${ticketId}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert(closeTicketRes.status === 200, 'Customer marked ticket as closed');

    // Attempt to reply to closed ticket must fail
    const replyClosedRes = await request(`/api/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: { message: 'Attempt to reply to closed ticket' }
    });
    assert(replyClosedRes.status === 400, 'Replies to closed ticket are rejected with 400 Bad Request');

    // ──────────────── 6. ADMIN REFERRAL CONTROLS ────────────────
    console.log('\n--- Step 6: Admin Referral Commission Settings & Global Audit ---');
    // Admin reads referrals
    const adminReferralsRes = await request('/api/admin/referrals', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminRefPayload = payload(adminReferralsRes);
    assert(adminReferralsRes.status === 200 && adminRefPayload?.commissions?.length > 0, 'Admin sees logged commission history');
    assert(adminRefPayload?.stats?.total_commissions_paid > 0, 'Admin sees total paid commission statistics');

    // Admin updates referral settings to 7.5%
    const updateRefSettingsRes = await request('/api/admin/referrals/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        referral_commission_rate: 7.5,
        referral_system_enabled: true
      }
    });
    assert(updateRefSettingsRes.status === 200, 'Admin updated global referral commission percentage to 7.5%');

    // Verify Customer sees the updated 7.5% rate
    const custCheckRateRes = await request('/api/referrals', {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    const custRatePayload = payload(custCheckRateRes);
    assert(custRatePayload?.commission_rate === 7.5, 'Updated commission rate (7.5%) immediately visible in customer dashboard');

    // ──────────────── 7. PROFILE & USER SECURITY ────────────────
    console.log('\n--- Step 7: Profile Updates, Contact Info & Password Lifecycle ---');
    const updateProfileRes = await request('/api/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: {
        phone: '+880 1700-123456',
        address: '123 Gulshan Ave, Dhaka, Bangladesh'
      }
    });
    assert(updateProfileRes.status === 200, 'Customer updated phone and billing address');
    const updatedProfilePayload = payload(updateProfileRes);
    const updatedProfileUser = updatedProfilePayload?.user || updatedProfilePayload;
    assert(updatedProfileUser.phone === '+880 1700-123456', 'Phone number persisted in database');
    assert(updatedProfileUser.address === '123 Gulshan Ave, Dhaka, Bangladesh', 'Address persisted in database');

    // Change Password
    const changePassRes = await request('/api/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customer1Token}` },
      body: {
        currentPassword: 'Password123!',
        newPassword: 'BrandNewSecurePass456!'
      }
    });
    assert(changePassRes.status === 200, 'Customer changed password successfully');

    // Try logging in with old password (must fail)
    const oldLoginTry = await request('/api/auth/login', {
      method: 'POST',
      body: { email: customer1.email, password: 'Password123!' }
    });
    assert(oldLoginTry.status === 401, 'Login with old password fails with 401 Unauthorized');

    // Login with new password (must succeed)
    const newLoginTry = await request('/api/auth/login', {
      method: 'POST',
      body: { email: customer1.email, password: 'BrandNewSecurePass456!' }
    });
    assert(newLoginTry.status === 200 && newLoginTry.data?.token, 'Login with new password succeeds');

    // Customer cannot access admin endpoint
    const forbiddenAdminTry = await request('/api/admin/users', {
      headers: { Authorization: `Bearer ${customer1Token}` }
    });
    assert(forbiddenAdminTry.status === 403, 'Security Boundary: Customer cannot access admin management endpoints (403 Forbidden)');

  } catch (err) {
    console.error('\n❌ Unexpected verification error:', err);
    failedCount++;
  }

  console.log('\n============================================================');
  console.log(`PHASE 6 TEST RESULTS: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log('============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase6Tests();
