const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../index');

let server;
let baseUrl;

before((_, done) => {
  server = http.createServer(app);
  server.listen(0, () => {
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    done();
  });
});

after((_, done) => {
  server.close(done);
});

describe('AC Service Backend API Test Suite', () => {

  test('GET /api/health should return status healthy', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'healthy');
  });

  test('GET /api/services should return list of active AC services', async () => {
    const res = await fetch(`${baseUrl}/api/services`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 7, 'Expected at least 7 seeded AC services');
    
    // Check required services exist
    const slugs = body.data.map(s => s.slug);
    assert.ok(slugs.includes('ac-installation-setup'));
    assert.ok(slugs.includes('ac-repair-troubleshooting'));
    assert.ok(slugs.includes('ac-servicing-cleaning'));
    assert.ok(slugs.includes('gas-refilling'));
    assert.ok(slugs.includes('maintenance-packages'));
    assert.ok(slugs.includes('emergency-ac-repair'));
    assert.ok(slugs.includes('commercial-residential-service'));
  });

  test('GET /api/technicians should return technician team roster', async () => {
    const res = await fetch(`${baseUrl}/api/technicians`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 4);
    assert.ok(body.data[0].name);
    assert.ok(body.data[0].specialization);
  });

  test('GET /api/settings should return public business details', async () => {
    const res = await fetch(`${baseUrl}/api/settings`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.business_name);
    assert.ok(body.data.business_phone);
  });

  test('POST /api/bookings creates an appointment and returns reference code', async () => {
    const servicesRes = await fetch(`${baseUrl}/api/services`);
    const servicesData = await servicesRes.json();
    const firstService = servicesData.data[0];

    const payload = {
      service_id: firstService.id,
      customer_name: 'Test Customer Jane',
      customer_email: 'jane.test@example.com',
      customer_phone: '+1-555-444-3322',
      address: '777 Test Avenue, Apt 3',
      city: 'Testville',
      preferred_date: '2026-11-15',
      preferred_time: '10:00 AM - 12:00 PM',
      ac_brand: 'Mitsubishi',
      ac_type: 'Split AC',
      problem_description: 'Annual filter cleaning and efficiency check.',
    };

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.reference_code.startsWith('AC-'));
    assert.strictEqual(body.data.status, 'pending');

    // Verify status lookup works with generated reference code
    const statusRes = await fetch(`${baseUrl}/api/bookings/status/${body.data.reference_code}`);
    assert.strictEqual(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.strictEqual(statusBody.success, true);
    assert.strictEqual(statusBody.data.customer_name, 'Test Customer Jane');
  });

  test('POST /api/contact submits contact message', async () => {
    const payload = {
      name: 'John Inquiry',
      email: 'john.inquiry@example.com',
      phone: '+1-555-888-9999',
      subject: 'Commercial Duct Quote',
      message: 'Hello, looking for a quote for our restaurant central AC.',
    };

    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  test('Admin authentication and protected dashboard route', async () => {
    // 1. Login with seeded admin credentials
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@acservice.com',
        password: 'Admin@123',
      }),
    });

    assert.strictEqual(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.strictEqual(loginBody.success, true);
    assert.strictEqual(loginBody.data.user.role, 'admin');
    const token = loginBody.data.token;
    assert.ok(token);

    // 2. Fetch admin dashboard stats using JWT
    const dashRes = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(dashRes.status, 200);
    const dashBody = await dashRes.json();
    assert.strictEqual(dashBody.success, true);
    assert.ok(dashBody.data.bookings.total >= 4);
    assert.ok(dashBody.data.services_count >= 7);
  });

});
