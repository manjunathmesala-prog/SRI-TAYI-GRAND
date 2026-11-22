import * as fs from 'fs';

// Load .env.local into process.env before any DB modules load
if (fs.existsSync('.env.local')) {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

import { repo } from '../src/lib/db/repository';
import { Booking } from '../src/types';
import { Client } from 'pg';

function getPgClient() {
  const dbUrl = process.env.DATABASE_URL || '';
  return new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
}

async function runStayExtensionTestSuite() {
  console.log('====================================================');
  console.log('🧪 SRI TAYI GRAND - STAY EXTENSION E2E TEST SUITE');
  console.log('====================================================\n');

  const pgClient = getPgClient();
  await pgClient.connect();
  console.log('✅ Connected to Supabase PostgreSQL database.');

  const testRef1 = 'TEST-EXT-BK-101';
  const testRef2 = 'TEST-CONF-BK-102';

  const cleanupDatabase = async () => {
    await pgClient.query(`DELETE FROM stay_extensions WHERE booking_reference IN ($1, $2)`, [testRef1, testRef2]);
    await pgClient.query(`DELETE FROM additional_charges WHERE booking_reference IN ($1, $2)`, [testRef1, testRef2]);
    await pgClient.query(`DELETE FROM payments WHERE booking_reference IN ($1, $2)`, [testRef1, testRef2]);
    await pgClient.query(`DELETE FROM cash_transactions WHERE booking_reference IN ($1, $2)`, [testRef1, testRef2]);
    await pgClient.query(`DELETE FROM bookings WHERE booking_reference IN ($1, $2)`, [testRef1, testRef2]);
  };

  try {
    // -------------------------------------------------------------------------
    // PRE-TEST CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n🧹 Performing pre-test cleanup...');
    await cleanupDatabase();

    // Also remove from repo in-memory
    repo['bookings'] = repo['bookings'].filter((b) => b.booking_reference !== testRef1 && b.booking_reference !== testRef2);
    repo['stayExtensions'] = repo['stayExtensions'].filter((s) => s.booking_reference !== testRef1 && s.booking_reference !== testRef2);
    repo['folioCharges'] = repo['folioCharges'].filter((f) => f.booking_reference !== testRef1 && f.booking_reference !== testRef2);
    repo['payments'] = repo['payments'].filter((p) => p.booking_reference !== testRef1 && p.booking_reference !== testRef2);
    repo['cashTransactions'] = repo['cashTransactions'].filter((c) => c.booking_reference !== testRef1 && c.booking_reference !== testRef2);

    // Ensure Room 101 and Room 102 are available initially
    const room101 = repo.getRooms().find((r) => r.room_number === '101');
    const room102 = repo.getRooms().find((r) => r.room_number === '102');
    if (room101) {
      room101.operational_status = 'available';
      room101.current_booking_ref = undefined;
      room101.current_guest_name = undefined;
    }
    if (room102) {
      room102.operational_status = 'available';
      room102.current_booking_ref = undefined;
      room102.current_guest_name = undefined;
    }

    // -------------------------------------------------------------------------
    // STEP 1: CREATE IN-HOUSE TEST BOOKING
    // -------------------------------------------------------------------------
    console.log('\n🏨 Step 1: Creating in-house checked-in booking for Room 101...');
    const testBooking: Booking = {
      id: 'a0000000-0000-4000-8000-000000000101',
      booking_reference: testRef1,
      guest_id: 'a0000000-0000-4000-8000-000000000999',
      guest_name: 'Manjunath Sri Tayi',
      guest_email: 'guest@sritayigrand.com',
      guest_phone: '+91 99999 88888',
      room_number: '101',
      assigned_room_number: '101',
      assigned_room_id: room101?.id || 'rm-101',
      check_in_date: '2026-11-23T14:00:00Z',
      check_out_date: '2026-11-24T11:00:00Z',
      status: 'checked_in',
      total_amount: 2100,
      subtotal_amount: 2000,
      tax_amount: 100,
      paid_amount: 2100,
      payment_status: 'successful',
      pricing_mode: 'gst_inclusive',
      room_charges_amount: 2000,
      num_guests: 2,
      booking_source: 'front_desk',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (room101) {
      room101.operational_status = 'occupied';
      room101.current_booking_ref = testRef1;
      room101.current_guest_name = testBooking.guest_name;
    }
    repo['bookings'].unshift(testBooking);
    console.log(`✅ In-house booking ${testRef1} created for Room 101 (2026-11-23 to 2026-11-24).`);

    // -------------------------------------------------------------------------
    // STEP 2: CHECK EXTENSION AVAILABILITY (NO CONFLICT)
    // -------------------------------------------------------------------------
    console.log('\n🔍 Step 2: Testing checkStayExtensionAvailability (+1 night to 2026-11-25)...');
    const availCheck1 = repo.checkStayExtensionAvailability({
      bookingReference: testRef1,
      newCheckOutDate: '2026-11-25',
    });

    console.log('Availability check result:', {
      available: availCheck1.available,
      additionalNights: availCheck1.additionalNights,
      message: availCheck1.message,
    });

    if (!availCheck1.available) {
      throw new Error(`Expected Room 101 to be available, but got: ${availCheck1.message}`);
    }
    if (availCheck1.additionalNights !== 1) {
      throw new Error(`Expected 1 additional night, got ${availCheck1.additionalNights}`);
    }
    console.log('✅ Extension availability successfully verified.');

    // -------------------------------------------------------------------------
    // STEP 3: EXECUTE STAY EXTENSION WITH IMMEDIATE CASH PAYMENT
    // -------------------------------------------------------------------------
    console.log('\n💳 Step 3: Executing stay extension (+1 night, ₹2000 Cash paid now)...');
    const extResult1 = await repo.extendStay({
      bookingReference: testRef1,
      newCheckOutDate: '2026-11-25',
      paidNow: 2000,
      paymentMethod: 'cash',
      reason: 'Guest requested late departure and one additional night stay',
      actor: 'Sagar Manager',
      idempotencyKey: 'idem-test-ext-001',
    });

    console.log('Extension result status:', extResult1.success);
    console.log('Updated Booking Checkout Date:', extResult1.booking.check_out_date);
    console.log('Updated Booking Total:', extResult1.booking.total_amount);
    console.log('Updated Booking Paid Amount:', extResult1.booking.paid_amount);
    console.log('Created Stay Extension Record ID:', extResult1.extension.id);

    // Assertions
    if (!extResult1.success) throw new Error('Stay extension returned success: false');
    if (extResult1.booking.check_out_date !== '2026-11-25') {
      throw new Error(`Expected checkout 2026-11-25, got ${extResult1.booking.check_out_date}`);
    }
    if (extResult1.booking.total_amount <= 2100) {
      throw new Error(`Expected total_amount > 2100, got ${extResult1.booking.total_amount}`);
    }
    if (extResult1.booking.paid_amount !== 4100) {
      throw new Error(`Expected paid_amount 4100, got ${extResult1.booking.paid_amount}`);
    }

    // Verify folio charge
    const folio = repo.getFolioCharges(testRef1).find((f) => f.category === 'stay_extension');
    if (!folio) throw new Error('Stay extension folio charge was not created!');
    console.log(`✅ Folio charge verified: "${folio.description}" (₹${folio.total_amount})`);

    // Verify cashbook cash transaction
    const cashTx = repo['cashTransactions'].find((c) => c.booking_reference === testRef1);
    if (!cashTx) throw new Error('Cash drawer transaction was not created for cash payment!');
    console.log(`✅ Cashbook drawer transaction verified: ₹${cashTx.amount} (${cashTx.reason})`);

    // Verify repository stay extension list
    const extRecords = repo.getStayExtensions(testRef1);
    if (extRecords.length === 0) throw new Error('getStayExtensions returned empty!');
    console.log(`✅ Repository stay extension record confirmed: ${extRecords[0].id}`);

    // -------------------------------------------------------------------------
    // STEP 4: TEST IDEMPOTENCY SAFETY
    // -------------------------------------------------------------------------
    console.log('\n🔒 Step 4: Testing idempotency replay protection...');
    const extResultIdempotent = await repo.extendStay({
      bookingReference: testRef1,
      newCheckOutDate: '2026-11-25',
      paidNow: 2000,
      paymentMethod: 'cash',
      reason: 'Duplicate call attempt',
      actor: 'Sagar Manager',
      idempotencyKey: 'idem-test-ext-001',
    });

    if (!extResultIdempotent.alreadyProcessed) {
      throw new Error('Expected alreadyProcessed: true for duplicate idempotency key!');
    }
    if (extResultIdempotent.booking.check_out_date !== '2026-11-25') {
      throw new Error('Booking checkout date was corrupted by duplicate call!');
    }
    console.log('✅ Idempotency protection verified! Prevented double booking & duplicate billing.');

    // -------------------------------------------------------------------------
    // STEP 5: TEST ROOM CONFLICT DETECTION & ALTERNATIVE ROOM SELECTION
    // -------------------------------------------------------------------------
    console.log('\n⚠️ Step 5: Setting up future booking collision on Room 101...');
    const conflictBooking: Booking = {
      id: 'a0000000-0000-4000-8000-000000000102',
      booking_reference: testRef2,
      guest_id: 'a0000000-0000-4000-8000-000000000998',
      guest_name: 'Upcoming Guest Collision',
      guest_email: 'upcoming@example.com',
      guest_phone: '+91 88888 77777',
      room_number: '101',
      assigned_room_number: '101',
      assigned_room_id: room101?.id || 'rm-101',
      check_in_date: '2026-11-26T14:00:00Z',
      check_out_date: '2026-11-28T11:00:00Z',
      status: 'confirmed',
      total_amount: 4000,
      subtotal_amount: 4000,
      tax_amount: 0,
      paid_amount: 4000,
      payment_status: 'successful',
      num_guests: 2,
      booking_source: 'website',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    repo['bookings'].unshift(conflictBooking);

    console.log('Checking extension for Room 101 to 2026-11-27 (which overlaps 2026-11-26 to 2026-11-28)...');
    const availConflict = repo.checkStayExtensionAvailability({
      bookingReference: testRef1,
      newCheckOutDate: '2026-11-27',
    });

    console.log('Availability conflict result:', {
      available: availConflict.available,
      conflict: availConflict.conflict,
      hasAvailableRooms: (availConflict.availableRooms?.length || 0) > 0,
    });

    if (availConflict.available) {
      throw new Error('Expected conflict on Room 101, but system reported room is available!');
    }
    if (!availConflict.conflict) {
      throw new Error('Expected conflict details to be populated!');
    }
    if (!availConflict.availableRooms || availConflict.availableRooms.length === 0) {
      throw new Error('Expected candidate alternative rooms to be offered!');
    }
    console.log(`✅ Room conflict correctly detected! Offered ${availConflict.availableRooms.length} alternative room options.`);

    // -------------------------------------------------------------------------
    // STEP 6: TEST EXTENSION WITH ROOM TRANSFER TO ALTERNATIVE ROOM (ROOM 102)
    // -------------------------------------------------------------------------
    console.log('\n🔄 Step 6: Testing stay extension combined with room transfer to Room 102...');
    const extTransferResult = await repo.extendStay({
      bookingReference: testRef1,
      newCheckOutDate: '2026-11-27',
      targetRoomNumber: '102',
      paidNow: 0,
      reason: 'Extended stay with transfer due to Room 101 upcoming reservation',
      actor: 'Sagar Manager',
      idempotencyKey: 'idem-test-ext-transfer-002',
    });

    console.log('Transfer & Extension result:', {
      success: extTransferResult.success,
      newCheckout: extTransferResult.booking.check_out_date,
      assignedRoom: extTransferResult.booking.assigned_room_number,
      roomNumber: extTransferResult.booking.room_number,
    });

    if (!extTransferResult.success) throw new Error('Transfer extension returned success: false');
    if (extTransferResult.booking.check_out_date !== '2026-11-27') {
      throw new Error(`Expected checkout 2026-11-27, got ${extTransferResult.booking.check_out_date}`);
    }
    if (extTransferResult.booking.assigned_room_number !== '102' || extTransferResult.booking.room_number !== '102') {
      throw new Error(`Expected room 102, got ${extTransferResult.booking.assigned_room_number}`);
    }

    // Verify room states
    const finalRoom101 = repo.getRooms().find((r) => r.room_number === '101');
    const finalRoom102 = repo.getRooms().find((r) => r.room_number === '102');
    console.log(`Room 101 status: ${finalRoom101?.operational_status}`);
    console.log(`Room 102 status: ${finalRoom102?.operational_status}`);

    if (finalRoom102?.operational_status !== 'occupied') {
      throw new Error('Destination room 102 was not marked occupied!');
    }
    console.log('✅ Room transfer & stay extension workflow completely validated!');

    // -------------------------------------------------------------------------
    // STEP 7: TEST DATABASE PERSISTENCE IN SUPABASE POSTGRESQL
    // -------------------------------------------------------------------------
    console.log('\n💾 Step 7: Verifying Supabase PostgreSQL database persistence...');
    const dbExtensions = await pgClient.query(
      `SELECT * FROM stay_extensions WHERE booking_reference = $1 ORDER BY created_at ASC`,
      [testRef1]
    );

    console.log(`Database rows found in stay_extensions: ${dbExtensions.rows.length}`);
    if (dbExtensions.rows.length !== 2) {
      throw new Error(`Expected 2 stay extension rows in Supabase, found ${dbExtensions.rows.length}`);
    }

    for (const row of dbExtensions.rows) {
      console.log(` - ID: ${row.id}, Room: ${row.room_number}, From: ${row.previous_checkout_date} To: ${row.new_checkout_date}, Charge: ₹${row.total_extension_charge}, Paid: ₹${row.paid_now}`);
    }
    console.log('✅ Database schema and persistence in Supabase PostgreSQL verified!');

    console.log('\n====================================================');
    console.log('🎉 ALL 7 STAY EXTENSION TEST SUITES PASSED FLAWLESSLY!');
    console.log('====================================================\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    throw error;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP TEST DATA FROM REPO & DB
    // -------------------------------------------------------------------------
    console.log('🧹 Cleaning up test artifacts from database and memory...');
    try {
      await cleanupDatabase();

      repo['bookings'] = repo['bookings'].filter((b) => b.booking_reference !== testRef1 && b.booking_reference !== testRef2);
      repo['stayExtensions'] = repo['stayExtensions'].filter((s) => s.booking_reference !== testRef1 && s.booking_reference !== testRef2);
      repo['folioCharges'] = repo['folioCharges'].filter((f) => f.booking_reference !== testRef1 && f.booking_reference !== testRef2);
      repo['payments'] = repo['payments'].filter((p) => p.booking_reference !== testRef1 && p.booking_reference !== testRef2);
      repo['cashTransactions'] = repo['cashTransactions'].filter((c) => c.booking_reference !== testRef1 && c.booking_reference !== testRef2);

      const r101 = repo.getRooms().find((r) => r.room_number === '101');
      const r102 = repo.getRooms().find((r) => r.room_number === '102');
      if (r101) { r101.operational_status = 'available'; r101.current_booking_ref = undefined; r101.current_guest_name = undefined; }
      if (r102) { r102.operational_status = 'available'; r102.current_booking_ref = undefined; r102.current_guest_name = undefined; }

      await pgClient.end();
      console.log('✅ Cleanup complete. Database and repository in pristine state.');
    } catch (e) {
      console.error('Error during cleanup:', e);
    }
  }
}

runStayExtensionTestSuite().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
