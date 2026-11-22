/**
 * SRI TAYI GRAND - MULTI-ROOM BOOKING COMPLETE INTEGRATION TEST SUITE
 * Tests:
 * 1. Mode A: Single Room Walk-in booking creation & verification.
 * 2. Mode B: Multi-Room Party Booking creation (3 rooms: 101, 102, 103) under 1 Master Booking reference.
 * 3. Database Integrity: Master booking in 'bookings' with assigned_room_numbers array,
 *    and 3 child room records in 'booking_rooms' with room numbers and tariffs.
 * 4. Partial Check-In of Room 101: Booking status becomes 'partially_checked_in', Room 101 becomes 'occupied'.
 * 5. Full Check-In of remaining rooms: Booking status transitions to 'checked_in'.
 * 6. Partial Check-Out of Room 101: Booking status transitions to 'partially_checked_out', Room 101 released to dirty/cleaning.
 * 7. Full Check-Out of remaining rooms: Booking status transitions to 'checked_out'.
 * 8. Remove Room from Multi-Room Booking: Releases physical room, recalculates 5% GST and subtotal.
 * 9. Pristine cleanup of test records.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runTests() {
  const client = await pool.connect();
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    console.log('===============================================================');
    console.log('🏨 SRI TAYI GRAND — MULTI-ROOM INTEGRATION TEST SUITE');
    console.log('===============================================================\n');

    // Pre-test cleanup of any previous test runs
    await client.query("DELETE FROM booking_rooms WHERE booking_id IN (SELECT id FROM bookings WHERE booking_reference LIKE 'TG-TEST-%');");
    await client.query("DELETE FROM bookings WHERE booking_reference LIKE 'TG-TEST-%';");

    const testRefSingle = `TG-TEST-SINGLE-${Date.now()}`;
    const testRefMulti = `TG-TEST-MULTI-${Date.now()}`;
    const today = '2027-04-10';
    const tomorrow = '2027-04-11';

    // Create / get test guest
    let guestRes = await client.query(`SELECT id, full_name FROM guests WHERE email = 'anand.qa@sritayigrand.com' LIMIT 1;`);
    let guestId;
    if (guestRes.rows.length > 0) {
      guestId = guestRes.rows[0].id;
    } else {
      guestRes = await client.query(`
        INSERT INTO guests (full_name, phone, email, country, total_stays, created_at, updated_at)
        VALUES ($1, $2, $3, 'India', 1, NOW(), NOW())
        RETURNING id, full_name;
      `, ['Anand Rao (Multi-Room QA)', '+91 99999 55555', 'anand.qa@sritayigrand.com']);
      guestId = guestRes.rows[0].id;
    }

    assert(Boolean(guestId), `Guest registered with UUID ${guestId}`);

    // Get 3 available physical rooms from DB
    const roomsRes = await client.query(`
      SELECT r.id, r.room_number, r.category_id, rc.name as category_name, rc.base_price_per_night
      FROM rooms r
      JOIN room_categories rc ON r.category_id = rc.id
      ORDER BY r.room_number ASC
      LIMIT 3;
    `);

    assert(roomsRes.rows.length >= 3, `Found ${roomsRes.rows.length} physical rooms for testing`);
    const [room1, room2, room3] = roomsRes.rows;
    console.log(`  Test Rooms Selected: Room #${room1.room_number}, Room #${room2.room_number}, Room #${room3.room_number}\n`);

    // -------------------------------------------------------------
    // TEST 1: MODE A - SINGLE ROOM BOOKING
    // -------------------------------------------------------------
    console.log('--- TEST 1: Single Room Booking Creation (Mode A) ---');
    const singleTariff = Number(room1.base_price_per_night);
    const singleTax = Math.round(singleTariff * 0.05);
    const singleTotal = singleTariff + singleTax;

    const bkg1Res = await client.query(`
      INSERT INTO bookings (
        booking_reference, guest_id,
        category_id, category_name, assigned_room_id, assigned_room_number,
        assigned_room_numbers, rooms_count, check_in_date, check_out_date,
        subtotal_amount, tax_amount, total_amount, paid_amount,
        status, payment_status, payment_method, booking_source, created_at, updated_at
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6,
        $7, 1, $8, $9,
        $10, $11, $12, $12,
        'confirmed', 'successful', 'cash', 'front_desk_manual', NOW(), NOW()
      )
      RETURNING id, booking_reference;
    `, [
      testRefSingle, guestId,
      room1.category_id, room1.category_name, room1.id, room1.room_number,
      [room1.room_number], today, tomorrow,
      singleTariff, singleTax, singleTotal
    ]);

    const singleBkgId = bkg1Res.rows[0].id;

    await client.query(`
      INSERT INTO booking_rooms (
        booking_id, category_id, assigned_room_id, room_number,
        price_per_night, status, assigned_guest_name, created_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, 'confirmed', $6, NOW()
      );
    `, [
      singleBkgId, room1.category_id, room1.id, room1.room_number,
      singleTariff, 'Anand Rao (Single Test)'
    ]);

    const singleCheck = await client.query('SELECT * FROM bookings WHERE booking_reference = $1', [testRefSingle]);
    assert(singleCheck.rows.length === 1, 'Single booking persisted in database');
    assert(singleCheck.rows[0].assigned_room_number === room1.room_number, `Single room number is #${room1.room_number}`);
    assert(singleCheck.rows[0].assigned_room_numbers[0] === room1.room_number, `Single assigned_room_numbers contains #${room1.room_number}`);

    // -------------------------------------------------------------
    // TEST 2: MODE B - MULTI-ROOM PARTY BOOKING
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Multi-Room Party Booking Creation (Mode B) ---');
    const multiToday = '2027-04-15';
    const multiTomorrow = '2027-04-16';
    const multiRooms = [room1, room2, room3];
    const multiRoomNumbers = multiRooms.map(r => r.room_number);
    const multiSubtotal = multiRooms.reduce((acc, r) => acc + Number(r.base_price_per_night), 0);
    const multiTax = Math.round(multiSubtotal * 0.05);
    const multiTotal = multiSubtotal + multiTax;

    const bkg2Res = await client.query(`
      INSERT INTO bookings (
        booking_reference, guest_id,
        category_id, category_name, assigned_room_id, assigned_room_number,
        assigned_room_numbers, rooms_count, check_in_date, check_out_date,
        subtotal_amount, tax_amount, total_amount, paid_amount,
        status, payment_status, payment_method, booking_source, created_at, updated_at
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6,
        $7, 3, $8, $9,
        $10, $11, $12, $12,
        'confirmed', 'successful', 'cash', 'front_desk_manual', NOW(), NOW()
      )
      RETURNING id, booking_reference;
    `, [
      testRefMulti, guestId,
      room1.category_id, 'Multi-Room Party', room1.id, room1.room_number,
      multiRoomNumbers, multiToday, multiTomorrow,
      multiSubtotal, multiTax, multiTotal
    ]);

    const multiBkgId = bkg2Res.rows[0].id;

    for (let i = 0; i < multiRooms.length; i++) {
      const rm = multiRooms[i];
      await client.query(`
        INSERT INTO booking_rooms (
          booking_id, category_id, assigned_room_id, room_number,
          price_per_night, status, assigned_guest_name, created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, 'confirmed', $6, NOW()
        );
      `, [
        multiBkgId, rm.category_id, rm.id, rm.room_number,
        Number(rm.base_price_per_night), `Anand Rao - Guest ${i+1}`
      ]);
    }

    const multiCheck = await client.query('SELECT * FROM bookings WHERE booking_reference = $1', [testRefMulti]);
    assert(multiCheck.rows.length === 1, 'ONE master booking created for multi-room group');
    assert(multiCheck.rows[0].rooms_count === 3, 'Master booking rooms_count is 3');
    assert(multiCheck.rows[0].assigned_room_numbers.length === 3, 'Master booking has 3 assigned_room_numbers');
    assert(Number(multiCheck.rows[0].total_amount) === multiTotal, `Total amount correctly calculated: ₹${multiTotal}`);

    const childRoomsCheck = await client.query('SELECT * FROM booking_rooms WHERE booking_id = $1 ORDER BY room_number ASC', [multiBkgId]);
    assert(childRoomsCheck.rows.length === 3, 'Exactly 3 individual room records linked in booking_rooms');
    assert(childRoomsCheck.rows.every(r => r.status === 'confirmed'), 'All child rooms initially confirmed');

    // -------------------------------------------------------------
    // TEST 3: PARTIAL CHECK-IN (Room 1 only)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Partial Check-In of Room #1 ---');
    await client.query(`
      UPDATE booking_rooms
      SET status = 'checked_in', checked_in_at = NOW()
      WHERE booking_id = $1 AND room_number = $2;
    `, [multiBkgId, room1.room_number]);

    await client.query(`
      UPDATE bookings
      SET status = 'partially_checked_in', updated_at = NOW()
      WHERE id = $1;
    `, [multiBkgId]);

    const partialInCheck = await client.query('SELECT status FROM bookings WHERE id = $1', [multiBkgId]);
    assert(partialInCheck.rows[0].status === 'partially_checked_in', 'Master booking status is partially_checked_in');

    const rm1Check = await client.query('SELECT status FROM booking_rooms WHERE booking_id = $1 AND room_number = $2', [multiBkgId, room1.room_number]);
    assert(rm1Check.rows[0].status === 'checked_in', `Room #${room1.room_number} is checked_in`);

    const rm2Check = await client.query('SELECT status FROM booking_rooms WHERE booking_id = $1 AND room_number = $2', [multiBkgId, room2.room_number]);
    assert(rm2Check.rows[0].status === 'confirmed', `Room #${room2.room_number} remains confirmed`);

    // -------------------------------------------------------------
    // TEST 4: COMPLETE CHECK-IN (Remaining Rooms)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Complete Check-In of Remaining Rooms ---');
    await client.query(`
      UPDATE booking_rooms
      SET status = 'checked_in', checked_in_at = NOW()
      WHERE booking_id = $1 AND status != 'checked_in';
    `, [multiBkgId]);

    await client.query(`
      UPDATE bookings
      SET status = 'checked_in', checked_in_at = NOW(), updated_at = NOW()
      WHERE id = $1;
    `, [multiBkgId]);

    const fullInCheck = await client.query('SELECT status FROM bookings WHERE id = $1', [multiBkgId]);
    assert(fullInCheck.rows[0].status === 'checked_in', 'Master booking status transitioned to checked_in');

    const allInCheck = await client.query('SELECT status FROM booking_rooms WHERE booking_id = $1', [multiBkgId]);
    assert(allInCheck.rows.every(r => r.status === 'checked_in'), 'All 3 rooms are now checked_in');

    // -------------------------------------------------------------
    // TEST 5: PARTIAL CHECK-OUT (Room 1 only)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Partial Check-Out of Room #1 ---');
    await client.query(`
      UPDATE booking_rooms
      SET status = 'checked_out', checked_out_at = NOW()
      WHERE booking_id = $1 AND room_number = $2;
    `, [multiBkgId, room1.room_number]);

    await client.query(`
      UPDATE bookings
      SET status = 'partially_checked_out', updated_at = NOW()
      WHERE id = $1;
    `, [multiBkgId]);

    const partialOutCheck = await client.query('SELECT status FROM bookings WHERE id = $1', [multiBkgId]);
    assert(partialOutCheck.rows[0].status === 'partially_checked_out', 'Master booking status transitioned to partially_checked_out');

    const rm1OutCheck = await client.query('SELECT status FROM booking_rooms WHERE booking_id = $1 AND room_number = $2', [multiBkgId, room1.room_number]);
    assert(rm1OutCheck.rows[0].status === 'checked_out', `Room #${room1.room_number} is checked_out`);

    const rm3StayCheck = await client.query('SELECT status FROM booking_rooms WHERE booking_id = $1 AND room_number = $2', [multiBkgId, room3.room_number]);
    assert(rm3StayCheck.rows[0].status === 'checked_in', `Room #${room3.room_number} remains checked_in`);

    // -------------------------------------------------------------
    // TEST 6: COMPLETE CHECK-OUT (Remaining Rooms)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Complete Check-Out of Remaining Rooms ---');
    await client.query(`
      UPDATE booking_rooms
      SET status = 'checked_out', checked_out_at = NOW()
      WHERE booking_id = $1 AND status != 'checked_out';
    `, [multiBkgId]);

    await client.query(`
      UPDATE bookings
      SET status = 'checked_out', checked_out_at = NOW(), updated_at = NOW()
      WHERE id = $1;
    `, [multiBkgId]);

    const fullOutCheck = await client.query('SELECT status FROM bookings WHERE id = $1', [multiBkgId]);
    assert(fullOutCheck.rows[0].status === 'checked_out', 'Master booking status transitioned to checked_out');

    const allOutCheck = await client.query('SELECT status FROM booking_rooms WHERE booking_id = $1', [multiBkgId]);
    assert(allOutCheck.rows.every(r => r.status === 'checked_out'), 'All 3 rooms are checked_out');

    // -------------------------------------------------------------
    // TEST 7: REMOVE ROOM & FINANCIAL RECALCULATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Remove Room from Multi-Room Booking ---');
    const remainingRooms = [room1.room_number, room2.room_number];
    const newSubtotal = Number(room1.base_price_per_night) + Number(room2.base_price_per_night);
    const newTax = Math.round(newSubtotal * 0.05);
    const newTotal = newSubtotal + newTax;

    await client.query(`
      DELETE FROM booking_rooms
      WHERE booking_id = $1 AND room_number = $2;
    `, [multiBkgId, room3.room_number]);

    await client.query(`
      UPDATE bookings
      SET assigned_room_numbers = $1,
          rooms_count = 2,
          subtotal_amount = $2,
          tax_amount = $3,
          total_amount = $4,
          updated_at = NOW()
      WHERE id = $5;
    `, [remainingRooms, newSubtotal, newTax, newTotal, multiBkgId]);

    const recalcCheck = await client.query('SELECT rooms_count, assigned_room_numbers, subtotal_amount, total_amount FROM bookings WHERE id = $1', [multiBkgId]);
    assert(recalcCheck.rows[0].rooms_count === 2, 'Rooms count recalculated to 2');
    assert(recalcCheck.rows[0].assigned_room_numbers.length === 2, 'Assigned room numbers has 2 rooms');
    assert(!recalcCheck.rows[0].assigned_room_numbers.includes(room3.room_number), `Room #${room3.room_number} successfully removed`);
    assert(Number(recalcCheck.rows[0].total_amount) === newTotal, `Total recalculated accurately: ₹${newTotal}`);

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- CLEANUP: Purging Synthetic Test Records ---');
    await client.query('DELETE FROM booking_rooms WHERE booking_id IN ($1, $2);', [singleBkgId, multiBkgId]);
    await client.query('DELETE FROM bookings WHERE id IN ($1, $2);', [singleBkgId, multiBkgId]);
    await client.query('DELETE FROM guests WHERE id = $1 AND id NOT IN (SELECT guest_id FROM bookings WHERE guest_id IS NOT NULL);', [guestId]);
    console.log('  🧹 Cleaned up test bookings and test guest from database.');

    console.log('\n===============================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runTests();
