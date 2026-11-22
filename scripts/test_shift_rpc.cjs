const { Pool } = require('pg');
const fs = require('fs');

if (fs.existsSync('.env.local')) {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    }
  });
}

async function runTest() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('--- TESTING start_manager_shift & end_manager_shift FUNCTIONS ---');
    await client.query('BEGIN');

    // 1. Start shift for Hari Achari
    console.log('1. Starting shift for Hari Achari (Float: 3500)...');
    const startRes = await client.query(`
      SELECT public.start_manager_shift(
        '50aba2e5-0000-4fbd-bb89-000000000001',
        'Hari Achari',
        'Hotel Manager',
        3500,
        '{"c500": 6, "c200": 2, "c100": 1}'::jsonb,
        'morning',
        'Opening shift with standard float',
        'Hari Achari'
      ) as result;
    `);

    const startData = startRes.rows[0].result;
    console.log('Start Shift Result:', JSON.stringify(startData, null, 2));

    const shiftId = startData.shift.id;
    const attId = startData.attendance.id;

    // 2. Concurrency check: Attempt to start second shift simultaneously -> MUST FAIL
    console.log('2. Testing concurrency collision (Sagar tries to start shift while Hari is active)...');
    await client.query('SAVEPOINT collision_test');
    try {
      await client.query(`
        SELECT public.start_manager_shift(
          '50aba2e5-0000-4fbd-bb89-000000000002',
          'Sagar',
          'Hotel Manager',
          5000,
          '{}'::jsonb,
          'morning',
          'Collision attempt',
          'Sagar'
        );
      `);
      console.error('ERROR: Concurrency check FAILED to block simultaneous shift!');
    } catch (collErr) {
      console.log('SUCCESS: Concurrency collision correctly blocked:', collErr.message);
      await client.query('ROLLBACK TO collision_test');
    }

    // 3. Record a cash transaction for this shift
    console.log('3. Recording cash collection in drawer...');
    await client.query(`
      INSERT INTO public.cash_transactions (
        id, shift_id, type, category, amount, reason, performed_by, created_at
      ) VALUES (
        'tx-test-1', $1, 'cash_in', 'guest_payment', 1500, 'Walk-in cash payment', 'Hari Achari', NOW()
      );
    `, [shiftId]);

    // 4. End shift for Hari Achari with physical count
    console.log('4. Ending shift for Hari Achari (Counted: 5000: 3500 float + 1500 in = 5000 expected)...');
    const endRes = await client.query(`
      SELECT public.end_manager_shift(
        $1,
        5000,
        '{"c500": 10}'::jsonb,
        'Drawer reconciled with zero discrepancy',
        NULL,
        'Hari Achari'
      ) as result;
    `, [shiftId]);

    const endData = endRes.rows[0].result;
    console.log('End Shift Result:', JSON.stringify(endData, null, 2));

    // Rollback test changes so database remains pristine
    await client.query('ROLLBACK');
    console.log('--- TEST ROLLED BACK CLEANLY (DATABASE PRISTINE) ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Test error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runTest();
