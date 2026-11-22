const http = require('http');

function makeRequest({ method = 'GET', path, body = null, headers = {} }) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (dataString) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch {
          json = rawData;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', (err) => reject(err));
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function run() {
  console.log('=== TESTING NEXT.JS ATTENDANCE & STAFF API ENDPOINTS ===\n');

  // Step 1: Login as Sagar
  console.log('[1] Logging in as Sagar (sagar@sritayigrand.com)...');
  const loginRes = await makeRequest({
    method: 'POST',
    path: '/api/admin/auth',
    body: { email: 'sagar@sritayigrand.com', password: 'GrandHotel@Kadiri2026!' },
  });

  if (!loginRes.data.success || !loginRes.data.session) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
  }
  const token = loginRes.data.session.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('    ✓ Login successful. Obtained signed token.\n');

  // Step 2: Fetch Staff Directory
  console.log('[2] Fetching Staff Directory via GET /api/admin/staff...');
  const staffRes = await makeRequest({
    method: 'GET',
    path: '/api/admin/staff',
    headers: authHeaders,
  });

  const staffList = staffRes.data.staff || [];
  console.log(`    Staff Count returned by API: ${staffList.length}`);
  staffList.forEach((s) => console.log(`    - ${s.full_name} (${s.email}) - ${s.role}`));

  if (staffList.length !== 3) {
    throw new Error(`Expected strictly 3 staff members from /api/admin/staff, got ${staffList.length}`);
  }
  console.log('    ✓ Staff API returns strictly the official trio.\n');

  const hari = staffList.find((s) => s.email.includes('hari'));
  const sagar = staffList.find((s) => s.email.includes('sagar'));
  const admin = staffList.find((s) => s.email.includes('admin'));

  // Step 3: Check initial attendance status
  console.log('[3] Checking initial attendance via GET /api/admin/staff/attendance...');
  const attInitial = await makeRequest({
    method: 'GET',
    path: '/api/admin/staff/attendance',
    headers: authHeaders,
  });
  console.log(`    Active on duty count: ${attInitial.data.stats?.onDutyCount || 0}\n`);

  // Step 4: Super Admin attempts clock-in (Should be blocked)
  console.log('[4] Testing Super Admin clock-in rejection...');
  const adminClockIn = await makeRequest({
    method: 'POST',
    path: '/api/admin/staff/attendance',
    headers: authHeaders,
    body: { action: 'clock_in', staffId: admin.id, shift: 'morning' },
  });
  console.log(`    Response status: ${adminClockIn.status}, message: ${adminClockIn.data.error}`);
  if (adminClockIn.status !== 400 && adminClockIn.status !== 409) {
    throw new Error(`Expected 400 or 409 for Super Admin clock-in, got ${adminClockIn.status}`);
  }
  console.log('    ✓ Super Admin clock-in successfully rejected.\n');

  // Step 5: Sagar clocks in
  console.log('[5] Sagar clocking in via POST /api/admin/staff/attendance...');
  const sagarClockIn = await makeRequest({
    method: 'POST',
    path: '/api/admin/staff/attendance',
    headers: authHeaders,
    body: { action: 'clock_in', staffId: sagar.id, shift: 'morning', notes: 'Sagar morning shift' },
  });
  console.log(`    Response status: ${sagarClockIn.status}`);
  if (!sagarClockIn.data.success) {
    throw new Error(`Sagar clock in failed: ${JSON.stringify(sagarClockIn.data)}`);
  }
  const sagarAttendanceId = sagarClockIn.data.attendance.id;
  console.log(`    ✓ Sagar clocked in successfully! Shift ID: ${sagarAttendanceId}\n`);

  // Step 6: Hari attempts to clock in while Sagar is active (Should be rejected with 409 Conflict)
  console.log('[6] Testing Hari Achari clock-in while Sagar is on duty (MOD Exclusion)...');
  const hariConflict = await makeRequest({
    method: 'POST',
    path: '/api/admin/staff/attendance',
    headers: authHeaders,
    body: { action: 'clock_in', staffId: hari.id, shift: 'morning', notes: 'Hari attempt' },
  });
  console.log(`    Response status: ${hariConflict.status}`);
  console.log(`    Error details: ${hariConflict.data.error}`);
  if (hariConflict.status !== 409 && hariConflict.status !== 400) {
    throw new Error(`Expected 409 Conflict, got ${hariConflict.status}`);
  }
  if (!hariConflict.data.error.includes('Manager Duty Collision') && !hariConflict.data.error.includes('Duty Manager')) {
    throw new Error(`Unexpected error message: ${hariConflict.data.error}`);
  }
  console.log('    ✓ Hari Achari clock-in blocked with Manager Duty Collision error as required by hotel protocol.\n');

  // Step 7: Sagar clocks out (Handover)
  console.log('[7] Sagar clocking out via POST /api/admin/staff/attendance...');
  const sagarClockOut = await makeRequest({
    method: 'POST',
    path: '/api/admin/staff/attendance',
    headers: authHeaders,
    body: { action: 'clock_out', attendanceId: sagarAttendanceId },
  });
  console.log(`    Response status: ${sagarClockOut.status}`);
  if (!sagarClockOut.data.success) {
    throw new Error(`Sagar clock out failed: ${JSON.stringify(sagarClockOut.data)}`);
  }
  console.log(`    ✓ Sagar clocked out. Work hours: ${sagarClockOut.data.attendance.work_hours || 0} hrs.\n`);

  // Step 8: Hari now clocks in after handover (Should succeed)
  console.log('[8] Hari Achari clocking in after Sagar handed over shift...');
  const hariClockIn = await makeRequest({
    method: 'POST',
    path: '/api/admin/staff/attendance',
    headers: authHeaders,
    body: { action: 'clock_in', staffId: hari.id, shift: 'evening', notes: 'Hari evening shift' },
  });
  console.log(`    Response status: ${hariClockIn.status}`);
  if (!hariClockIn.data.success) {
    throw new Error(`Hari clock in failed: ${JSON.stringify(hariClockIn.data)}`);
  }
  const hariAttendanceId = hariClockIn.data.attendance.id;
  console.log(`    ✓ Hari Achari clocked in successfully! Shift ID: ${hariAttendanceId}\n`);

  // Step 9: Sagar attempts to clock in while Hari is active (Should be rejected with 409 Conflict)
  console.log('[9] Testing Sagar clock-in while Hari is on duty (MOD Exclusion)...');
  const sagarConflict = await makeRequest({
    method: 'POST',
    path: '/api/admin/staff/attendance',
    headers: authHeaders,
    body: { action: 'clock_in', staffId: sagar.id, shift: 'evening', notes: 'Sagar attempt' },
  });
  console.log(`    Response status: ${sagarConflict.status}`);
  console.log(`    Error details: ${sagarConflict.data.error}`);
  if (sagarConflict.status !== 409 && sagarConflict.status !== 400) {
    throw new Error(`Expected 409 Conflict, got ${sagarConflict.status}`);
  }
  console.log('    ✓ Sagar clock-in blocked with Manager Duty Collision error.\n');

  // Step 10: Hari clocks out
  console.log('[10] Hari Achari clocking out...');
  const hariClockOut = await makeRequest({
    method: 'POST',
    path: '/api/admin/staff/attendance',
    headers: authHeaders,
    body: { action: 'clock_out', attendanceId: hariAttendanceId },
  });
  console.log(`    Response status: ${hariClockOut.status}`);
  if (!hariClockOut.data.success) {
    throw new Error(`Hari clock out failed: ${JSON.stringify(hariClockOut.data)}`);
  }
  console.log(`    ✓ Hari Achari clocked out. Work hours: ${hariClockOut.data.attendance.work_hours || 0} hrs.\n`);

  console.log('========================================================================');
  console.log('🏆 ALL HTTP API & DATABASE MANAGER ON DUTY HANDOVER TESTS PASSED 100%!');
  console.log('========================================================================\n');
}

run().catch((err) => {
  console.error('❌ API Test failed:', err);
  process.exit(1);
});
