const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runTest() {
  try {
    console.log('--- TESTING SINGLE ACTIVE MANAGER ON DUTY CONSTRAINT IN SUPABASE ---');

    // 1. Sagar clocks in
    await pool.query(
      "INSERT INTO staff_attendance (id, staff_id, staff_name, role, shift, date, clock_in) VALUES ($1, $2, $3, 'Hotel Manager', 'general', CURRENT_DATE, NOW())",
      ['test-sagar-01', '50aba2e5-0000-4fbd-bb89-000000000002', 'Sagar']
    );
    console.log('✅ 1. Sagar clocked in successfully.');

    // 2. Hari tries to clock in while Sagar is still clocked in
    let blocked = false;
    try {
      await pool.query(
        "INSERT INTO staff_attendance (id, staff_id, staff_name, role, shift, date, clock_in) VALUES ($1, $2, $3, 'Hotel Manager', 'general', CURRENT_DATE, NOW())",
        ['test-hari-01', '50aba2e5-0000-4fbd-bb89-000000000001', 'Hari Achari']
      );
    } catch (err) {
      blocked = true;
      console.log('✅ 2. Hari clock-in BLOCKED by database trigger as expected!');
      console.log('   Error message:', err.message);
    }

    if (!blocked) {
      throw new Error('FAILURE: Database allowed Hari to clock in while Sagar was active!');
    }

    // 3. Sagar clocks out
    await pool.query(
      "UPDATE staff_attendance SET clock_out = NOW(), work_hours = 4.0 WHERE id = $1",
      ['test-sagar-01']
    );
    console.log('✅ 3. Sagar clocked out successfully.');

    // 4. Hari now clocks in after Sagar clocked out
    await pool.query(
      "INSERT INTO staff_attendance (id, staff_id, staff_name, role, shift, date, clock_in) VALUES ($1, $2, $3, 'Hotel Manager', 'general', CURRENT_DATE, NOW())",
      ['test-hari-01', '50aba2e5-0000-4fbd-bb89-000000000001', 'Hari Achari']
    );
    console.log('✅ 4. Hari clocked in successfully after handover!');

    // 5. Clean up
    await pool.query(
      "DELETE FROM staff_attendance WHERE id IN ($1, $2)",
      ['test-sagar-01', 'test-hari-01']
    );
    console.log('✅ 5. Test records cleaned up.');
    console.log('🎉 ALL DATABASE LEVEL CONSTRAINT TESTS PASSED!');
  } finally {
    await pool.end();
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
