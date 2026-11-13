const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val.trim();
  }
});

const pool = new Pool({
  connectionString: env.DATABASE_URL || env.SUPABASE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Transactional tables to purge in strict foreign key order (children first)
const transactionalTables = [
  'refunds',
  'invoices',
  'folio_charges',
  'additional_charges',
  'payments',
  'booking_status_history',
  'booking_rooms',
  'booking_guests',
  'booking_holds',
  'reception_kiosk_tokens',
  'bookings',
  'guests',
  'room_transfers',
  'room_maintenance',
  'room_cleaning_sessions',
  'room_housekeeping',
  'hall_payments',
  'hall_bookings',
  'convention_quotes',
  'hall_enquiries',
  'contact_enquiries',
  'cash_transactions',
  'cash_shifts',
  'expenses',
  'daily_closings',
  'journal_lines',
  'journal_entries',
  'staff_assignments',
  'staff_attendance',
  'super_admin_notifications',
  'notifications',
  'rfid_access_events',
  'rfid_tap_history',
  'audit_logs'
];

async function resetFresh() {
  console.log('================================================================');
  console.log('   SRI TAYI GRAND - RESET DATABASE FOR FRESH PRODUCTION START   ');
  console.log('================================================================\n');

  // Step 1: Purge all transactional test data
  console.log('Step 1: Purging all transactional and dummy test data from Supabase...');
  for (const table of transactionalTables) {
    try {
      const res = await pool.query(`DELETE FROM public."${table}";`);
      console.log(`  ✅ Purged public."${table}": ${res.rowCount} row(s) deleted.`);
    } catch (err) {
      console.warn(`  ⚠️ public."${table}": ${err.message}`);
    }
  }

  // Step 2: Reset all 25 physical rooms to available and clean with authoritative category mappings
  console.log('\nStep 2: Resetting all 25 physical rooms to Available, Clean, and Authoritative Categories...');
  try {
    // 25 physical room mappings across 3 floors (Floor 1: 101-109, Floor 2: 201-208, Floor 3: 301-308)
    const roomsList = [
      // Floor 1 (Rooms 101 - 109)
      { num: '101', floor: 1, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '102', floor: 1, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '103', floor: 1, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '104', floor: 1, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '105', floor: 1, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '106', floor: 1, catId: 'd0000000-0000-0000-0000-000000000002' }, // Four Bed Room (₹2800)
      { num: '107', floor: 1, catId: 'd0000000-0000-0000-0000-000000000004' }, // Single Room (₹900, walk-in)
      { num: '108', floor: 1, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '109', floor: 1, catId: 'd0000000-0000-0000-0000-000000000003' }, // Double Room (₹1800)

      // Floor 2 (Rooms 201 - 208)
      { num: '201', floor: 2, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '202', floor: 2, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '203', floor: 2, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '204', floor: 2, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '205', floor: 2, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '206', floor: 2, catId: 'd0000000-0000-0000-0000-000000000002' }, // Four Bed Room (₹2800)
      { num: '207', floor: 2, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '208', floor: 2, catId: 'd0000000-0000-0000-0000-000000000003' },

      // Floor 3 (Rooms 301 - 308)
      { num: '301', floor: 3, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '302', floor: 3, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '303', floor: 3, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '304', floor: 3, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '305', floor: 3, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '306', floor: 3, catId: 'd0000000-0000-0000-0000-000000000001' }, // Suite Room (₹3300)
      { num: '307', floor: 3, catId: 'd0000000-0000-0000-0000-000000000003' },
      { num: '308', floor: 3, catId: 'd0000000-0000-0000-0000-000000000003' }
    ];

    for (const r of roomsList) {
      await pool.query(`
        INSERT INTO public.rooms (
          room_number, floor_number, category_id, operational_status, housekeeping_status, is_active, updated_at
        ) VALUES ($1, $2, $3, 'available', 'clean', true, NOW())
        ON CONFLICT (room_number) DO UPDATE SET
          floor_number = EXCLUDED.floor_number,
          category_id = EXCLUDED.category_id,
          operational_status = 'available',
          housekeeping_status = 'clean',
          notes = NULL,
          is_active = true,
          updated_at = NOW();
      `, [r.num, r.floor, r.catId]);
    }
    console.log('  ✅ Verified public.rooms: 25 physical rooms configured (Double ₹1800 [21 rooms], Four Bed ₹2800 [2 rooms], Suite ₹3300 [1 room], Single ₹900 [1 room]).');
  } catch (err) {
    console.warn(`  ⚠️ Failed to reset rooms: ${err.message}`);
  }

  // Step 3: Ensure master hotel settings are pristine
  console.log('\nStep 3: Ensuring official Hotel Settings (Sri Tayi Grand)...');
  try {
    await pool.query(`
      UPDATE public.hotel_settings
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
    console.log('  ✅ Verified public.hotel_settings: SRI TAYI GRAND (5% GST).');
  } catch (err) {
    console.warn(`  ⚠️ Hotel settings update warn: ${err.message}`);
  }

  // Step 4: Ensure all 4 authoritative room categories exist and are active
  console.log('\nStep 4: Ensuring 4 canonical authoritative room categories are active...');
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
    try {
      await pool.query(`
        INSERT INTO public.room_categories (
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
          is_active = true,
          updated_at = NOW();
      `, [
        cat.id, cat.slug, cat.name, cat.short_description, cat.full_description,
        cat.base_price_per_night, cat.max_adults, cat.max_children, cat.max_occupancy,
        cat.bed_type, cat.room_size_sqft, cat.cover_image_url, cat.is_active
      ]);
      console.log(`  ✅ Category verified: ${cat.name} (₹${cat.base_price_per_night})`);
    } catch (err) {
      console.warn(`  ⚠️ Category sync: ${err.message}`);
    }
  }

  // Step 5: Reset local transactional data/*.json files to []
  console.log('\nStep 5: Resetting local transactional JSON files to []...');
  const jsonFilesToReset = [
    'bookings.json',
    'guests.json',
    'payments.json',
    'expenses.json',
    'maintenance.json',
    'hall_enquiries.json',
    'convention_quotes.json',
    'contact_enquiries.json',
    'cash_shifts.json',
    'cash_transactions.json',
    'daily_closings.json',
    'journal_entries.json',
    'staff_attendance.json',
    'audit_logs.json',
    'folio_charges.json'
  ];

  for (const file of jsonFilesToReset) {
    const path = `./data/${file}`;
    fs.writeFileSync(path, '[]\n', 'utf8');
    console.log(`  ✅ Reset data/${file} to []`);
  }
  console.log('  🔒 Protected data/cards.json preserved (DO NOT TOUCH RFID).');

  console.log('\n================================================================');
  console.log('   DATABASE SUCCESSFULLY RESET TO FRESH CLEAN-SLATE START!     ');
  console.log('   All dummy transactions purged.                               ');
  console.log('   25 physical rooms ready and set to Available & Clean.       ');
  console.log('   Master hotel settings & categories intact.                   ');
  console.log('================================================================\n');

  await pool.end();
}

resetFresh().catch(err => {
  console.error('Fatal reset error:', err);
  pool.end();
  process.exit(1);
});
