const db = require('../config/database');
const bcrypt = require('bcryptjs');
const config = require('../config/settings');

console.log('Seeding database...');

// 1. Clear existing data
db.exec(`
  DELETE FROM reviews;
  DELETE FROM contact_messages;
  DELETE FROM bookings;
  DELETE FROM technicians_profile;
  DELETE FROM services;
  DELETE FROM users;
  DELETE FROM site_settings;
`);

// 2. Insert Admin User
const adminPassword = bcrypt.hashSync(config.adminPassword, 10);
const adminStmt = db.prepare(`
  INSERT INTO users (name, email, phone, password, role)
  VALUES (?, ?, ?, ?, ?)
`);
const adminResult = adminStmt.run(
  'Admin Director',
  config.adminEmail,
  config.businessPhone,
  adminPassword,
  'admin'
);
const adminId = adminResult.lastInsertRowid;
console.log(`Admin user created with ID ${adminId} (${config.adminEmail})`);

// 3. Insert Technicians (Users + Profiles)
const techData = [
  {
    name: 'Michael Torres',
    email: 'm.torres@coolairpro.com',
    phone: '+1-555-201-8841',
    password: bcrypt.hashSync('Tech@123', 10),
    role: 'technician',
    profile: {
      specialization: 'Central HVAC & Commercial Chillers',
      experience_years: 12,
      bio: 'EPA Universal Certified Master Technician with over a decade of commercial and high-tonnage chiller experience.',
      photo_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80',
      is_available: 1,
      rating: 4.9,
      jobs_completed: 482,
    },
  },
  {
    name: 'Sarah Jenkins',
    email: 's.jenkins@coolairpro.com',
    phone: '+1-555-201-9922',
    password: bcrypt.hashSync('Tech@123', 10),
    role: 'technician',
    profile: {
      specialization: 'Inverter Split AC & Gas Diagnostics',
      experience_years: 8,
      bio: 'Precision diagnostics expert specialized in eco-refrigerant leak detection, inverter motherboards, and compressor restorations.',
      photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      is_available: 1,
      rating: 4.95,
      jobs_completed: 341,
    },
  },
  {
    name: 'David Kim',
    email: 'd.kim@coolairpro.com',
    phone: '+1-555-201-7733',
    password: bcrypt.hashSync('Tech@123', 10),
    role: 'technician',
    profile: {
      specialization: 'Emergency Repairs & Fast Dispatch',
      experience_years: 9,
      bio: 'On-call emergency specialist. Known for ultra-fast troubleshooting and same-day cooling restoration under extreme heat conditions.',
      photo_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
      is_available: 1,
      rating: 4.88,
      jobs_completed: 395,
    },
  },
  {
    name: 'Carlos Mendez',
    email: 'c.mendez@coolairpro.com',
    phone: '+1-555-201-6644',
    password: bcrypt.hashSync('Tech@123', 10),
    role: 'technician',
    profile: {
      specialization: 'Ductwork & New System Installation',
      experience_years: 6,
      bio: 'NATE-certified installation specialist delivering clean ductwork fabrication, aesthetic indoor unit mounting, and balanced airflow.',
      photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      is_available: 1,
      rating: 4.85,
      jobs_completed: 214,
    },
  },
];

