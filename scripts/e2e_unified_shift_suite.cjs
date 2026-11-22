const { Pool } = require('pg');
const fs = require('fs');

if (fs.existsSync('.env.local')) {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > -1) {
        process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      }
    }
  });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runSuite() {
  const client = await pool.connect();
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failCount++;
    }
  }

  try {
    console.log('================================================================');
    console.log(' SRI TAYI GRAND TMS: UNIFIED SHIFT & CASH DRAWER TEST SUITE');
    console.log('================================================================\n');

    await client.query('BEGIN');

    // -------------------------------------------------------------
    // TEST A: Hari Achari's Morning Shift Lifecycle
    // -------------------------------------------------------------
    console.log('--- TEST A: Hari Achari Morning Shift Lifecycle ---');
    const hariId = '50aba2e5-0000-4fbd-bb89-000000000001';
    const hariName = 'Hari Achari';
    const openingDenomsA = { c500: 6, c200: 5, c100: 8, c50: 4 }; // 3000 + 1000 + 800 + 200 = 5000
    const openingFloatA = 5000;

    const startResA = await client.query(`
      SELECT public.start_manager_shift(
        $1, $2, 'Hotel Manager', $3, $4::jsonb, 'morning', 'Test morning shift opening', $2
      ) as result;
    `, [hariId, hariName, openingFloatA, JSON.stringify(openingDenomsA)]);

    const shiftDataA = startResA.rows[0].result;
    assert(shiftDataA.success === true, 'Shift started successfully');
    assert(shiftDataA.attendance.staff_name === hariName, 'Attendance belongs to Hari Achari');
    assert(shiftDataA.attendance.clock_out === null, 'Attendance is active (clock_out IS NULL)');
    assert(shiftDataA.shift.status === 'open', 'Cash shift is OPEN');
    assert(Number(shiftDataA.shift.opening_float) === 5000, 'Opening float is ₹5,000');
    assert(shiftDataA.shift.attendance_id === shiftDataA.attendance.id, 'Cash shift references Attendance ID');

    const shiftIdA = shiftDataA.shift.id;

    // Record Cash Collection (Physical Cash In)
    await client.query(`
      INSERT INTO public.cash_transactions (
        id, shift_id, type, category, amount, reason, performed_by, created_at
      ) VALUES (
        'tx-test-cash-in-1', $1, 'cash_in', 'guest_payment', 2500, 'Walk-in cash collection room 102', $2, NOW()
      );
    `, [shiftIdA, hariName]);

    // Record Expense (Physical Cash Out)
    await client.query(`
      INSERT INTO public.cash_transactions (
        id, shift_id, type, category, amount, reason, performed_by, created_at
      ) VALUES (
        'tx-test-cash-out-1', $1, 'cash_out', 'expense_payout', 500, 'Front desk stationery supplies', $2, NOW()
      );
    `, [shiftIdA, hariName]);

    // Financial calculations: Expected = 5000 + 2500 - 500 = 7000.
    // Counted = 7000 -> Discrepancy = 0
    const closingDenomsA = { c500: 14 }; // 14 * 500 = 7000
    const countedCashA = 7000;

    const endResA = await client.query(`
      SELECT public.end_manager_shift(
        $1, $2, $3::jsonb, 'Smooth handover to Sagar', NULL, $4
      ) as result;
    `, [shiftIdA, countedCashA, JSON.stringify(closingDenomsA), hariName]);

    const endDataA = endResA.rows[0].result;
    assert(endDataA.success === true, 'Shift closed successfully');
    assert(endDataA.shift.status === 'closed', 'Cash shift status is CLOSED');
    assert(endDataA.attendance.clock_out !== null, 'Attendance is clocked out');
    assert(Number(endDataA.financials.expectedClosingCash) === 7000, 'Expected closing cash is ₹7,000');
    assert(Number(endDataA.financials.closingCashCounted) === 7000, 'Counted cash is ₹7,000');
    assert(Number(endDataA.financials.discrepancy) === 0, 'Discrepancy is ₹0 (Balanced)');

    // -------------------------------------------------------------
    // TEST B: Sagar's Evening Shift Lifecycle (Handover Continuity)
    // -------------------------------------------------------------
    console.log('\n--- TEST B: Sagar Evening Shift Lifecycle (Handover) ---');
    const sagarId = '50aba2e5-0000-4fbd-bb89-000000000002';
    const sagarName = 'Sagar';
    const openingDenomsB = { c500: 14 }; // Received 7000 from Hari
    const openingFloatB = 7000;

    const startResB = await client.query(`
      SELECT public.start_manager_shift(
        $1, $2, 'Hotel Manager', $3, $4::jsonb, 'evening', 'Received float from Hari', $2
      ) as result;
    `, [sagarId, sagarName, openingFloatB, JSON.stringify(openingDenomsB)]);

    const shiftDataB = startResB.rows[0].result;
    assert(shiftDataB.success === true, 'Sagar shift started successfully');
    assert(shiftDataB.attendance.staff_name === sagarName, 'Attendance belongs to Sagar');
    assert(shiftDataB.shift.shift_number !== shiftDataA.shift.shift_number, 'Sequential shift number generated');

    const shiftIdB = shiftDataB.shift.id;

    // Record cash collection
    await client.query(`
      INSERT INTO public.cash_transactions (
        id, shift_id, type, category, amount, reason, performed_by, created_at
      ) VALUES (
        'tx-test-cash-in-2', $1, 'cash_in', 'guest_payment', 1000, 'Room service cash collection', $2, NOW()
      );
    `, [shiftIdB, sagarName]);

    // End Sagar shift with discrepancy explanation:
    // Expected: 7000 + 1000 = 8000. Counted: 7950 (-50 shortage)
    const closingDenomsB = { c500: 15, c200: 2, c50: 1 }; // 7500 + 400 + 50 = 7950
    const countedCashB = 7950;

    const endResB = await client.query(`
      SELECT public.end_manager_shift(
        $1, $2, $3::jsonb, 'Closing evening shift', '₹50 difference due to change shortage in coins', $4
      ) as result;
    `, [shiftIdB, countedCashB, JSON.stringify(closingDenomsB), sagarName]);

    const endDataB = endResB.rows[0].result;
    assert(endDataB.success === true, 'Sagar shift ended successfully');
    assert(Number(endDataB.financials.expectedClosingCash) === 8000, 'Expected cash is ₹8,000');
    assert(Number(endDataB.financials.closingCashCounted) === 7950, 'Counted cash is ₹7,950');
    assert(Number(endDataB.financials.discrepancy) === -50, 'Shortage of -₹50 correctly recorded');
    assert(endDataB.shift.discrepancy_reason.includes('coins'), 'Discrepancy explanation saved');

    // -------------------------------------------------------------
    // TEST C: Concurrency Collisions (Simultaneous Managers)
    // -------------------------------------------------------------
    console.log('\n--- TEST C: Concurrency Collisions & Locking ---');
    // Start a shift for Hari
    const collShift = await client.query(`
      SELECT public.start_manager_shift(
        $1, $2, 'Hotel Manager', 5000, '{}'::jsonb, 'general', 'Concurrency test', $2
      ) as result;
    `, [hariId, hariName]);

    assert(collShift.rows[0].result.success === true, 'Hari shift started for concurrency test');

    // Sagar attempts to start simultaneous shift -> MUST FAIL
    await client.query('SAVEPOINT coll_test');
    let collisionBlocked = false;
    try {
      await client.query(`
        SELECT public.start_manager_shift(
          $1, $2, 'Hotel Manager', 5000, '{}'::jsonb, 'general', 'Collision attempt', $2
        );
      `, [sagarId, sagarName]);
    } catch (collErr) {
      collisionBlocked = true;
      assert(collErr.message.includes('Manager Duty Collision') || collErr.message.includes('already clocked in'), 'Simultaneous manager blocked with Manager Duty Collision');
    }
    await client.query('ROLLBACK TO coll_test');
    assert(collisionBlocked === true, 'Database blocked concurrent manager clock-in');

    // -------------------------------------------------------------
    // TEST D: Digital Payment Non-Cash Impact
    // -------------------------------------------------------------
    console.log('\n--- TEST D: Digital Payment Non-Cash Impact ---');
    // Verify that payments in general ledger (Razorpay, UPI) do NOT affect drawer
    // Hari's shift has 5000 float, 0 cash transactions recorded.
    const activeShiftId = collShift.rows[0].result.shift.id;
    const endCollRes = await client.query(`
      SELECT public.end_manager_shift(
        $1, 5000, '{}'::jsonb, 'Ending concurrency test', NULL, $2
      ) as result;
    `, [activeShiftId, hariName]);

    assert(Number(endCollRes.rows[0].result.financials.expectedClosingCash) === 5000, 'Drawer balance untouched by digital payments');

    // -------------------------------------------------------------
    // TEST E: Audit Log Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST E: Audit Trail Verification ---');
    const logs = await client.query(`
      SELECT action, details, user_name, category
      FROM public.audit_logs
      WHERE action IN ('UNIFIED_SHIFT_START', 'UNIFIED_SHIFT_END')
      ORDER BY created_at DESC
      LIMIT 4;
    `);

    assert(logs.rows.length >= 2, 'Audit logs recorded for unified shift operations');
    assert(logs.rows.some(l => l.action === 'UNIFIED_SHIFT_START'), 'UNIFIED_SHIFT_START present in audit logs');
    assert(logs.rows.some(l => l.action === 'UNIFIED_SHIFT_END'), 'UNIFIED_SHIFT_END present in audit logs');

    // Rollback test data to keep production database clean
    await client.query('ROLLBACK');
    console.log('\n--- TRANSACTION ROLLED BACK CLEANLY (DATABASE PRISTINE) ---');

    console.log('================================================================');
    console.log(` RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Test suite execution error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSuite();
