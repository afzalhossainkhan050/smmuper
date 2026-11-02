const http = require('http');
const db = require('../db/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smm_uper_jwt_secret_key_2024_xK9mP2nQ7wR4tY6u';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed === 'object' && !parsed.data) {
            parsed.data = { ...parsed };
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

function makeToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('       SMMUPER - PHASE 5 VERIFICATION TEST SUITE       ');
  console.log('   WALLET, PAYMENT GATEWAYS & FINANCIAL LEDGER ENGINE  ');
  console.log('======================================================\n');

  // 1. Setup test users
  const adminUser = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!adminUser) throw new Error('No admin user found in database');
  const adminToken = makeToken(adminUser);

  let testCustomer = db.prepare("SELECT * FROM users WHERE role = 'user' AND username = 'phase5_customer'").get();
  if (!testCustomer) {
    const res = db.prepare(`
      INSERT INTO users (username, email, password, balance, role, status)
      VALUES ('phase5_customer', 'phase5_cust@smmuper.com', 'hashedpass', 10.00, 'user', 'active')
    `).run();
    testCustomer = db.prepare('SELECT * FROM users WHERE id = ?').get(res.lastInsertRowid);
  }
  const customerToken = makeToken(testCustomer);

  console.log('[SECTION 1] Payment Gateways & Methods Discovery');
  // 1.1 Customer gets active payment methods
  const methodsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/methods',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  assert(methodsRes.status === 200, 'GET /api/payments/methods returns 200 OK');
  assert(Array.isArray(methodsRes.body.data.methods) && methodsRes.body.data.methods.length >= 4, 'Returns seeded payment methods list');
  const bkashMethod = methodsRes.body.data.methods.find(m => m.code.includes('bkash'));
  assert(!!bkashMethod && bkashMethod.type === 'manual', 'bKash is registered as a manual payment gateway');
  const stripeMethod = methodsRes.body.data.methods.find(m => m.code.includes('stripe'));
  assert(!!stripeMethod && stripeMethod.type === 'automatic', 'Stripe is registered as an automatic payment gateway');

  console.log('\n[SECTION 2] Admin Payment Gateway Management (CRUD)');
  // 2.1 Admin lists all payment gateways
  const adminMethodsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/payment-methods',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminMethodsRes.status === 200, 'GET /api/admin/payment-methods returns 200 OK');
  assert(Array.isArray(adminMethodsRes.body.data.methods), 'Admin retrieves full gateway list');

  // 2.2 Admin creates a custom manual gateway
  const testGatewayCode = 'nagad_test_' + Date.now();
  const newGatewayRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/payment-methods',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
  }, {
    name: 'Nagad Merchant Express',
    code: testGatewayCode,
    type: 'manual',
    currency: 'BDT',
    exchange_rate: 120.0,
    min_amount: 5.0,
    max_amount: 1000.0,
    percentage_charge: 1.5,
    fixed_charge: 0.10,
    instructions: 'Pay to Nagad Merchant 01700-112233',
    parameters: { merchant_number: '01700-112233' },
    status: 1
  });
  assert(newGatewayRes.status === 201, 'POST /api/admin/payment-methods creates manual gateway (201 Created)');
  const createdGatewayId = newGatewayRes.body.data.method.id;

  // 2.3 Admin updates the gateway
  const updateGatewayRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/payment-methods/${createdGatewayId}`,
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
  }, {
    name: 'Nagad Merchant Express (Updated)',
    exchange_rate: 121.5
  });
  assert(updateGatewayRes.status === 200, 'PUT /api/admin/payment-methods/:id updates gateway parameters');
  assert(updateGatewayRes.body.data.method.exchange_rate === 121.5, 'Exchange rate successfully updated');

  // 2.4 Toggle status
  const toggleRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/payment-methods/${createdGatewayId}/toggle`,
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(toggleRes.status === 200, 'PUT /api/admin/payment-methods/:id/toggle toggles status');
  assert(toggleRes.body.data.status === 'inactive' || toggleRes.body.data.status === 0, 'Status switched to inactive');

  console.log('\n[SECTION 3] Customer Manual Deposit & Duplicate Guard');
  // 3.1 Customer submits manual deposit request via bKash
  const initialCustomerBalance = db.prepare('SELECT balance FROM users WHERE id = ?').get(testCustomer.id).balance;
  const uniqueTrxId = 'BKASH_TEST_' + Date.now();

  const depositRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/deposit',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' }
  }, {
    amount: 50.00,
    method_code: 'bkash',
    transaction_id: uniqueTrxId,
    payer_details: { sender_phone: '01711223344' },
    notes: 'Test manual deposit via bKash app'
  });
  assert(depositRes.status === 201, 'POST /api/payments/deposit submits manual deposit (201 Created)');
  assert(depositRes.body.data.status === 'pending', 'Deposit is marked pending admin review');
  assert(depositRes.body.data.is_manual === true, 'Flagged as manual gateway');

  // Verify wallet balance NOT modified yet
  const balanceAfterManual = db.prepare('SELECT balance FROM users WHERE id = ?').get(testCustomer.id).balance;
  assert(balanceAfterManual === initialCustomerBalance, 'Wallet balance remains unchanged while deposit is pending');

  const pendingPaymentId = depositRes.body.data.payment.id;

  // 3.2 Duplicate Transaction ID submission prevention
  const dupDepositRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/deposit',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' }
  }, {
    amount: 50.00,
    method_code: 'bkash',
    transaction_id: uniqueTrxId,
    payer_details: { sender_phone: '01711223344' }
  });
  assert(dupDepositRes.status === 409, 'Duplicate TrxID rejected with 409 Conflict');

  console.log('\n[SECTION 4] Admin Approval Workflow & Ledger Invariance');
  // 4.1 Admin lists pending payments
  const pendingQueueRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/payments/pending',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(pendingQueueRes.status === 200, 'GET /api/admin/payments/pending returns pending queue');
  const foundInQueue = pendingQueueRes.body.data.payments.find(p => p.id === pendingPaymentId);
  assert(!!foundInQueue, 'Pending deposit request appears in admin pending queue');

  // 4.2 Admin approves payment
  const approveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/payments/${pendingPaymentId}/approve`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
  }, {
    feedback: 'bKash merchant statement verified'
  });
  assert(approveRes.status === 200, 'POST /api/admin/payments/:id/approve approves payment');
  assert(approveRes.body.data.payment.status === 'completed', 'Payment status transitions to completed');

  // Verify atomic wallet credit
  const balanceAfterApproval = db.prepare('SELECT balance FROM users WHERE id = ?').get(testCustomer.id).balance;
  const expectedNewBal = Math.round((initialCustomerBalance + 50.00) * 100) / 100;
  assert(balanceAfterApproval === expectedNewBal, `User wallet atomically credited with $50.00 (New balance: $${balanceAfterApproval})`);

  // Verify immutable financial ledger entry
  const ledgerEntry = db.prepare(`
    SELECT * FROM financial_ledger
    WHERE user_id = ? AND reference_id = ? AND transaction_type = 'deposit'
  `).get(testCustomer.id, uniqueTrxId);
  assert(!!ledgerEntry, 'Immutable financial ledger recorded deposit entry');
  assert(ledgerEntry.amount === 50.00, 'Ledger recorded correct deposit amount');
  assert(ledgerEntry.balance_before === initialCustomerBalance, 'Ledger preserved exact balance_before');
  assert(ledgerEntry.balance_after === expectedNewBal, 'Ledger preserved exact balance_after');

  console.log('\n[SECTION 5] Automatic Gateway Instant Topup Simulation');
  // 5.1 Customer deposits via automatic gateway (Stripe)
  const autoTrxId = 'STRIPE_AUTO_' + Date.now();
  const autoDepositRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/deposit',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' }
  }, {
    amount: 30.00,
    method_code: 'stripe',
    transaction_id: autoTrxId
  });
  assert(autoDepositRes.status === 201, 'POST /api/payments/deposit via automatic gateway succeeds (201 Created)');
  assert(autoDepositRes.body.data.status === 'completed', 'Automatic gateway marks payment completed instantly');
  assert(autoDepositRes.body.data.is_manual === false, 'Identified as automated gateway');

  const balanceAfterAuto = db.prepare('SELECT balance FROM users WHERE id = ?').get(testCustomer.id).balance;
  const expectedAutoBal = Math.round((balanceAfterApproval + 30.00) * 100) / 100;
  assert(balanceAfterAuto === expectedAutoBal, `User wallet immediately credited with $30.00 (New balance: $${balanceAfterAuto})`);

  console.log('\n[SECTION 6] Customer Financial Ledger & Receipts');
  // 6.1 Customer views their personal immutable transaction ledger
  const customerLedgerRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/transactions',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  assert(customerLedgerRes.status === 200, 'GET /api/payments/transactions returns 200 OK');
  assert(Array.isArray(customerLedgerRes.body.data.transactions) && customerLedgerRes.body.data.transactions.length >= 2, 'Customer retrieves personal financial ledger');
  assert(customerLedgerRes.body.data.summary.total_credited >= 80.00, 'Ledger summary accurately reflects total credited funds');

  // 6.2 Customer generates payment receipt
  const receiptRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/payments/${pendingPaymentId}/receipt`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  assert(receiptRes.status === 200, 'GET /api/payments/:id/receipt returns 200 OK');
  assert(receiptRes.body.data.receipt.receipt_number === `RCP-${String(pendingPaymentId).padStart(6, '0')}`, 'Generates correct formatted receipt number');
  assert(receiptRes.body.data.receipt.financials.amount === 50.00, 'Receipt details exact financial figures');

  console.log('\n[SECTION 7] Admin Rejection Flow & Balance Protection');
  // 7.1 Customer submits another manual deposit
  const rejectTrxId = 'REJECT_TEST_' + Date.now();
  const subRejectRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/deposit',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' }
  }, {
    amount: 100.00,
    method_code: 'bkash',
    transaction_id: rejectTrxId,
    payer_details: { sender_phone: '01800998877' }
  });
  const rejectPaymentId = subRejectRes.body.data.payment.id;
  const balanceBeforeReject = db.prepare('SELECT balance FROM users WHERE id = ?').get(testCustomer.id).balance;

  // 7.2 Admin rejects payment with feedback
  const rejectActionRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/payments/${rejectPaymentId}/reject`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
  }, {
    feedback: 'Transaction ID not found in bKash merchant statement'
  });
  assert(rejectActionRes.status === 200, 'POST /api/admin/payments/:id/reject rejects payment');
  assert(rejectActionRes.body.data.payment.status === 'rejected', 'Payment status updated to rejected');

  const balanceAfterReject = db.prepare('SELECT balance FROM users WHERE id = ?').get(testCustomer.id).balance;
  assert(balanceAfterReject === balanceBeforeReject, 'Rejected payment does NOT modify customer balance');

  console.log('\n[SECTION 8] Admin Global Financial Ledger & Profit Reports');
  // 8.1 Admin global transactions ledger
  const adminLedgerRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/transactions',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminLedgerRes.status === 200, 'GET /api/admin/transactions returns platform-wide ledger');
  assert(Array.isArray(adminLedgerRes.body.data.transactions), 'Transactions array returned');

  // 8.2 Filter by type
  const filterLedgerRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/transactions?type=deposit',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(filterLedgerRes.status === 200, 'GET /api/admin/transactions?type=deposit filters ledger by type');
  assert(filterLedgerRes.body.data.transactions.every(t => t.transaction_type === 'deposit'), 'All returned rows match type deposit');

  // 8.3 Financial Profit & Loss Reports
  const profitReportsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/financial-reports',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(profitReportsRes.status === 200, 'GET /api/admin/financial-reports returns 200 OK');
  const summary = profitReportsRes.body.data.reports.summary;
  assert(summary !== undefined && typeof summary.order_revenue === 'number', 'Summary contains numeric order_revenue');
  assert(typeof summary.provider_cost === 'number', 'Summary contains numeric wholesale provider_cost');
  assert(typeof summary.gross_profit === 'number', 'Summary contains numeric gross_profit');
  assert(typeof summary.net_profit === 'number', 'Summary contains numeric net_profit');
  assert(Array.isArray(profitReportsRes.body.data.reports.daily_breakdown), 'Includes 30-day daily breakdown');

  // Clean up created test gateway
  await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/payment-methods/${createdGatewayId}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
