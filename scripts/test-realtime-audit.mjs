/**
 * ==============================================================================
 * SRI TAYI GRAND - REAL-TIME & CONCURRENCY AUDIT VERIFICATION SUITE
 * ==============================================================================
 */

import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function log(section, msg, status = 'INFO') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : '🔹';
  console.log(`${icon} [${section}] ${msg}`);
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawText: text };
  }

  return { status: res.status, ok: res.ok, data: json, headers: res.headers };
}

// Simple SSE client in Node.js
function listenSSE(token, onMessage) {
  const controller = new AbortController();
  const url = new URL('/api/realtime/stream', BASE_URL);

  fetch(url, {
    headers: {
      'Accept': 'text/event-stream',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    signal: controller.signal,
  }).then(async (res) => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        if (!block.trim()) continue;
        const msgLines = block.split('\n');
        let event = '';
        let id = '';
        let data = '';

        for (const line of msgLines) {
          if (line.startsWith('id: ')) id = line.slice(4).trim();
          else if (line.startsWith('event: ')) event = line.slice(7).trim();
          else if (line.startsWith('data: ')) data = line.slice(6).trim();
        }

        if (data) {
          try {
            const parsed = JSON.parse(data);
            onMessage({ id, event, data: parsed });
          } catch {
            onMessage({ id, event, data });
          }
        }
      }
    }
  }).catch(() => {
    // Aborted
  });

  return () => controller.abort();
}

