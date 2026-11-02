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

describe('End-to-End AC Website Integration Journey', () => {

  test('Step 1: Frontend SPA is served at root /', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('<div id="root"></div>'));
    assert.ok(html.includes('CoolAir Pro'));
  });

  test('Step 2: Service catalog lists all 7 required AC services', async () => {
    const res = await fetch(`${baseUrl}/api/services`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.length >= 7);

    const names = data.data.map(s => s.name);
    assert.ok(names.some(n => n.includes('Installation')));
    assert.ok(names.some(n => n.includes('Repair')));
    assert.ok(names.some(n => n.includes('Cleaning')));
    assert.ok(names.some(n => n.includes('Gas Refilling')));
    assert.ok(names.some(n => n.includes('Maintenance Packages')));
    assert.ok(names.some(n => n.includes('Emergency')));
    assert.ok(names.some(n => n.includes('Commercial')));
  });

  let customerToken = null;
  let customerUser = null;
  const uniqueCustomerEmail = `e2e_cust_${Date.now()}@example.com`;

  test('Step 3: Customer can register and receive authentication token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Emily Watson',
        email: uniqueCustomerEmail,
        phone: '+1-555-888-1212',
        password: 'Password@123',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data.token);
    assert.strictEqual(data.data.user.role, 'customer');
    customerToken = data.data.token;
    customerUser = data.data.user;
  });

  test('Step 4: Customer can log in with registered credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueCustomerEmail,
        password: 'Password@123',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.user.email, uniqueCustomerEmail);
  });

  let createdBooking = null;

  test('Step 5: Customer books an appointment and gets unique reference code', async () => {
    const servicesRes = await fetch(`${baseUrl}/api/services`);
    const servicesData = await servicesRes.json();
    const service = servicesData.data.find(s => s.slug === 'ac-servicing-cleaning');

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        service_id: service.id,
        customer_name: customerUser.name,
        customer_email: customerUser.email,
        customer_phone: customerUser.phone,
        address: '100 Ocean Drive, Suite 402',
        city: 'Metro City',
        preferred_date: '2026-11-20',
        preferred_time: '01:00 PM - 03:00 PM',
        ac_brand: 'Carrier',
        ac_type: 'Split AC',
        problem_description: 'Coil is musty and airflow is weak.',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data.reference_code.startsWith('AC-'));
    assert.strictEqual(data.data.status, 'pending');
    createdBooking = data.data;
  });

  test('Step 6: Customer checks booking status using reference code', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/status/${createdBooking.reference_code}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.reference_code, createdBooking.reference_code);
    assert.strictEqual(data.data.status, 'pending');
  });

  let adminToken = null;

  test('Step 7: Admin logs in successfully', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@acservice.com',
        password: 'Admin@123',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.user.role, 'admin');
    adminToken = data.data.token;
  });

  test('Step 8: Admin views dashboard overview metrics', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data.bookings.total >= 5);
  });

  test('Step 9: Admin confirms booking and assigns a technician', async () => {
    // 1. Get technicians list to select one
    const techsRes = await fetch(`${baseUrl}/api/technicians`);
    const techsData = await techsRes.json();
    const firstTech = techsData.data[0];

    // 2. Assign technician
    const assignRes = await fetch(`${baseUrl}/api/bookings/${createdBooking.id}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ technician_id: firstTech.user_id }),
    });

    assert.strictEqual(assignRes.status, 200);
    const assignData = await assignRes.json();
    assert.strictEqual(assignData.success, true);
    assert.strictEqual(assignData.data.status, 'assigned');

    // 3. Mark booking as completed
    const completeRes = await fetch(`${baseUrl}/api/bookings/${createdBooking.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'completed',
        admin_notes: 'Job completed smoothly. Evaporator sanitized and airflow verified.',
      }),
    });

    assert.strictEqual(completeRes.status, 200);
    const completeData = await completeRes.json();
    assert.strictEqual(completeData.data.status, 'completed');
  });

  test('Step 10: Customer submits review for completed appointment', async () => {
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        booking_id: createdBooking.id,
        reference_code: createdBooking.reference_code,
        rating: 5,
        customer_name: customerUser.name,
        comment: 'Technician was punctual and did an outstanding deep cleaning job! Air is ice cold now.',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.rating, 5);
  });

  test('Step 11: Customer contact message submission and admin moderation', async () => {
    // Submit message
    const contactRes = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Enterprise Client',
        email: 'facility@enterprise.com',
        phone: '+1-555-900-1100',
        subject: 'VRF Maintenance Inquiry',
        message: 'Looking for a maintenance quote on four 10-ton VRF multi-split systems.',
      }),
    });

    assert.strictEqual(contactRes.status, 201);
    const contactData = await contactRes.json();
    assert.strictEqual(contactData.success, true);

    // Admin marks as read
    const readRes = await fetch(`${baseUrl}/api/contact/${contactData.data.id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(readRes.status, 200);
    const readData = await readRes.json();
    assert.strictEqual(readData.data.is_read, 1);
  });

  test('Step 12: Admin updates site configuration settings dynamically', async () => {
    const updateRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        business_name: 'CoolAir Pro Climate Services',
        business_tagline: 'Precision Climate Control & Certified Master Technicians',
      }),
    });

    assert.strictEqual(updateRes.status, 200);

    // Verify public settings reflect update
    const publicSettingsRes = await fetch(`${baseUrl}/api/settings`);
    const publicSettings = await publicSettingsRes.json();
    assert.strictEqual(publicSettings.data.business_name, 'CoolAir Pro Climate Services');
  });

});
