const { Client } = require('pg');

const connectionString = 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function runScenarioTests() {
  console.log('--- RUNNING FULL SYSTEM SCENARIO INTEGRITY TESTS ---');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // SCENARIO 1: Verify all bookings have balanced paid_amount vs payments table
    console.log('\n[Scenario 1] Auditing all bookings for paid_amount vs payments mismatch...');
    const auditRes = await client.query(`
      SELECT 
        b.booking_reference,
        b.total_amount,
        b.paid_amount as recorded_paid,
        COALESCE(SUM(p.amount), 0) as payments_sum
      FROM bookings b
      LEFT JOIN payments p ON (p.booking_id = b.id OR p.booking_reference = b.booking_reference) AND (p.status = 'successful' OR p.status IS NULL)
      GROUP BY b.id, b.booking_reference, b.total_amount, b.paid_amount
      HAVING b.paid_amount != COALESCE(SUM(p.amount), 0) AND b.paid_amount > 0;
    `);

    if (auditRes.rows.length === 0) {
      console.log('✅ PASS: All bookings in database have 100% balanced paid_amount matching actual payments!');
    } else {
      console.log(`⚠️ Warning: Found ${auditRes.rows.length} bookings with discrepancies:`, auditRes.rows);
    }

    // SCENARIO 2: Verify no orphan ghost allocations exist in booking_rooms
    console.log('\n[Scenario 2] Auditing booking_rooms for ghost duplicate allocations...');
    const ghostRes = await client.query(`
      SELECT 
        br.booking_id,
        b.booking_reference,
        b.rooms_count,
        COUNT(br.id) as actual_allocations
      FROM booking_rooms br
      JOIN bookings b ON br.booking_id = b.id
      GROUP BY br.booking_id, b.booking_reference, b.rooms_count
      HAVING COUNT(br.id) > b.rooms_count;
    `);

    if (ghostRes.rows.length === 0) {
      console.log('✅ PASS: Zero ghost duplicate room allocations in the entire database!');
    } else {
      console.log(`⚠️ Warning: Found ${ghostRes.rows.length} bookings with ghost allocations:`, ghostRes.rows);
    }

    // SCENARIO 3: Verify room number assignments are valid rooms
    console.log('\n[Scenario 3] Auditing room allocations to ensure actual physical rooms exist...');
    const invalidRoomRes = await client.query(`
      SELECT br.id, br.booking_id, br.room_number
      FROM booking_rooms br
      LEFT JOIN rooms r ON br.room_number = r.room_number
      WHERE br.room_number IS NOT NULL AND br.room_number != '' AND r.id IS NULL;
    `);

    if (invalidRoomRes.rows.length === 0) {
      console.log('✅ PASS: All assigned room allocations point to valid physical rooms in inventory!');
    } else {
      console.log('⚠️ Warning: Found invalid room numbers:', invalidRoomRes.rows);
    }

    // SCENARIO 4: Verify payments table foreign key consistency
    console.log('\n[Scenario 4] Auditing payments foreign keys...');
    const orphanPayRes = await client.query(`
      SELECT p.id, p.payment_reference, p.booking_reference
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE p.booking_id IS NULL AND p.booking_reference IS NOT NULL AND p.booking_reference != '';
    `);

    if (orphanPayRes.rows.length === 0) {
      console.log('✅ PASS: All payments with booking references are linked to bookings.id foreign keys!');
    } else {
      console.log(`⚠️ Info: Found ${orphanPayRes.rows.length} payments with null booking_id:`, orphanPayRes.rows);
    }

  } finally {
    await client.end();
  }
}

runScenarioTests().catch(console.error);
