/**
 * Seed script — Dave's Ultimate Automotive
 *
 * Populates the database with initial services, reviews, admin user,
 * sample customers and appointments.  Idempotent: skips if data already exists.
 *
 * Usage:  npm run seed   (or)   node server/db/seed.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const bcrypt = require('bcryptjs');
const db = require('./database');

// ---------------------------------------------------------------------------
// Helper — check if a table already has rows
// ---------------------------------------------------------------------------
function tableHasRows(table) {
  const row = db.prepare(`SELECT COUNT(*) AS cnt FROM ${table}`).get();
  return row.cnt > 0;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
const locations = [
  { name: 'Cedar Park', phone: '737-313-0149', address: '1403 W. Whitestone Blvd', city_state_zip: 'Cedar Park, TX 78613', hours: 'Mon-Fri 7:30am-6:00pm | Closed Weekends', rating_count: '650+' },
  { name: 'Central Austin', phone: '737-313-1662', address: '4926 N Lamar Blvd', city_state_zip: 'Austin, TX 78751', hours: 'Mon-Fri 7:30am-6:00pm | Closed Weekends', rating_count: '700+' },
  { name: 'Leander', phone: '512-548-3424', address: '10935 E Crystal Falls Pkwy Ste. 200', city_state_zip: 'Leander, TX 78641', hours: 'Mon-Fri 7:30am-6:00pm | Closed Weekends', rating_count: '500+' },
  { name: 'North Austin', phone: '737-727-3359', address: '2711 W Howard Ln', city_state_zip: 'Austin, TX 78728', hours: 'Mon-Fri 7:30am-6:00pm | Closed Weekends', rating_count: '775+' },
  { name: 'Pflugerville', phone: '737-265-3609', address: '900 Pecan St W', city_state_zip: 'Pflugerville, TX 78660', hours: 'Mon-Fri 7:30am-6:00pm | Closed Weekends', rating_count: '875+' },
  { name: 'Round Rock', phone: '512-798-0487', address: '2601 S I-35 Suite 100', city_state_zip: 'Round Rock, TX 78664', hours: 'Mon-Fri 7:30am-6:00pm | Closed Weekends', rating_count: '675+' },
  { name: 'South Austin', phone: '737-343-8522', address: '2617 S. First Street', city_state_zip: 'Austin, TX 78704', hours: 'Mon-Fri 7:30am-6:00pm | Closed Weekends', rating_count: '675+' },
];
const services = [
  {
    name: 'Oil Change',
    description: 'Conventional oil and filter change to keep your engine running smooth. Includes a multi-point inspection.',
    duration_minutes: 30,
    category: 'Maintenance',
    icon: 'oil-drop',
  },
  {
    name: 'Full Synthetic Oil Change',
    description: 'Premium full-synthetic oil and filter replacement for maximum engine protection and performance.',
    duration_minutes: 45,
    category: 'Maintenance',
    icon: 'oil-drop',
  },
  {
    name: 'Brake Inspection',
    description: 'Comprehensive brake system inspection including pads, rotors, calipers, and brake fluid level check.',
    duration_minutes: 30,
    category: 'Diagnostics',
    icon: 'brake-disc',
  },
  {
    name: 'Brake Pad Replacement',
    description: 'Professional brake pad replacement with premium pads. Includes rotor inspection and brake system test.',
    duration_minutes: 90,
    category: 'Repair',
    icon: 'brake-disc',
  },
  {
    name: 'Engine Diagnostics',
    description: 'Full computerised engine diagnostics using state-of-the-art scan tools. Detailed report included.',
    duration_minutes: 60,
    category: 'Diagnostics',
    icon: 'engine',
  },
  {
    name: 'Check Engine Light',
    description: 'Check-engine-light diagnosis — we read the codes, trace the fault, and provide a clear repair estimate.',
    duration_minutes: 45,
    category: 'Diagnostics',
    icon: 'engine',
  },
  {
    name: 'Wheel Alignment',
    description: 'Precision four-wheel alignment to restore factory specifications and eliminate uneven tire wear.',
    duration_minutes: 60,
    category: 'Tires & Alignment',
    icon: 'tire',
  },
  {
    name: 'Tire Rotation',
    description: 'Rotate tires to promote even wear and extend tire life. Includes tire pressure check and adjustment.',
    duration_minutes: 30,
    category: 'Tires & Alignment',
    icon: 'tire',
  },
  {
    name: 'AC Service',
    description: 'Air conditioning performance test, refrigerant recharge, and leak inspection to keep you cool in Texas heat.',
    duration_minutes: 60,
    category: 'Repair',
    icon: 'snowflake',
  },
  {
    name: 'Transmission Flush',
    description: 'Complete transmission fluid exchange using manufacturer-recommended fluid. Extends transmission life.',
    duration_minutes: 90,
    category: 'Maintenance',
    icon: 'transmission',
  },
];

const reviews = [
  {
    customer_name: 'Mike Thompson',
    rating: 5,
    text: 'Dave and his team are the best! They diagnosed my truck\'s issue in no time and had it fixed the same day. Fair prices and honest service — I won\'t go anywhere else.',
    is_featured: 1,
  },
  {
    customer_name: 'Sarah Johnson',
    rating: 5,
    text: 'Brought my Camry in for an oil change and they found a worn belt that could have left me stranded. Super grateful for their thorough inspection!',
    is_featured: 1,
  },
  {
    customer_name: 'Carlos Rivera',
    rating: 5,
    text: 'Honest, reliable, and affordable. They replaced my brake pads and rotors and even showed me the old parts. Highly recommend!',
    is_featured: 1,
  },
  {
    customer_name: 'Jennifer Williams',
    rating: 4,
    text: 'Great experience overall. The AC service was quick and my car is blowing cold again. Waiting area could use a coffee machine, but the service is top notch.',
    is_featured: 1,
  },
  {
    customer_name: 'Robert Chen',
    rating: 5,
    text: 'I\'ve been coming to Dave\'s for three years now. They treat every car like it\'s their own. The whole team is knowledgeable and friendly.',
    is_featured: 1,
  },
  {
    customer_name: 'Amanda Foster',
    rating: 4,
    text: 'Had a check engine light and they diagnosed it quickly. They were upfront about the cost and didn\'t try to upsell me on things I didn\'t need. Will be back!',
    is_featured: 1,
  },
];

const customers = [
  {
    first_name: 'Mike',
    last_name: 'Thompson',
    email: 'mike.thompson@email.com',
    phone: '512-555-0101',
    vehicle_make: 'Ford',
    vehicle_model: 'F-150',
    vehicle_year: '2021',
    notes: 'Regular customer. Prefers morning appointments.',
  },
  {
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@email.com',
    phone: '512-555-0102',
    vehicle_make: 'Toyota',
    vehicle_model: 'Camry',
    vehicle_year: '2019',
    notes: '',
  },
  {
    first_name: 'Carlos',
    last_name: 'Rivera',
    email: 'carlos.rivera@email.com',
    phone: '512-555-0103',
    vehicle_make: 'Honda',
    vehicle_model: 'Civic',
    vehicle_year: '2020',
    notes: '',
  },
  {
    first_name: 'Jennifer',
    last_name: 'Williams',
    email: 'jennifer.williams@email.com',
    phone: '512-555-0104',
    vehicle_make: 'Chevrolet',
    vehicle_model: 'Equinox',
    vehicle_year: '2022',
    notes: 'Company vehicle — invoice goes to Acme Corp.',
  },
];

// ---------------------------------------------------------------------------
// Run seed inside a transaction
// ---------------------------------------------------------------------------
function seed() {
  if (tableHasRows('services')) {
    console.log('ℹ️  Database already seeded — skipping.');
    return;
  }

  const run = db.transaction(() => {
    // --- Locations ----------------------------------------------------------
    const insertLocation = db.prepare(`
      INSERT INTO locations (name, phone, address, city_state_zip, hours, rating_count)
      VALUES (@name, @phone, @address, @city_state_zip, @hours, @rating_count)
    `);
    for (const loc of locations) insertLocation.run(loc);
    console.log(`   ✔ Inserted ${locations.length} locations`);
    // --- Services -----------------------------------------------------------
    const insertService = db.prepare(`
      INSERT INTO services (name, description, duration_minutes, category, icon)
      VALUES (@name, @description, @duration_minutes, @category, @icon)
    `);
    for (const s of services) insertService.run(s);
    console.log(`   ✔ Inserted ${services.length} services`);

    // --- Reviews ------------------------------------------------------------
    const insertReview = db.prepare(`
      INSERT INTO reviews (customer_name, rating, text, is_featured)
      VALUES (@customer_name, @rating, @text, @is_featured)
    `);
    for (const r of reviews) insertReview.run(r);
    console.log(`   ✔ Inserted ${reviews.length} reviews`);

    // --- Admin user ---------------------------------------------------------
    const passwordHash = bcrypt.hashSync('changeme123', 10);
    db.prepare(`
      INSERT INTO admin_users (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', passwordHash, 'Dave Mitchell', 'admin');
    console.log('   ✔ Inserted admin user (admin / changeme123)');

    // --- Sample customers ---------------------------------------------------
    const insertCustomer = db.prepare(`
      INSERT INTO customers (first_name, last_name, email, phone, vehicle_make, vehicle_model, vehicle_year, notes)
      VALUES (@first_name, @last_name, @email, @phone, @vehicle_make, @vehicle_model, @vehicle_year, @notes)
    `);
    for (const c of customers) insertCustomer.run(c);
    console.log(`   ✔ Inserted ${customers.length} sample customers`);

    // --- Sample appointments ------------------------------------------------
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const insertAppt = db.prepare(`
      INSERT INTO appointments (customer_id, location_id, service_id, appointment_date, appointment_time, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertAppt.run(1, 3, 1, todayStr,    '09:00', 'confirmed',   'Regular oil change');
    insertAppt.run(2, 5, 5, todayStr,    '10:30', 'pending',     'Engine making rattling noise');
    insertAppt.run(3, 1, 4, tomorrowStr, '08:00', 'pending',     'Front brakes squealing');
    insertAppt.run(4, 3, 9, tomorrowStr, '13:00', 'confirmed',   'AC not blowing cold');
    console.log('   ✔ Inserted 4 sample appointments');
  });

  run();
  console.log('🌱  Seed complete!');
}

seed();
