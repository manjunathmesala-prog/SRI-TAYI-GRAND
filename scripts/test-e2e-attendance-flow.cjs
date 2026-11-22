const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function runTest() {
  console.log('=== SRI TAYI GRAND: STRICT STAFF & MANAGER DUTY HANDOVER E2E TEST ===\n');

  // 1. Verify data/staff.json
  const staffJsonPath = path.join(__dirname, '..', 'data', 'staff.json');
  const staffData = JSON.parse(fs.readFileSync(staffJsonPath, 'utf8'));
  console.log(`[1] Verifying data/staff.json: Found ${staffData.length} staff records:`);
  staffData.forEach((s) => console.log(`    - ${s.full_name} (${s.email}) - ${s.role}`));

  if (staffData.length !== 3) {
    throw new Error(`Expected exactly 3 staff records in data/staff.json, found ${staffData.length}`);
  }

  const allowedEmails = ['admin@sritayigrand.com', 'hari@sritayigrand.com', 'sagar@sritayigrand.com'];
  for (const s of staffData) {
    if (!allowedEmails.includes(s.email.toLowerCase())) {
      throw new Error(`Unexpected staff member in data/staff.json: ${s.email}`);
    }
  }
  console.log('    ✓ data/staff.json is strictly filtered to Super Admin, Hari Achari, and Sagar.\n');

  // 2. Verify Database Profiles
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('[2] Connected to Supabase PostgreSQL database.');

  try {
    const profRes = await client.query(`
      SELECT p.id, p.full_name, u.email, r.name as role, p.is_active
      FROM profiles p
      LEFT JOIN roles r ON p.role_id = r.id
      LEFT JOIN auth.users u ON p.id = u.id
      WHERE p.is_active = true
      ORDER BY p.full_name ASC;
    `);

    console.log(`    Found ${profRes.rows.length} active database profiles:`);
    profRes.rows.forEach((r) => console.log(`    - ${r.full_name} (${r.email || 'N/A'}) - Role: ${r.role}`));

    if (profRes.rows.length !== 3) {
      throw new Error(`Expected 3 active profiles, found ${profRes.rows.length}`);
    }
    console.log('    ✓ Database profiles strictly limited to the official trio.\n');

    // 3. Clean up test records from staff_attendance
    await client.query(`DELETE FROM staff_attendance WHERE notes LIKE '%TEST%' OR staff_name LIKE '%Test%'`);

    // Ensure no active open shifts before test
    await client.query(`UPDATE staff_attendance SET clock_out = NOW() WHERE clock_out IS NULL`);
    console.log('[3] Cleaned up test shifts and closed any historical open shifts.\n');

    // 4. Test Clock-In Flow & Single Active Shift Trigger
    console.log('[4] Testing Manager on Duty Exclusion Protocol in Database:');

    const hariId = '50aba2e5-0000-4fbd-bb89-000000000001';
    const sagarId = '50aba2e5-0000-4fbd-bb89-000000000002';
    const adminId = 'e6e40243-6f98-44dc-94ad-3c56303cf61a';

    // Step A: Super Admin attempts clock-in (Should be blocked by database trigger)
    let adminBlocked = false;
    try {
      await client.query(`
        INSERT INTO staff_attendance (
          id, staff_id, staff_name, role, date, shift, clock_in, clock_out, status, notes
        ) VALUES (
          'test-admin-shift', '${adminId}', 'Sri Tayi Grand Admin', 'Super Admin', CURRENT_DATE, 'general', NOW(), NULL, 'present', 'E2E TEST'
        )
      `);
    } catch (err) {
      adminBlocked = true;
      console.log(`    ✓ Step A: Super Admin clock-in rejected by DB trigger as expected (${err.message})`);
    }
    if (!adminBlocked) throw new Error('Super Admin clock-in should have been rejected!');

    // Step B: Sagar clocks in (Should succeed)
    const sagarShiftId = `test-sagar-shift-${Date.now()}`;
    await client.query(`
      INSERT INTO staff_attendance (
        id, staff_id, staff_name, role, date, shift, clock_in, clock_out, status, notes
      ) VALUES (
        '${sagarShiftId}', '${sagarId}', 'Sagar', 'Hotel Manager', CURRENT_DATE, 'morning', NOW(), NULL, 'present', 'E2E TEST SAGAR ON DUTY'
      )
    `);
    console.log('    ✓ Step B: Sagar successfully clocked in as Manager on Duty.');

    // Step C: Hari attempts clock-in while Sagar is on duty (Should be blocked by trigger / unique index)
    let hariBlocked = false;
    const hariAttemptId = `test-hari-attempt-${Date.now()}`;
    try {
      await client.query(`
        INSERT INTO staff_attendance (
          id, staff_id, staff_name, role, date, shift, clock_in, clock_out, status, notes
        ) VALUES (
          '${hariAttemptId}', '${hariId}', 'Hari Achari', 'Hotel Manager', CURRENT_DATE, 'evening', NOW(), NULL, 'present', 'E2E TEST HARI ATTEMPT'
        )
      `);
    } catch (err) {
      hariBlocked = true;
      console.log(`    ✓ Step C: Hari Achari clock-in blocked while Sagar is on duty (${err.message})`);
    }
    if (!hariBlocked) throw new Error('Hari should have been blocked while Sagar is on duty!');

    // Step D: Sagar clocks out (Shift handover)
    await client.query(`
      UPDATE staff_attendance 
      SET clock_out = NOW(), work_hours = 8.0, status = 'completed'
      WHERE id = '${sagarShiftId}'
    `);
    console.log('    ✓ Step D: Sagar clocked out successfully. Manager on Duty position is now vacant.');

    // Step E: Hari clocks in now that Sagar clocked out (Should succeed)
    const hariShiftId = `test-hari-shift-${Date.now()}`;
    await client.query(`
      INSERT INTO staff_attendance (
        id, staff_id, staff_name, role, date, shift, clock_in, clock_out, status, notes
      ) VALUES (
        '${hariShiftId}', '${hariId}', 'Hari Achari', 'Hotel Manager', CURRENT_DATE, 'evening', NOW(), NULL, 'present', 'E2E TEST HARI ON DUTY'
      )
    `);
    console.log('    ✓ Step E: Hari Achari successfully clocked in as Manager on Duty.');

    // Step F: Sagar attempts clock-in while Hari is on duty (Should be blocked)
    let sagarBlocked = false;
    const sagarAttemptId = `test-sagar-attempt-${Date.now()}`;
    try {
      await client.query(`
        INSERT INTO staff_attendance (
          id, staff_id, staff_name, role, date, shift, clock_in, clock_out, status, notes
        ) VALUES (
          '${sagarAttemptId}', '${sagarId}', 'Sagar', 'Hotel Manager', CURRENT_DATE, 'night', NOW(), NULL, 'present', 'E2E TEST SAGAR ATTEMPT'
        )
      `);
    } catch (err) {
      sagarBlocked = true;
      console.log(`    ✓ Step F: Sagar clock-in blocked while Hari is on duty (${err.message})`);
    }
    if (!sagarBlocked) throw new Error('Sagar should have been blocked while Hari is on duty!');

    // Step G: Hari clocks out
    await client.query(`
      UPDATE staff_attendance 
      SET clock_out = NOW(), work_hours = 7.5, status = 'completed'
      WHERE id = '${hariShiftId}'
    `);
    console.log('    ✓ Step G: Hari Achari clocked out successfully.');

    // Clean up test rows
    await client.query(`DELETE FROM staff_attendance WHERE notes LIKE '%E2E TEST%'`);
    console.log('\n[5] Cleaned up temporary test records.');

    console.log('\n======================================================');
    console.log('🏆 ALL E2E SHIFT EXCLUSION & STAFF TRIO TESTS PASSED!');
    console.log('======================================================\n');
  } finally {
    await client.end();
  }
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