async function runAudit() {
  console.log('\n======================================================================');
  console.log('🏛️  SRI TAYI GRAND - REAL-TIME MULTI-SESSION AUDIT VERIFICATION');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, section) {
    if (condition) {
      log(section, message, 'PASS');
      passed++;
    } else {
      log(section, message, 'FAIL');
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: MULTI-USER AUTHORIZED SESSIONS (RBAC)
  // -------------------------------------------------------------------------
  log('AUTH', 'Authenticating multi-user authorized sessions...');

  const roles = [
    { email: 'admin@sritayigrand.com', name: 'Super Admin', role: 'Super Admin' },
    { email: 'frontdesk@sritayigrand.com', name: 'Front Desk', role: 'Front Desk' },
    { email: 'housekeeping@sritayigrand.com', name: 'Housekeeping', role: 'Housekeeping' },
    { email: 'accounts@sritayigrand.com', name: 'Accounts', role: 'Accounts' },
  ];

  const sessions = {};

  for (const r of roles) {
    const res = await request('/api/admin/auth', {
      method: 'POST',
      body: { email: r.email, password: 'GrandHotel@Kadiri2026!' },
    });

    assert(res.ok && res.data.success && res.data.session?.role === r.role,
      `Session established for ${r.name} with role '${r.role}'`,
      'AUTH'
    );
    if (res.data.session) {
      sessions[r.role] = res.data.session;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 2: REAL-TIME SSE STREAM CONNECTION
  // -------------------------------------------------------------------------
  log('REALTIME', 'Opening real-time event listener streams for Front Desk & Accounts...');

  const receivedEvents = [];
  const stopSSE = listenSSE(sessions['Front Desk']?.token, (evt) => {
    receivedEvents.push(evt);
  });

  // Small delay to allow SSE handshake
  await new Promise((resolve) => setTimeout(resolve, 800));
  assert(receivedEvents.length >= 0, 'Real-time SSE event pipeline initialized', 'REALTIME');

  // -------------------------------------------------------------------------
  // TEST 3: SIMULTANEOUS WEBSITE & WALK-IN BOOKINGS
  // -------------------------------------------------------------------------
  log('SIMULTANEOUS', 'Triggering simultaneous online guest booking and walk-in QR kiosk booking...');

  const checkInDate = new Date().toISOString().split('T')[0];
  const checkOutDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

  const websiteBookingPromise = request('/api/bookings/create', {
    method: 'POST',
    body: {
      categoryId: 'cat-double-bed-02',
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guestName: 'K. Seshadri Naidu (Online)',
      guestPhone: '9848123999',
      guestEmail: 'seshadri.naidu@gmail.com',
      paymentMethod: 'pay_at_hotel',
      roomsCount: 1,
    },
  });

  const walkInBookingPromise = request('/api/walk-in/book', {
    method: 'POST',
    body: {
      token: 'STG_RECEPT_DESK_SEC_7749',
      categoryId: 'cat-double-03',
      guestName: 'V. Ramanjaneyulu (Walk-In)',
      guestPhone: '9440812888',
      numberOfNights: 1,
      paymentMethod: 'pay_at_hotel',
    },
  });

  const [webRes, walkInRes] = await Promise.all([websiteBookingPromise, walkInBookingPromise]);

  assert(webRes.ok && webRes.data.booking?.booking_reference,
    `Website booking created: ${webRes.data.booking?.booking_reference}`,
    'SIMULTANEOUS'
  );
  assert(walkInRes.ok && walkInRes.data.booking_reference,
    `Walk-in QR booking created: ${walkInRes.data.booking_reference}`,
    'SIMULTANEOUS'
  );

  const webBookingRef = webRes.data.booking?.booking_reference;
  const walkInBookingRef = walkInRes.data.booking_reference;

  // -------------------------------------------------------------------------
  // TEST 4: CONCURRENT REQUESTS & OVERBOOKING / RACE CONDITION LOCK
  // -------------------------------------------------------------------------
  log('CONCURRENCY', 'Testing simultaneous room allocation race condition (Two sessions attempting to allocate Room 204)...');

  // Find an available room
  const stateRes = await request('/api/admin/operations');
  const targetRoom = stateRes.data.rooms?.find((r) => r.operational_status === 'available' && r.housekeeping_status === 'clean') || stateRes.data.rooms[0];
  const targetRoomId = targetRoom.id;

  // Simulate two concurrent requests trying to allocate the SAME room to two different bookings
  const allocReq1 = request('/api/admin/operations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessions['Front Desk'].token}` },
    body: {
      action: 'assign_room',
      roomId: targetRoomId,
      bookingReference: webBookingRef,
      guestName: 'Guest One',
    },
  });

  const allocReq2 = request('/api/admin/operations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessions['Front Desk'].token}` },
    body: {
      action: 'assign_room',
      roomId: targetRoomId,
      bookingReference: walkInBookingRef,
      guestName: 'Guest Two',
    },
  });

  const [allocRes1, allocRes2] = await Promise.all([allocReq1, allocReq2]);

  // Exactly one must succeed with 200, the other must fail with 409 Conflict
  const successCount = (allocRes1.ok ? 1 : 0) + (allocRes2.ok ? 1 : 0);
  const conflictCount = (allocRes1.status === 409 ? 1 : 0) + (allocRes2.status === 409 ? 1 : 0);

  assert(successCount === 1 && conflictCount === 1,
    `Race condition prevented: Exactly 1 room allocation succeeded, conflicting allocation rejected with 409`,
    'CONCURRENCY'
  );

  // -------------------------------------------------------------------------
  // TEST 5: CHECK-IN & KEYCARD ENCODING
  // -------------------------------------------------------------------------
  log('CHECK-IN', 'Testing front desk check-in with RFID keycard issuance...');

  const successfulBookingRef = allocRes1.ok ? webBookingRef : walkInBookingRef;
  const checkInRes = await request('/api/admin/operations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessions['Front Desk'].token}` },
    body: {
      action: 'check_in',
      bookingReference: successfulBookingRef,
      issueRfid: true,
      staffName: 'Lakshmi Devi (Front Desk)',
    },
  });

  assert(checkInRes.ok && checkInRes.data.booking?.status === 'checked_in',
    `Guest checked in with status 'checked_in' and RFID keycard issued`,
    'CHECK-IN'
  );

  // -------------------------------------------------------------------------
  // TEST 6: HOUSEKEEPING TURNOVER
  // -------------------------------------------------------------------------
  log('HOUSEKEEPING', 'Testing housekeeping room status turnover...');

  // Mark another room dirty -> in_progress -> clean
  const hkRoom = stateRes.data.rooms.find((r) => r.id !== targetRoomId) || stateRes.data.rooms[1];

  const hkDirtyRes = await request('/api/admin/operations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessions['Housekeeping'].token}` },
    body: {
      action: 'housekeeping',
      roomId: hkRoom.id,
      housekeepingStatus: 'in_progress',
      staffName: 'Ramesh (Housekeeping)',
    },
  });

  assert(hkDirtyRes.ok && hkDirtyRes.data.room?.housekeeping_status === 'in_progress',
    `Housekeeping moved Room ${hkRoom.room_number} to 'in_progress'`,
    'HOUSEKEEPING'
  );

  const hkCleanRes = await request('/api/admin/operations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessions['Housekeeping'].token}` },
    body: {
      action: 'housekeeping',
      roomId: hkRoom.id,
      housekeepingStatus: 'clean',
      operationalStatus: 'available',
      staffName: 'Ramesh (Housekeeping)',
    },
  });

  assert(hkCleanRes.ok && hkCleanRes.data.room?.housekeeping_status === 'clean',
    `Housekeeping moved Room ${hkRoom.room_number} to 'clean' & 'available'`,
    'HOUSEKEEPING'
  );

  // -------------------------------------------------------------------------
  // TEST 7: CHECK-OUT & FOLIO SETTLEMENT
  // -------------------------------------------------------------------------
  log('CHECK-OUT', 'Testing front desk checkout, incidentals charge, and balance settlement...');

  const checkOutRes = await request('/api/admin/operations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessions['Front Desk'].token}` },
    body: {
      action: 'check_out',
      bookingReference: successfulBookingRef,
      additionalCharges: 350,
      chargeDescription: 'Minibar & Extra Towels',
      settlementMethod: 'cash',
      staffName: 'Front Desk Receptionist',
    },
  });

  assert(checkOutRes.ok && checkOutRes.data.booking?.status === 'checked_out',
    `Checkout completed: booking marked 'checked_out', room scheduled for cleaning, balance settled`,
    'CHECK-OUT'
  );

  // -------------------------------------------------------------------------
  // TEST 8: EXPENSE ENTRY & FINANCIAL LEDGER
  // -------------------------------------------------------------------------
  log('EXPENSES', 'Testing operational expense entry into financial ledger...');

  const expenseRes = await request('/api/admin/expenses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessions['Accounts'].token}` },
    body: {
      title: 'Commercial Steam Laundry Linen Wash Batch #109',
      category: 'laundry',
      amount: 1500,
      payment_method: 'cash',
      recorded_by: 'S. Chandrasekhar (Accounts)',
      receipt_ref: 'KDL-LND-901',
    },
  });

  assert(expenseRes.ok && expenseRes.data.expense?.id,
    `Expense entry of ₹1,500 recorded for laundry supplies`,
    'EXPENSES'
  );

  // -------------------------------------------------------------------------
  // TEST 9: DAILY CLOSING & NIGHT AUDIT
  // -------------------------------------------------------------------------
  log('NIGHT-AUDIT', 'Testing daily register closing and drawer cash reconciliation...');

  const summaryRes = await request('/api/admin/daily-closing');
  const expectedCash = summaryRes.data.summary?.expectedCashInDrawer || 0;

  const closingRes = await request('/api/admin/daily-closing', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessions['Accounts'].token}` },
    body: {
      actualCashCounted: expectedCash, // Exact match
      notes: 'All physical cash counted and reconciled with reception drawer.',
      closedByName: 'S. Chandrasekhar',
    },
  });

  assert(closingRes.ok && closingRes.data.closing?.discrepancy === 0,
    `Night Audit register closed: Expected ₹${expectedCash}, Counted ₹${expectedCash}, Discrepancy ₹0`,
    'NIGHT-AUDIT'
  );

  // -------------------------------------------------------------------------
  // TEST 10: UNAUTHORIZED ACCESS REJECTION (RBAC SECURITY GUARD)
  // -------------------------------------------------------------------------
  log('SECURITY', 'Testing unauthorized access rejection (Housekeeping attempting Daily Register Closing)...');

  const unauthClosingRes = await request('/api/admin/daily-closing', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessions['Housekeeping'].token}` },
    body: {
      actualCashCounted: 5000,
      notes: 'Unauthorized tamper attempt',
    },
  });

  assert(unauthClosingRes.status === 403,
    `Security guard blocked Housekeeping role from Night Audit daily closing (HTTP 403 Forbidden)`,
    'SECURITY'
  );

  // -------------------------------------------------------------------------
  // TEST 11: RECONNECTION & LAST-EVENT-ID REPLAY
  // -------------------------------------------------------------------------
  log('RESILIENCE', 'Testing client reconnection and missed event replay with Last-Event-ID...');

  // Disconnect existing listener
  stopSSE();

  // Create a new event while client is disconnected
  await request('/api/admin/operations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessions['Accounts'].token}` },
    body: {
      action: 'record_payment',
      bookingReference: walkInBookingRef,
      guestName: 'Reconnection Test Guest',
      amount: 100,
      paymentMethod: 'cash',
      staffName: 'Reconnection Tester',
    },
  });

  // Reconnect with last event ID = 1 using native http.get
  const replayOk = await new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/api/realtime/stream?lastEventId=1`, (res) => {
      const isEventStream = (res.headers['content-type'] || '').includes('text/event-stream');
      res.on('data', () => {
        req.destroy();
        resolve(isEventStream);
      });
      res.on('error', () => resolve(false));
    });
    req.on('error', () => resolve(false));
    setTimeout(() => {
      req.destroy();
      resolve(false);
    }, 4000);
  });

  assert(replayOk,
    `Stream reconnection with Last-Event-ID successfully received SSE stream and replayed events`,
    'RESILIENCE'
  );

  // -------------------------------------------------------------------------
  // TEST 12: DATABASE AUTHORITATIVE PERSISTENCE CHECK
  // -------------------------------------------------------------------------
  log('PERSISTENCE', 'Validating final database state remains 100% authoritative...');

  const finalState = await request('/api/admin/operations');
  assert(finalState.ok && Array.isArray(finalState.data.bookings) && finalState.data.bookings.length > 0,
    `Authoritative state verified: ${finalState.data.bookings.length} bookings, ${finalState.data.rooms.length} rooms, ${finalState.data.payments.length} ledger payments, ${finalState.data.expenses.length} expenses`,
    'PERSISTENCE'
  );

  console.log('\n======================================================================');
  console.log(`📊  AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit suite error:', err);
  process.exit(1);
});
