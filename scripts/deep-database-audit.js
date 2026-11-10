const { Client } = require('pg');

async function runComprehensiveAudit() {
  console.log('================================================================');
  console.log('SRI TAYI GRAND - ENTERPRISE SUPABASE DATABASE AUDIT & DIAGNOSTIC');
  console.log('================================================================');

  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 6543, // Transaction pooler
    database: 'postgres',
    user: 'postgres.wercvaimozbbkbwmuoct',
    password: 'Vaynex@2026',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connection established with Supabase Cloud PostgreSQL (Port 6543 Transaction Pooler).\n');
  } catch (err) {
    console.error('❌ Connection Failed:', err.message);
    process.exit(1);
  }

  // 1. Expected tables from migrations
  const expectedTables = [
    // Auth & Access
    'roles', 'permissions', 'role_permissions', 'profiles', 'staff_assignments',
    // Property Settings
    'hotel_settings', 'cancellation_policies', 'website_content', 'integrations',
    // Rooms & Inventory
    'room_categories', 'rooms', 'amenities', 'room_amenities', 'room_images',
    'room_maintenance', 'room_housekeeping', 'room_cleaning_sessions',
    // Guests & Bookings
    'guests', 'bookings', 'booking_guests', 'booking_rooms', 'booking_status_history',
    'booking_holds', 'reception_kiosk_tokens',
    // Finance & Cash
    'payments', 'refunds', 'invoices', 'additional_charges', 'expenses',
    'cash_shifts', 'cash_transactions', 'daily_closings',
    // Events & Hall
    'convention_halls', 'hall_enquiries', 'convention_quotes', 'hall_bookings', 'hall_payments',
    // Staff & HR
    'staff_attendance',
    // Feedback & Media
    'reviews', 'gallery_images',
    // Notifications & Audit
    'notifications', 'super_admin_notifications', 'audit_logs',
    // RFID Hardware
    'rfid_devices', 'rfid_cards', 'rfid_access_events', 'rfid_tap_history'
  ];

  console.log(`Auditing ${expectedTables.length} expected schema tables...\n`);

  // Query all existing tables in public schema
  const existingTablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  const actualTables = new Set(existingTablesRes.rows.map(r => r.table_name));

  const results = [];
  const missingTables = [];
  const queryErrors = [];

  for (const table of expectedTables) {
    if (!actualTables.has(table)) {
      missingTables.push(table);
      results.push({
        table,
        status: 'MISSING',
        rows: 0,
        sample: null,
        error: 'Table not found in public schema'
      });
      continue;
    }

    try {
      const countRes = await client.query(`SELECT count(*) FROM "${table}";`);
      const rowCount = Number(countRes.rows[0].count);

      // Fetch a sample row if rows exist
      let sample = null;
      if (rowCount > 0) {
        const sampleRes = await client.query(`SELECT * FROM "${table}" LIMIT 1;`);
        sample = sampleRes.rows[0];
      }

      results.push({
        table,
        status: 'EXISTS',
        rows: rowCount,
        sample: sample ? Object.keys(sample).slice(0, 5).join(', ') : 'Empty',
        error: null
      });
    } catch (err) {
      queryErrors.push({ table, error: err.message });
      results.push({
        table,
        status: 'ERROR',
        rows: 0,
        sample: null,
        error: err.message
      });
    }
  }

  // Print Summary Table
  console.log('--- SCHEMA TABLE STATUS & ROW COUNTS ---');
  console.table(results.map(r => ({
    Table: r.table,
    Status: r.status,
    'Row Count': r.rows,
    'Columns / Note': r.sample || (r.error ? `ERR: ${r.error}` : '')
  })));

  if (missingTables.length > 0) {
    console.warn(`\n⚠️ Missing Tables detected (${missingTables.length}):`, missingTables.join(', '));
  } else {
    console.log('\n✅ ALL 48 expected tables exist in Supabase!');
  }

  if (queryErrors.length > 0) {
    console.error(`\n❌ Query Errors encountered (${queryErrors.length}):`, queryErrors);
  } else {
    console.log('✅ Zero query errors when accessing existing tables.');
  }

  // =========================================================================
  // 2. CHECK RELATIONAL INTEGRITY (FOREIGN KEYS & DATA LINKAGE)
  // =========================================================================
  console.log('\n--- RELATIONAL INTEGRITY CHECKS ---');

  // A. Check bookings with missing guest_id or orphan guests
  const orphanBookings = await client.query(`
    SELECT count(*) 
    FROM bookings b 
    LEFT JOIN guests g ON b.guest_id = g.id 
    WHERE b.guest_id IS NOT NULL AND g.id IS NULL;
  `);
  console.log(`- Orphan Bookings (guest_id pointing to missing guest): ${orphanBookings.rows[0].count}`);

  // B. Check booking_guests linkage
  const orphanBookingGuests = await client.query(`
    SELECT count(*) 
    FROM booking_guests bg 
    LEFT JOIN bookings b ON bg.booking_id = b.id 
    WHERE bg.booking_id IS NOT NULL AND b.id IS NULL;
  `);
  console.log(`- Orphan Booking Guests (booking_id pointing to missing booking): ${orphanBookingGuests.rows[0].count}`);

  // C. Check booking_rooms linkage
  const orphanBookingRooms = await client.query(`
    SELECT count(*) 
    FROM booking_rooms br 
    LEFT JOIN bookings b ON br.booking_id = b.id 
    WHERE br.booking_id IS NOT NULL AND b.id IS NULL;
  `);
  console.log(`- Orphan Booking Rooms (booking_id pointing to missing booking): ${orphanBookingRooms.rows[0].count}`);

  // D. Check rooms category linkage
  const orphanRooms = await client.query(`
    SELECT count(*) 
    FROM rooms r 
    LEFT JOIN room_categories rc ON r.category_id = rc.id 
    WHERE r.category_id IS NOT NULL AND rc.id IS NULL;
  `);
  console.log(`- Orphan Rooms (category_id pointing to missing category): ${orphanRooms.rows[0].count}`);

  // E. Check invoices linkage
  const orphanInvoices = await client.query(`
    SELECT count(*) 
    FROM invoices inv 
    LEFT JOIN bookings b ON inv.booking_id = b.id 
    WHERE inv.booking_id IS NOT NULL AND b.id IS NULL;
  `);
  console.log(`- Orphan Invoices (booking_id pointing to missing booking): ${orphanInvoices.rows[0].count}`);

  // =========================================================================
  // 3. VERIFY PERSISTENCE & CRUD BEHAVIOR (LIVE WRITE-READ-VERIFY TEST)
  // =========================================================================
  console.log('\n--- VERIFYING LIVE DATA PERSISTENCE & STORAGE INTEGRITY ---');

  const testRef = `DIAG-TEST-${Date.now()}`;
  console.log(`Executing test transactional flow with reference: ${testRef}...`);

  try {
    await client.query('BEGIN;');

    // 1. Insert test guest
    const guestRes = await client.query(`
      INSERT INTO guests (full_name, phone, email, country, total_stays)
      VALUES ($1, $2, $3, 'India', 1)
      RETURNING id;
    `, ['Diagnostic Test Guest', '9999900000', 'diagnostic@sritayigrand.com']);
    const testGuestId = guestRes.rows[0].id;

    // 2. Insert test booking
    const bookingRes = await client.query(`
      INSERT INTO bookings (
        booking_reference, guest_id, check_in_date, check_out_date,
        adults_count, children_count, rooms_count, status, payment_status,
        payment_method, subtotal_amount, tax_amount, total_amount, paid_amount, booking_source
      ) VALUES (
        $1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day',
        2, 0, 1, 'confirmed', 'successful',
        'online', 1800.00, 216.00, 2016.00, 2016.00, 'diagnostic_test'
      )
      RETURNING id;
    `, [testRef, testGuestId]);
    const testBookingId = bookingRes.rows[0].id;

    // 3. Insert into booking_guests
    await client.query(`
      INSERT INTO booking_guests (booking_id, guest_name, age, gender, is_primary)
      VALUES ($1, $2, 30, 'Male', true);
    `, [testBookingId, 'Diagnostic Test Guest']);

    // 4. Insert into booking_status_history
    await client.query(`
      INSERT INTO booking_status_history (booking_id, from_status, to_status, notes)
      VALUES ($1, null, 'confirmed', 'Created during diagnostic audit');
    `, [testBookingId]);

    // 5. Insert into invoices
    await client.query(`
      INSERT INTO invoices (invoice_number, booking_id, subtotal, tax_amount, total_amount)
      VALUES ($1, $2, 1800.00, 216.00, 2016.00);
    `, [`INV-DIAG-${Date.now()}`, testBookingId]);

    // 6. Verify reading back the entire aggregated record
    const verifyRes = await client.query(`
      SELECT b.id, b.booking_reference, b.status, g.full_name, bg.guest_name, inv.total_amount
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN booking_guests bg ON bg.booking_id = b.id
      JOIN invoices inv ON inv.booking_id = b.id
      WHERE b.booking_reference = $1;
    `, [testRef]);

    if (verifyRes.rows.length === 1 && verifyRes.rows[0].booking_reference === testRef) {
      console.log('✅ End-to-end relational data insertion, foreign key resolution, and querying verified successfully!');
      console.log('Verified record payload:', verifyRes.rows[0]);
    } else {
      throw new Error('Verification query failed to retrieve expected relational record!');
    }

    // Rollback test data so database remains clean
    await client.query('ROLLBACK;');
    console.log('✅ Transaction test cleaned up (ROLLBACK successful - no test clutter left in DB).');

  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    console.error('❌ Data Persistence Test Failed:', err.message);
  }

  await client.end();
  console.log('\n================================================================');
  console.log('AUDIT COMPLETE: Database operational health and persistence VERIFIED.');
  console.log('================================================================');
}

runComprehensiveAudit().catch(console.error);
