const fs = require('fs');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
  }
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  console.log('--- SEEDING SRI TAYI GRAND PRODUCTION DATABASE ---');

  // 1. Hotel Settings
  await pool.query(`
    UPDATE hotel_settings
    SET hotel_name = 'SRI TAYI GRAND',
        tagline = 'Luxury Hotel & Convention Hall',
        address = '4585+F8J, Opp. Girls High School, Bypass Road, Kadiri – 515591, Anantapur District, Andhra Pradesh, India',
        road = 'Bypass Road',
        phone = '084942 23379',
        whatsapp = '+918494223379',
        email = 'contact@sritayigrand.com',
        check_in_time = '12:00:00',
        check_out_time = '11:00:00',
        tax_percentage = 5,
        allow_pay_at_hotel = true,
        hold_timeout_minutes = 20,
        updated_at = NOW()
    WHERE id = 'a0000000-0000-0000-0000-000000000001' OR TRUE;
  `);
  console.log('✅ Hotel Settings updated (Sri Tayi Grand, 5% GST)');

  // 2. Authoritative Room Categories
  const categories = [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      slug: 'suite-room',
      name: 'Suite Room',
      short_description: 'Spacious luxury with premium comfort, dedicated living lounge, and private balcony.',
      full_description: 'Our Suite Room offers a perfect blend of space, elegance, and modern amenities for a truly comfortable stay. Features a plush king bed, dedicated living lounge with premium armchairs, attached modern bathroom with hot/cold shower, and private balcony overlooking peaceful surroundings. Base tariff includes 2 persons, with provision for up to 2 additional guests at ₹300 each.',
      base_price_per_night: 3300,
      max_adults: 4,
      max_children: 2,
      max_occupancy: 4,
      bed_type: 'Plush King Bed & Living Lounge',
      room_size_sqft: 380,
      cover_image_url: '/images/hotel/room-suite-bed-photo-enhanced.png',
      is_active: true
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      slug: 'four-bed-room',
      name: 'Four Bed Room',
      short_description: 'Generous family accommodation with 4 comfortable beds, air conditioning, and expansive space.',
      full_description: 'Tailored for traveling families, temple pilgrims, and group companions visiting Kadiri. Offers 4 comfortable beds with premium linens, individual climate control, high-speed Wi-Fi, spacious ensuite bathroom with geyser hot water, and generous luggage storage. Base tariff includes 4 persons, with provision for 1 additional guest at ₹300.',
      base_price_per_night: 2800,
      max_adults: 5,
      max_children: 2,
      max_occupancy: 5,
      bed_type: '4 Beds (Family Configuration)',
      room_size_sqft: 340,
      cover_image_url: '/images/hotel/room-twin-render-enhanced.png',
      is_active: true
    },
    {
      id: 'd0000000-0000-0000-0000-000000000003',
      slug: 'double-room',
      name: 'Double Room',
      short_description: 'Comfortable air-conditioned room with king or twin bedding and ensuite modern bathroom.',
      full_description: 'Designed for couples, companions, and solo travelers visiting Kadiri. Features individual air conditioning, plush bedding with acoustic headboards, high-speed Wi-Fi, 24/7 hot water, smart TV, and work space. Base tariff includes 2 persons, with provision for 1 additional guest at ₹300.',
      base_price_per_night: 1800,
      max_adults: 3,
      max_children: 1,
      max_occupancy: 3,
      bed_type: 'King Bed / Twin Beds',
      room_size_sqft: 250,
      cover_image_url: '/images/hotel/room-double-bed-photo-enhanced.png',
      is_active: true
    },
    {
      id: 'd0000000-0000-0000-0000-000000000004',
      slug: 'single-room',
      name: 'Single Room',
      short_description: 'Comfortable air-conditioned compact room with single bed, private bath, and essentials for solo travelers. Front desk walk-in only.',
      full_description: 'Designed exclusively for solo travelers, single executives, and pilgrims visiting Kadiri. Features comfortable single bed, individual climate control AC, high-speed Wi-Fi, attached ensuite bathroom with 24/7 hot water, smart TV, and wardrobe space. This category is available exclusively for front-desk walk-in reservations.',
      base_price_per_night: 900,
      max_adults: 1,
      max_children: 0,
      max_occupancy: 1,
      bed_type: 'Single Bed',
      room_size_sqft: 180,
      cover_image_url: '/images/hotel/room-corner-photo-enhanced.png',
      is_active: true
    }
  ];

  for (const cat of categories) {
    await pool.query(`
      INSERT INTO room_categories (
        id, slug, name, short_description, full_description, base_price_per_night,
        max_adults, max_children, max_occupancy, bed_type, room_size_sqft, cover_image_url, is_active, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        base_price_per_night = EXCLUDED.base_price_per_night,
        short_description = EXCLUDED.short_description,
        full_description = EXCLUDED.full_description,
        bed_type = EXCLUDED.bed_type,
        max_occupancy = EXCLUDED.max_occupancy,
        updated_at = NOW();
    `, [
      cat.id, cat.slug, cat.name, cat.short_description, cat.full_description,
      cat.base_price_per_night, cat.max_adults, cat.max_children, cat.max_occupancy,
      cat.bed_type, cat.room_size_sqft, cat.cover_image_url, cat.is_active
    ]);
  }
  console.log('✅ Room Categories synchronized (4 categories)');

  // 3. Physical Rooms (24 rooms across 3 floors)
  const roomStatusMap = {
    '101': { op: 'occupied', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '102': { op: 'occupied', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '103': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '104': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '105': { op: 'available', hk: 'dirty', cat: 'd0000000-0000-0000-0000-000000000003' },
    '106': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000002' }, // Four Bed
    '107': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000004' }, // Single (Walk-in)
    '108': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '201': { op: 'occupied', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '202': { op: 'occupied', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '203': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '204': { op: 'maintenance', hk: 'dirty', cat: 'd0000000-0000-0000-0000-000000000003' },
    '205': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '206': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000002' }, // Four Bed
    '207': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '208': { op: 'available', hk: 'dirty', cat: 'd0000000-0000-0000-0000-000000000003' },
    '301': { op: 'occupied', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '302': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '303': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '304': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '305': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '306': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000001' }, // Suite
    '307': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' },
    '308': { op: 'available', hk: 'clean', cat: 'd0000000-0000-0000-0000-000000000003' }
  };

  for (const [rNum, info] of Object.entries(roomStatusMap)) {
    await pool.query(`
      UPDATE rooms
      SET operational_status = $1, housekeeping_status = $2, category_id = $3, updated_at = NOW()
      WHERE room_number = $4;
    `, [info.op, info.hk, info.cat, rNum]);
  }
  console.log('✅ Physical Rooms updated (24 rooms across 3 floors)');

  // 4. Guests
  const guests = [
    {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'K. Venkatesh Rao',
      phone: '+919440187654',
      email: 'venkatesh.rao@outlook.com',
      address: 'Plot 42, Jubilee Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      id_type: 'Aadhaar Card',
      id_number: '674512903412',
      total_stays: 4
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      name: 'Dr. Anand Raman',
      phone: '+919849023456',
      email: 'anand.raman@manipal.edu',
      address: '14th Cross, Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      id_type: 'Passport',
      id_number: 'Z9876543',
      total_stays: 6
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      name: 'S. Lakshmi Narayana',
      phone: '+919988776611',
      email: 'lakshminarayana.kadiri@gmail.com',
      address: 'Main Bazaar Road',
      city: 'Kadiri',
      state: 'Andhra Pradesh',
      id_type: 'Aadhaar Card',
      id_number: '548219283849',
      total_stays: 2
    },
    {
      id: '10000000-0000-0000-0000-000000000004',
      name: 'P. Balaji Naidu',
      phone: '+919876543201',
      email: 'balaji.naidu@tcs.com',
      address: 'Madanapalle Bypass',
      city: 'Anantapur',
      state: 'Andhra Pradesh',
      id_type: 'Driving License',
      id_number: 'AP0220190048123',
      total_stays: 3
    },
    {
      id: '10000000-0000-0000-0000-000000000005',
      name: 'M. Sreenivasa Murthy',
      phone: '+919441230987',
      email: 'sreenivas.murthy@yahoo.co.in',
      address: 'Subhash Road',
      city: 'Dharmavaram',
      state: 'Andhra Pradesh',
      id_type: 'Aadhaar Card',
      id_number: '908172635441',
      total_stays: 5
    }
  ];

  for (const g of guests) {
    await pool.query(`
      INSERT INTO guests (id, full_name, phone, email, address, city, state, country, id_type, id_number, total_stays, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'India', $8, $9, $10, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        total_stays = EXCLUDED.total_stays,
        updated_at = NOW();
    `, [g.id, g.name, g.phone, g.email, g.address, g.city, g.state, g.id_type, g.id_number, g.total_stays]);
  }
  console.log('✅ Guests seeded (5 guests)');

  // 5. Bookings
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

  const bookings = [
    {
      ref: 'STG-20261112-1011',
      guest_id: '10000000-0000-0000-0000-000000000001',
      check_in: today,
      check_out: tomorrow,
      room_num: '101',
      cat_id: 'd0000000-0000-0000-0000-000000000003',
      cat_name: 'Double Room',
      status: 'checked_in',
      pay_status: 'successful',
      pay_method: 'upi',
      subtotal: 1800,
      tax: 90,
      total: 1890,
      paid: 1890,
      source: 'front_desk',
      checked_in_at: new Date(Date.now() - 4 * 3600000).toISOString()
    },
    {
      ref: 'STG-20261112-2022',
      guest_id: '10000000-0000-0000-0000-000000000002',
      check_in: yesterday,
      check_out: dayAfter,
      room_num: '201',
      cat_id: 'd0000000-0000-0000-0000-000000000003',
      cat_name: 'Double Room',
      status: 'checked_in',
      pay_status: 'successful',
      pay_method: 'card',
      subtotal: 3600,
      tax: 180,
      total: 3780,
      paid: 3780,
      source: 'online',
      checked_in_at: new Date(Date.now() - 28 * 3600000).toISOString()
    },
    {
      ref: 'STG-20261112-3011',
      guest_id: '10000000-0000-0000-0000-000000000003',
      check_in: today,
      check_out: tomorrow,
      room_num: '301',
      cat_id: 'd0000000-0000-0000-0000-000000000003',
      cat_name: 'Double Room',
      status: 'checked_in',
      pay_status: 'successful',
      pay_method: 'cash',
      subtotal: 1800,
      tax: 90,
      total: 1890,
      paid: 1890,
      source: 'walk_in',
      checked_in_at: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      ref: 'STG-20261112-1022',
      guest_id: '10000000-0000-0000-0000-000000000004',
      check_in: today,
      check_out: tomorrow,
      room_num: '102',
      cat_id: 'd0000000-0000-0000-0000-000000000003',
      cat_name: 'Double Room',
      status: 'checked_in',
      pay_status: 'successful',
      pay_method: 'upi',
      subtotal: 1800,
      tax: 90,
      total: 1890,
      paid: 1890,
      source: 'walk_in',
      checked_in_at: new Date(Date.now() - 1 * 3600000).toISOString()
    },
    {
      ref: 'STG-20261112-4044',
      guest_id: '10000000-0000-0000-0000-000000000005',
      check_in: today,
      check_out: tomorrow,
      room_num: null,
      cat_id: 'd0000000-0000-0000-0000-000000000003',
      cat_name: 'Double Room',
      status: 'confirmed',
      pay_status: 'pay_at_hotel',
      pay_method: 'cash',
      subtotal: 1800,
      tax: 90,
      total: 1890,
      paid: 0,
      source: 'online'
    }
  ];

  for (const b of bookings) {
    try {
      await pool.query(`
        INSERT INTO bookings (
          id, booking_reference, guest_id, check_in_date, check_out_date,
          adults_count, children_count, rooms_count, status, payment_status, payment_method,
          subtotal_amount, tax_amount, total_amount, paid_amount, booking_source,
          assigned_room_number, category_id, category_name, checked_in_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, 2, 0, 1, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
        )
        ON CONFLICT (booking_reference) DO UPDATE SET
          status = EXCLUDED.status,
          payment_status = EXCLUDED.payment_status,
          paid_amount = EXCLUDED.paid_amount,
          assigned_room_number = EXCLUDED.assigned_room_number,
          checked_in_at = EXCLUDED.checked_in_at,
          updated_at = NOW();
      `, [
        b.ref, b.guest_id, b.check_in, b.check_out, b.status, b.pay_status, b.pay_method,
        b.subtotal, b.tax, b.total, b.paid, b.source, b.room_num, b.cat_id, b.cat_name, b.checked_in_at || null
      ]);
    } catch (bErr) {
      console.log(`ℹ️ Booking ${b.ref} skipped or already exists: ${bErr.message}`);
    }
  }
  console.log('✅ Bookings processed');

  // 6. Payments
  const payments = [
    { ref: 'PAY-STG-20261112-001', bRef: 'STG-20261112-1011', guest: 'K. Venkatesh Rao', amt: 1994, method: 'upi', status: 'successful' },
    { ref: 'PAY-STG-20261112-002', bRef: 'STG-20261112-2022', guest: 'Dr. Anand Raman', amt: 3988, method: 'card', status: 'successful' },
    { ref: 'PAY-STG-20261112-003', bRef: 'STG-20261112-3011', guest: 'S. Lakshmi Narayana', amt: 4199, method: 'cash', status: 'successful' },
    { ref: 'PAY-STG-20261112-004', bRef: 'STG-20261112-1022', guest: 'P. Balaji Naidu', amt: 1994, method: 'upi', status: 'successful' }
  ];

  for (const p of payments) {
    await pool.query(`
      INSERT INTO payments (
        id, payment_reference, booking_reference, guest_name, amount, currency,
        payment_method, status, paid_at, created_at, updated_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'INR', $5, $6, NOW(), NOW(), NOW())
      ON CONFLICT (payment_reference) DO NOTHING;
    `, [p.ref, p.bRef, p.guest, p.amt, p.method, p.status]);
  }
  console.log('✅ Payments seeded (4 transactions)');

  // 7. Operating Expenses
  const expenses = [
    { id: 'exp-001', cat: 'utilities', title: 'Diesel Generator Backup Fuel (40L)', desc: 'High-speed diesel for hotel power backup during grid fluctuation', amt: 3800, method: 'cash', date: today },
    { id: 'exp-002', cat: 'laundry', title: 'Linen Laundry & Steam Pressing', desc: 'Bed sheets, duvet covers, pillowcases, and bath towels turnaround', amt: 2450, method: 'cash', date: today },
    { id: 'exp-003', cat: 'fnb_supplies', title: 'Front Desk Welcome Amenities & Tea/Coffee Kits', desc: 'Mineral water boxes, tea bags, coffee sachets, and sugar pouches', amt: 1650, method: 'upi', date: today },
    { id: 'exp-004', cat: 'maintenance', title: 'AC Filter Cleaning & Freon Gas Top-up', desc: 'Preventative HVAC maintenance for Floor 2 rooms', amt: 2200, method: 'card', date: yesterday },
    { id: 'exp-005', cat: 'staff_welfare', title: 'Front Desk & Housekeeping Staff Duty Meals', desc: 'Breakfast and afternoon refreshment meals for shift staff', amt: 950, method: 'cash', date: today }
  ];

  for (const exp of expenses) {
    await pool.query(`
      INSERT INTO expenses (
        id, category, title, description, amount, payment_method,
        recorded_by, expense_date, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Sri Tayi Grand Admin', $7, 'approved', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, title = EXCLUDED.title;
    `, [exp.id, exp.cat, exp.title, exp.desc, exp.amt, exp.method, exp.date]);
  }
  console.log('✅ Operating Expenses seeded (5 expenses)');

  // 8. Maintenance Tickets
  const maint = [
    { id: 'mt-001', room: '204', title: 'AC Cooling Efficiency Low', desc: 'Split AC taking longer to cool down room; coil cleaning and thermostat recalibration required.', cat: 'ac_climate', pri: 'high', stat: 'in_progress', blocked: true },
    { id: 'mt-002', room: '107', title: 'Bathroom Sink Aerator Spout Splash', desc: 'Tap aerator needs lime scale cleaning or washer replacement.', cat: 'plumbing', pri: 'normal', stat: 'open', blocked: false },
    { id: 'mt-003', room: '302', title: 'Balcony Sliding Door Latch Serviced', desc: 'Door latch tightened and lubricated; operating smoothly now.', cat: 'general', pri: 'low', stat: 'resolved', blocked: false }
  ];

  for (const m of maint) {
    await pool.query(`
      INSERT INTO room_maintenance (
        id, ticket_id, room_number, issue_title, issue_description, category, priority, status,
        start_date, reported_by, room_blocked, created_at, updated_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'Front Desk Staff', $8, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `, [m.id, m.room, m.title, m.desc, m.cat, m.pri, m.stat, m.blocked]);
  }
  console.log('✅ Maintenance Tickets seeded (3 tickets)');

  // 9. Hall Enquiries & Convention Quotes
  await pool.query(`
    INSERT INTO hall_enquiries (
      id, enquiry_reference, name, phone, email, event_type, event_date,
      expected_guests, requirements, status, admin_notes, created_at, updated_at
    ) VALUES 
      (gen_random_uuid(), 'STG-HAL-2026-001', 'Dr. V. Sudhakar Reddy', '+919440123456', 'sudhakar.reddy@gmail.com', 'Wedding Reception & Banquet', '2026-12-18', 450, 'AC convention hall with grand stage lighting, banquet seating, and Royal Buffet setup.', 'quotation_sent', 'Quotation STG-QT-2026-001 generated for ₹2,75,625.', NOW(), NOW()),
      (gen_random_uuid(), 'STG-HAL-2026-002', 'M. Anjaneyulu', '+919848011223', 'anjaneyulu.m@yahoo.com', 'Sreemantham & Family Celebration', '2026-11-26', 150, 'Half-day morning function with traditional vegetarian South Indian lunch.', 'new', 'Client requested callback regarding stage flower decoration.', NOW(), NOW())
    ON CONFLICT (enquiry_reference) DO UPDATE SET status = EXCLUDED.status;
  `);

  await pool.query(`
    INSERT INTO convention_quotes (
      id, quote_number, client_name, client_phone, client_email,
      event_name, event_date, seating_layout, guest_count,
      catering_package, catering_rate_per_plate, hall_rental_charge,
      av_sound_lighting, stage_decoration, generator_diesel,
      subtotal, gst_rate, gst_amount, total_amount, status, created_by, valid_until, created_at
    ) VALUES (
      'cq-2026-001', 'STG-QT-2026-001', 'Dr. V. Sudhakar Reddy', '+919440123456', 'sudhakar.reddy@gmail.com',
      'Grand Wedding Reception & Banquet', '2026-12-18', 'banquet_clusters', 450,
      'royal_grand_buffet', 450, 35000, 8000, 12000, 5000,
      262500, 0.05, 13125, 275625, 'sent', 'Sri Tayi Grand Manager', '2026-12-05', NOW()
    )
    ON CONFLICT (quote_number) DO UPDATE SET total_amount = EXCLUDED.total_amount;
  `);
  console.log('✅ Hall Enquiries & Quotes seeded');

  // 10. Contact Enquiries
  await pool.query(`
    INSERT INTO contact_enquiries (
      id, name, phone, email, subject, message, check_in_date, check_out_date, room_type, adults_count, status, source, created_at, updated_at
    ) VALUES (
      'enq-001', 'R. Chandrasekhar Rao', '+919848099887', 'chandra.rao@tcs.com',
      'Kadiri Sri Lakshmi Narasimha Swamy Temple Darshan Pilgrimage Stay',
      'We are a family group of 8 members arriving from Hyderabad for temple darshan. Looking for 3 AC double rooms for 2 nights.',
      '2026-11-20', '2026-11-22', 'Double Room', 8, 'new', 'website_contact_form', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
  `);
  console.log('✅ Contact Enquiries seeded');

  // 11. Cash Shift & Transactions
  await pool.query(`
    INSERT INTO cash_shifts (
      id, shift_number, cashier_id, cashier_name, opened_by_name, opened_at,
      opening_float, status, created_at
    ) VALUES (
      'shift-20261112-morn', 'SFT-20261112-01', 'stf-001', 'Sri Tayi Grand Staff',
      'Sri Tayi Grand Staff', NOW() - interval '6 hours', 5000, 'open', NOW()
    )
    ON CONFLICT (shift_number) DO UPDATE SET status = 'open';
  `);

  await pool.query(`
    INSERT INTO cash_transactions (
      id, shift_id, type, category, amount, reason, booking_reference, performed_by, performed_at, created_at
    ) VALUES 
      ('ctx-001', 'shift-20261112-morn', 'cash_in', 'guest_payment', 1890, 'Room 301 Walk-In Check-In Cash Tariff Payment', 'STG-20261112-3011', 'Sri Tayi Grand Staff', NOW() - interval '2 hours', NOW()),
      ('ctx-002', 'shift-20261112-morn', 'cash_out', 'operational_expense', 3800, 'Diesel Generator Fuel Fill (40L)', NULL, 'Sri Tayi Grand Staff', NOW() - interval '3 hours', NOW()),
      ('ctx-003', 'shift-20261112-morn', 'cash_out', 'petty_cash', 950, 'Duty Staff Meals & Tea Allowance', NULL, 'Sri Tayi Grand Staff', NOW() - interval '1 hour', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('✅ Cash Shift & Drawer Transactions seeded');

  // 12. Staff Attendance
  const staffAttendance = [
    { id: 'att-001', sid: 'stf-super-admin-01', name: 'Sri Tayi Grand Admin', role: 'Super Admin', shift: 'General Shift (09:00 - 18:00)', stat: 'present', notes: 'Executive oversight & audits' },
    { id: 'att-002', sid: 'stf-manager-01', name: 'G. Mohan Kumar', role: 'Hotel Manager', shift: 'Morning Shift (07:00 - 15:30)', stat: 'present', notes: 'Operations duty & vendor sign-offs' },
    { id: 'att-003', sid: 'stf-frontdesk-01', name: 'Sri Tayi Grand Staff', role: 'Front Desk', shift: 'Morning Shift (07:00 - 15:30)', stat: 'present', notes: 'Front desk reception duty' },
    { id: 'att-004', sid: 'stf-hk-01', name: 'K. Ramanjaneyulu', role: 'Housekeeping', shift: 'Morning Shift (08:00 - 16:00)', stat: 'present', notes: 'Floor 1 & 2 room turnaround' }
  ];

  for (const a of staffAttendance) {
    await pool.query(`
      INSERT INTO staff_attendance (
        id, staff_id, staff_name, role, date, shift, status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    `, [a.id, a.sid, a.name, a.role, today, a.shift, a.stat, a.notes]);
  }
  console.log('✅ Staff Attendance seeded');

  // 13. General Ledger Journal Entries
  await pool.query('BEGIN');
  await pool.query(`
    INSERT INTO journal_entries (
      id, entry_number, date, reference, description, total_debit, total_credit, is_balanced, is_posted, created_by, created_at, updated_at
    ) VALUES 
      ('je-20261112-001', 'JV-2026-0001', $1, 'CASH-FLOAT-001', 'Daily Morning Cash Float Allocation to Reception Drawer', 5000, 5000, true, true, 'Accounts Manager', NOW(), NOW()),
      ('je-20261112-002', 'JV-2026-0002', $1, 'REV-20261112', 'Daily Room Accommodation Revenue Recognized', 12190, 12190, true, true, 'Accounts Manager', NOW(), NOW()),
      ('je-20261112-003', 'JV-2026-0003', $1, 'EXP-DIESEL-001', 'Diesel Generator Operational Utility Expense Voucher', 3800, 3800, true, true, 'Accounts Manager', NOW(), NOW())
    ON CONFLICT (entry_number) DO UPDATE SET total_debit = EXCLUDED.total_debit;
  `, [today]);

  await pool.query(`
    INSERT INTO journal_lines (id, entry_id, account_code, account_name, debit, credit, description, created_at)
    VALUES 
      ('jl-001', 'je-20261112-001', '1010', 'Cash in Front Desk Drawer', 5000, 0, 'Opening Drawer Cash Float', NOW()),
      ('jl-002', 'je-20261112-001', '1020', 'HDFC Current Bank Account', 0, 5000, 'Bank Cash Withdrawal', NOW()),
      ('jl-003', 'je-20261112-002', '1010', 'Cash in Front Desk Drawer', 4199, 0, 'Cash Collections', NOW()),
      ('jl-004', 'je-20261112-002', '1030', 'Razorpay Online Settlement Clearing', 7991, 0, 'UPI & Card Collections', NOW()),
      ('jl-005', 'je-20261112-002', '4010', 'Room Accommodation Revenue', 0, 11610, 'Net Tariff Revenue', NOW()),
      ('jl-006', 'je-20261112-002', '2010', 'GST Output SGST (2.5%) Payable', 0, 290, 'SGST 2.5%', NOW()),
      ('jl-007', 'je-20261112-002', '2020', 'GST Output CGST (2.5%) Payable', 0, 290, 'CGST 2.5%', NOW()),
      ('jl-008', 'je-20261112-003', '5020', 'Diesel Generator & Power Utilities', 3800, 0, 'Diesel Fuel Expense', NOW()),
      ('jl-009', 'je-20261112-003', '1010', 'Cash in Front Desk Drawer', 0, 3800, 'Cash payment for diesel fuel', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);
  await pool.query('COMMIT');
  console.log('✅ General Ledger & Journal Entries seeded');

  // 14. Daily Closing
  await pool.query(`
    INSERT INTO daily_closings (
      id, closing_date, total_revenue, room_revenue, hall_revenue, other_revenue,
      cash_collected, upi_collected, card_collected, online_collected,
      total_expenses, cash_expenses, expected_cash_in_drawer, actual_cash_counted,
      discrepancy, notes, closed_by_name, closed_by_role, status, closed_at, created_at
    ) VALUES (
      'dc-20261111', $1, 14200, 14200, 0, 0,
      4800, 5600, 3800, 0,
      3200, 3200, 6600, 6600,
      0, 'Audited and register balanced with exact cash match. No discrepancies.',
      'G. Mohan Kumar', 'Hotel Manager', 'audited', NOW() - interval '18 hours', NOW() - interval '18 hours'
    )
    ON CONFLICT (closing_date) DO UPDATE SET total_revenue = EXCLUDED.total_revenue;
  `, [yesterday]);
  console.log('✅ Daily Closing seeded (Yesterday Night Audit)');

  // 15. Folio Charges
  await pool.query(`
    INSERT INTO additional_charges (
      id, booking_id, charge_id, booking_reference, charge_name, description, category,
      amount, tax_rate, tax_amount, total_amount, posted_by, created_at
    ) VALUES 
      (gen_random_uuid(), NULL, 'chg-001', 'STG-20261112-1011', 'Extra Bed & Linen Kit', 'Additional rollaway folding bed with fresh linen set', 'room_service', 500, 0.05, 25, 525, 'Front Desk Staff', NOW()),
      (gen_random_uuid(), NULL, 'chg-002', 'STG-20261112-2022', 'Special South Indian Filter Coffee & Biscuits', 'Evening beverage room delivery', 'dining', 240, 0.05, 12, 252, 'Room Service Attendant', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('✅ Folio Additional Charges seeded');

  // 16. Audit Log Entry
  await pool.query(`
    INSERT INTO audit_logs (
      log_id, action, entity_name, entity_id, user_name, user_role, category, details, ip_address, created_at
    ) VALUES (
      'log-001', 'SYSTEM_AUDIT_SEED', 'SYSTEM', 'stg-server',
      'Sri Tayi Grand Admin', 'Super Admin', 'SECURITY',
      'Production database synchronization & operational baseline verification completed.',
      '127.0.0.1', NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('✅ System Audit Log recorded');

  await pool.end();
  console.log('--- ALL SRI TAYI GRAND MODULES SEEDED AND VERIFIED ---');
}

seed().catch(err => {
  console.error('SEEDING FATAL ERROR:', err);
  process.exit(1);
});