const techUserIds = [];
for (const t of techData) {
  const userRes = adminStmt.run(t.name, t.email, t.phone, t.password, t.role);
  const uId = userRes.lastInsertRowid;
  techUserIds.push(uId);

  db.prepare(`
    INSERT INTO technicians_profile (user_id, specialization, experience_years, bio, photo_url, is_available, rating, jobs_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uId,
    t.profile.specialization,
    t.profile.experience_years,
    t.profile.bio,
    t.profile.photo_url,
    t.profile.is_available,
    t.profile.rating,
    t.profile.jobs_completed
  );
}
console.log(`Created ${techUserIds.length} technician profiles.`);

// 4. Insert Demo Customer Users
const custPassword = bcrypt.hashSync('Customer@123', 10);
const demoCust1 = adminStmt.run('Alice Walker', 'alice@example.com', '+1-555-987-1122', custPassword, 'customer').lastInsertRowid;
const demoCust2 = adminStmt.run('Robert Sterling', 'robert@example.com', '+1-555-987-3344', custPassword, 'customer').lastInsertRowid;
console.log('Created demo customer accounts.');

// 5. Insert Services
const services = [
  {
    name: 'AC Installation and Setup',
    slug: 'ac-installation-setup',
    short_description: 'Precision mounting, electrical wiring, copper tubing, and initial test calibration for all AC types.',
    description: 'Our certified technicians provide turnkey AC installation services for high-efficiency split units, multi-zone ductless systems, window ACs, and central HVAC packages. Includes load calculation, outdoor bracket mounting, vibration dampers, copper line flaring, nitrogen pressure holding test, and complete manufacturer warranty validation.',
    icon: 'wrench',
    price_starting: 149.00,
    price_label: 'Starting from',
    duration: '2 - 4 Hours',
    category: 'both',
    display_order: 1,
  },
  {
    name: 'AC Repair and Troubleshooting',
    slug: 'ac-repair-troubleshooting',
    short_description: 'Rapid diagnostic and repairs for no-cooling, weird noises, sensor faults, and compressor issues.',
    description: 'Is your AC blowing warm air, making buzzing sounds, or tripping the breaker? Our master technicians diagnose problems down to the root cause using digital manifold gauges and thermal cameras. We repair capacitors, contactors, fan motors, control boards, expansion valves, and electrical relays on the spot with genuine OEM parts.',
    icon: 'tool',
    price_starting: 79.00,
    price_label: 'Starting from',
    duration: '1 - 2 Hours',
    category: 'both',
    display_order: 2,
  },
  {
    name: 'AC Servicing and Deep Cleaning',
    slug: 'ac-servicing-cleaning',
    short_description: 'High-pressure foam coil wash, anti-bacterial blower disinfection, and drain line flushing.',
    description: 'Restore factory-fresh cooling efficiency and eliminate mold odors with our comprehensive deep wash. We dismantle casing, apply eco-friendly antimicrobial foam to evaporator fins, high-pressure jet wash the condenser coil, unclog condensate drain traps, and calibrate thermostat accuracy to lower electricity bills by up to 25%.',
    icon: 'sparkles',
    price_starting: 59.00,
    price_label: 'Starting from',
    duration: '45 - 90 Mins',
    category: 'residential',
    display_order: 3,
  },
  {
    name: 'Gas Refilling & Leak Detection',
    slug: 'gas-refilling',
    short_description: 'Electronic refrigerant leak detection, vacuum evacuation, and pure R32/R410A gas top-up.',
    description: 'Low refrigerant causes ice formation on coils and damages compressors. Our team performs nitrogen pressure hold tests, pinpoints pinhole leaks using ultrasonic detectors, brazes joints securely, evacuates the system with a deep micron vacuum pump, and recharges exact refrigerant quantities specified by the factory plate.',
    icon: 'gauge',
    price_starting: 89.00,
    price_label: 'Starting from',
    duration: '1 - 2 Hours',
    category: 'both',
    display_order: 4,
  },
  {
    name: 'AC Maintenance Packages',
    slug: 'maintenance-packages',
    short_description: 'Annual Maintenance Contracts (AMC) with quarterly tune-ups, filter swaps, and priority dispatch.',
    description: 'Keep your cooling systems protected all year long. Our preventive maintenance plans include 4 seasonal tune-ups, 24-point electrical and mechanical safety audits, chemical filter cleanings, priority booking slots during peak summer, and a 15% discount on all spare parts and emergency repair visits.',
    icon: 'shield-check',
    price_starting: 199.00,
    price_label: 'Annual Contract',
    duration: 'Yearly Plan',
    category: 'both',
    display_order: 5,
  },
  {
    name: 'Emergency 24/7 AC Repair',
    slug: 'emergency-ac-repair',
    short_description: 'Guaranteed 60-minute emergency dispatch for unbearable heatwaves and medical cooling needs.',
    description: 'When temperatures soar and your air conditioner fails in the middle of the night or on a holiday weekend, our rapid-response emergency fleet is ready. Fully stocked vans with replacement compressors, universal capacitors, and refrigerants dispatched immediately to bring your space back to comfortable temperatures.',
    icon: 'flame',
    price_starting: 99.00,
    price_label: 'Immediate Dispatch',
    duration: 'Within 60 Mins',
    category: 'both',
    display_order: 6,
  },
  {
    name: 'Commercial & Residential HVAC',
    slug: 'commercial-residential-service',
    short_description: 'Full-spectrum engineering for retail shops, server rooms, clinics, offices, and luxury residences.',
    description: 'Dedicated commercial HVAC team for VRV/VRF multi-systems, rooftop packaged units, ductable cassettes, and critical computer room air conditioners (CRAC). We provide custom maintenance SLAs, energy compliance reporting, air balance balancing, and minimal downtime scheduling for business continuity.',
    icon: 'building-2',
    price_starting: 299.00,
    price_label: 'Custom Quote / From',
    duration: 'Custom Scope',
    category: 'commercial',
    display_order: 7,
  },
];

const serviceIds = [];
const serviceStmt = db.prepare(`
  INSERT INTO services (name, slug, short_description, description, icon, price_starting, price_label, duration, category, is_active, display_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
`);

for (const s of services) {
  const res = serviceStmt.run(
    s.name,
    s.slug,
    s.short_description,
    s.description,
    s.icon,
    s.price_starting,
    s.price_label,
    s.duration,
    s.category,
    s.display_order
  );
  serviceIds.push(res.lastInsertRowid);
}
console.log(`Created ${serviceIds.length} AC services.`);

// 6. Insert Seed Bookings with various realistic statuses
const sampleBookings = [
  {
    ref: 'AC-78A1B2',
    custId: demoCust1,
    serviceId: serviceIds[1], // Repair
    name: 'Alice Walker',
    email: 'alice@example.com',
    phone: '+1-555-987-1122',
    address: '450 Lexington Ave, Apt 14B',
    city: 'Metro City',
    date: '2026-10-30',
    time: '10:00 AM - 12:00 PM',
    brand: 'Daikin',
    type: 'Inverter Split AC',
    problem: 'Unit is running but not cooling the master bedroom. Airflow feels weak and slightly warm.',
    status: 'in_progress',
    techId: techUserIds[1], // Sarah Jenkins
    price: 89.00,
    notes: 'Technician on route with digital manifold and leak detector.',
  },
  {
    ref: 'AC-92C3D4',
    custId: demoCust2,
    serviceId: serviceIds[0], // Installation
    name: 'Robert Sterling',
    email: 'robert@example.com',
    phone: '+1-555-987-3344',
    address: '128 Willow Creek Way',
    city: 'Metro City',
    date: '2026-10-31',
    time: '02:00 PM - 04:00 PM',
    brand: 'Mitsubishi Electric',
    type: 'Multi-Split System',
    problem: 'New 2-ton multi-split system needs installation in living room and den.',
    status: 'assigned',
    techId: techUserIds[3], // Carlos Mendez
    price: 249.00,
    notes: 'Confirmed dual-wall mounting brackets needed.',
  },
  {
    ref: 'AC-15E5F6',
    custId: null,
    serviceId: serviceIds[2], // Servicing
    name: 'Marcus Vance',
    email: 'marcus.v@example.com',
    phone: '+1-555-443-8899',
    address: '88 Harbor Boulevard, Suite 501',
    city: 'Metro City',
    date: '2026-11-02',
    time: '09:00 AM - 11:00 AM',
    brand: 'Carrier',
    type: 'Central Ducted',
    problem: 'Seasonal pre-winter filter change and evaporator sanitization requested.',
    status: 'pending',
    techId: null,
    price: 69.00,
    notes: null,
  },
  {
    ref: 'AC-44K7L8',
    custId: null,
    serviceId: serviceIds[3], // Gas Refilling
    name: 'Helena Troy',
    email: 'helena.t@example.com',
    phone: '+1-555-667-1199',
    address: '77 Oak Park Drive',
    city: 'Metro City',
    date: '2026-10-25',
    time: '11:00 AM - 01:00 PM',
    brand: 'LG',
    type: 'Dual Inverter Split',
    problem: 'Ice building up on brass piping. Coils are freezing over.',
    status: 'completed',
    techId: techUserIds[0], // Michael Torres
    price: 119.00,
    notes: 'Pinhole flare leak tightened and topped up with 650g R410A. Cooling tested to 54°F vent temp.',
  },
];

const bookingStmt = db.prepare(`
  INSERT INTO bookings (
    reference_code, customer_id, service_id, customer_name, customer_email,
    customer_phone, address, city, preferred_date, preferred_time,
    ac_brand, ac_type, problem_description, status, technician_id,
    admin_notes, total_price
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const bookingIds = [];
for (const b of sampleBookings) {
  const res = bookingStmt.run(
    b.ref,
    b.custId,
    b.serviceId,
    b.name,
    b.email,
    b.phone,
    b.address,
    b.city,
    b.date,
    b.time,
    b.brand,
    b.type,
    b.problem,
    b.status,
    b.techId,
    b.notes,
    b.price
  );
  bookingIds.push(res.lastInsertRowid);
}
console.log(`Created ${bookingIds.length} sample bookings.`);

// 7. Insert Approved Reviews
const sampleReviews = [
  {
    custId: demoCust1,
    bookingId: bookingIds[3],
    serviceId: serviceIds[3],
    rating: 5,
    name: 'Helena Troy',
    comment: 'Michael was fantastic! Found a tiny leak that two previous companies missed. My living room has never been colder. Fair pricing and transparent quote.',
    approved: 1,
  },
  {
    custId: null,
    bookingId: bookingIds[0],
    serviceId: serviceIds[1],
    rating: 5,
    name: 'David Greenfield',
    comment: 'Quick same-day response when our compressor stalled during a 95-degree heatwave. Sarah had the correct capacitor on her truck and fixed it within 40 minutes.',
    approved: 1,
  },
  {
    custId: null,
    bookingId: bookingIds[1],
    serviceId: serviceIds[0],
    rating: 5,
    name: 'Samantha Ruiz',
    comment: 'Impressed by how neat and tidy Carlos was during the new ductless split installation. Put down drop cloths, vacuumed the wall drillings, and explained the remote settings.',
    approved: 1,
  },
  {
    custId: null,
    bookingId: bookingIds[2],
    serviceId: serviceIds[2],
    rating: 4,
    name: 'Jonathan Miller',
    comment: 'Solid jet-spray cleaning. The musty odor coming from the vents is completely gone now. Will definitely renew their maintenance package.',
    approved: 1,
  },
];

const reviewStmt = db.prepare(`
  INSERT INTO reviews (customer_id, booking_id, service_id, rating, comment, customer_name, is_approved)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const r of sampleReviews) {
  reviewStmt.run(r.custId, r.bookingId, r.serviceId, r.rating, r.comment, r.name, r.approved);
}
console.log(`Created ${sampleReviews.length} approved reviews.`);

// 8. Insert Sample Contact Messages
const sampleContacts = [
  {
    name: 'Greg Higgins',
    email: 'greg.higgins@businesscorp.com',
    phone: '+1-555-492-8812',
    subject: 'Commercial HVAC Contract for 3-Floor Office',
    message: 'Hello, we are looking for a yearly maintenance contract covering 14 cassette units across three floors. Please send commercial pricing details.',
    is_read: 0,
  },
  {
    name: 'Patricia Gomez',
    email: 'patricia.g@gmail.com',
    phone: '+1-555-883-9901',
    subject: 'Quote for Ducted System Replacement',
    message: 'Our 15-year old central system is making loud rattling noises. Would like an on-site estimate to replace it with a high efficiency heat pump.',
    is_read: 1,
  },
];

const contactStmt = db.prepare(`
  INSERT INTO contact_messages (name, email, phone, subject, message, is_read)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const c of sampleContacts) {
  contactStmt.run(c.name, c.email, c.phone, c.subject, c.message, c.is_read);
}
console.log(`Created ${sampleContacts.length} contact inquiries.`);

// 9. Configure Default Site Settings
const settingsData = {
  business_name: 'CoolAir Pro Services',
  business_tagline: 'Reliable Climate Solutions & Certified AC Technicians',
  business_phone: '+1 (555) 321-4321',
  business_emergency_phone: '+1 (555) 911-COOL',
  business_email: 'support@coolairpro.com',
  business_address: '742 Evergreen Terrace, Suite 300',
  business_city: 'Metro City, NY 10001',
  business_whatsapp: '15553214321',
  business_hours: 'Monday – Sunday: 7:00 AM – 10:00 PM (Emergency 24/7 Dispatch)',
  service_radius: 'Serving Metro City & Greater Metropolitan Area (35-mile radius)',
  emergency_guarantee: 'Guaranteed 60-Minute Rapid Response for Emergencies',
  license_number: 'HVAC Master License #NY-884920-A',
  google_maps_embed: 'https://maps.google.com/maps?q=40.712776,-74.005974&hl=es;z=14&output=embed',
};

const settingsStmt = db.prepare(`
  INSERT INTO site_settings (setting_key, setting_value)
  VALUES (?, ?)
`);

for (const [key, value] of Object.entries(settingsData)) {
  settingsStmt.run(key, value);
}
console.log('Site settings populated successfully.');
console.log('Database seeding finished successfully!');
