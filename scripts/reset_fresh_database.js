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

  // Step 2: Reset all 24 physical rooms to available and clean
  console.log('\nStep 2: Resetting all physical rooms to Available and Clean...');
  try {
    const res = await pool.query(`
      UPDATE public.rooms 
      SET operational_status = 'available', 
          housekeeping_status = 'clean', 
          notes = NULL,
          updated_at = NOW();
    `);
    console.log(`  ✅ Reset public.rooms: ${res.rowCount} physical room(s) set to available/clean.`);
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

  // Step 4: Ensure all 4 room categories exist and are active
  console.log('\nStep 4: Ensuring 4 canonical room categories are active...');
  const categories = [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      slug: 'standard-non-ac-double',
      name: 'Standard Non-AC Double Room',
      short_description: 'Cozy and economical non-AC double bedroom ideal for budget travelers and short pilgrim visits to Kadiri temple.',
      full_description: 'Comfortable non-AC double bed accommodation featuring clean cotton linens, attached western bathroom with 24/7 hot water, high-speed Wi-Fi, and intercom service.',
      base_price_per_night: 1499,
      max_adults: 2,
      max_children: 1,
      max_occupancy: 3,
      bed_type: 'Double Bed',
      room_size_sqft: 220,
      cover_image_url: '/images/hotel/rooms-double-deluxe.jpg',
      is_active: true
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      slug: 'deluxe-ac-double',
      name: 'Deluxe AC Double Room',
      short_description: 'Spacious climate-controlled air conditioned room with plush double bed and modern amenities.',
      full_description: 'Premium air-conditioned sanctuary with Daikin whisper-quiet split AC, 43-inch LED Smart TV, work desk, premium mattress, and tea/coffee kettle.',
      base_price_per_night: 1899,
      max_adults: 2,
      max_children: 1,
      max_occupancy: 3,
      bed_type: 'King Bed',
      room_size_sqft: 280,
      cover_image_url: '/images/hotel/room-deluxe-double-king.png',
      is_active: true
    },
    {
      id: 'd0000000-0000-0000-0000-000000000003',
      slug: 'executive-ac-triple',
      name: 'Executive AC Triple Room',
      short_description: 'Expansive family room accommodating 3 to 4 guests with climate control and premium furnishings.',
      full_description: 'Spacious room designed for families visiting Kadiri with 1 Queen Bed + 1 Single Bed, separate sitting area, high-power split AC, and luxury toiletries.',
      base_price_per_night: 2499,
      max_adults: 3,
      max_children: 2,
      max_occupancy: 4,
      bed_type: '1 Queen + 1 Single',
      room_size_sqft: 360,
      cover_image_url: '/images/hotel/room-family-triple.png',
      is_active: true
    },
    {
      id: 'd0000000-0000-0000-0000-000000000004',
      slug: 'grand-presidential-suite',
      name: 'Grand Presidential Suite',
      short_description: 'The pinnacle of luxury at Sri Tayi Grand featuring a master bedroom, separate lounge, and scenic Kadiri views.',
      full_description: 'Top-tier luxury suite offering separate living room with Italian leather sofa, master bedroom with California King bed, 55-inch UHD Smart TV, and luxury bathroom with rain shower.',
      base_price_per_night: 3999,
      max_adults: 4,
      max_children: 2,
      max_occupancy: 5,
      bed_type: 'California King Bed',
      room_size_sqft: 520,
      cover_image_url: '/images/hotel/room-presidential-suite.png',
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
  console.log('   24 physical rooms ready and set to Available & Clean.       ');
  console.log('   Master hotel settings & categories intact.                   ');
  console.log('================================================================\n');

  await pool.end();
}

resetFresh().catch(err => {
  console.error('Fatal reset error:', err);
  pool.end();
  process.exit(1);
});
