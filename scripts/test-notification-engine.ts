import { notificationEngine, notifySuperAdmin } from '../src/lib/notifications/engine';
import { SuperAdminNotification } from '../src/lib/notifications/types';
import { signSessionPayload } from '../src/lib/auth';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    if (detail) console.log(`   └─ ${detail}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error(`   └─ ${detail}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 REAL-TIME SUPER ADMIN NOTIFICATION ENGINE: TEST SUITE');
  console.log('Hotel Target: Sri Tayi Grand, Kadiri');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: INTEGRATION TEST (EVENT_TRANSACTION)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: INTEGRATION TEST (EVENT_TRANSACTION) ---');
  let receivedViaListener: SuperAdminNotification | null = null;
  const unsubscribe = notificationEngine.subscribe((notif) => {
    receivedViaListener = notif;
  });

  notifySuperAdmin({
    eventType: 'EVENT_TRANSACTION',
    payload: {
      transactionId: 'pay_live_test_8921',
      amount: 12500,
      currency: 'INR',
      method: 'upi',
      payerName: 'Alexandre Dumas',
      bookingReference: 'STG-20261109-8921',
      status: 'captured',
    },
  });

  // Small delay to let microtask dispatch
  await new Promise((r) => setTimeout(r, 50));

  const financialNotifs = notificationEngine.getNotifications('financials', 5);
  const foundTx = financialNotifs.notifications.find(
    (n) => n.metadata.transactionId === 'pay_live_test_8921'
  );

  assert(
    Boolean(foundTx),
    'EVENT_TRANSACTION persisted in ring buffer',
    `Notification ID: ${foundTx?.id}`
  );
  assert(
    foundTx?.message.includes('₹12,500') &&
      foundTx?.message.includes('Alexandre Dumas') &&
      foundTx?.message.includes('UPI'),
    'Authoritative message schema formatting',
    foundTx?.message
  );
  assert(
    foundTx?.severity === 'SUCCESS',
    'Correct SUCCESS severity tier assigned'
  );
  assert(
    foundTx?.metadata.deepLink === '/admin/payments',
    'Correct deepLink metadata configured for 1-click navigation'
  );
  assert(
    Boolean(receivedViaListener) && receivedViaListener?.id === foundTx?.id,
    'Sub-second real-time broadcast delivered to active subscriber'
  );

  unsubscribe();

  // ---------------------------------------------------------------------------
  // TEST 2: CHECK-IN & CHECK-OUT NOTIFICATIONS
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: CHECK-IN & CHECK-OUT NOTIFICATIONS ---');
  notifySuperAdmin({
    eventType: 'EVENT_CHECK_IN',
    payload: {
      guestName: 'John Doe',
      roomNumber: '402',
      bookingReference: 'STG-20261109-4020',
      staffName: 'Bhavani Shankar',
    },
  });

  notifySuperAdmin({
    eventType: 'EVENT_CHECK_OUT',
    payload: {
      guestName: 'Jane Smith',
      roomNumber: '301',
      bookingReference: 'STG-20261109-3010',
      balanceStatus: 'settled',
      outstandingAmount: 0,
      staffName: 'Bhavani Shankar',
    },
  });

  await new Promise((r) => setTimeout(r, 50));

  const checkInOuts = notificationEngine.getNotifications('check_in_out', 10);
  const checkInAlert = checkInOuts.notifications.find((n) => n.type === 'EVENT_CHECK_IN');
  const checkOutAlert = checkInOuts.notifications.find((n) => n.type === 'EVENT_CHECK_OUT');

  assert(
    checkInAlert?.message === '🟢 [Check-In] John Doe checked into Room 402.',
    'Check-in alert text matches exact prompt schema',
    checkInAlert?.message
  );
  assert(
    checkOutAlert?.message === '🔵 [Check-Out] Jane Smith checked out. All dues settled.',
    'Check-out alert text matches exact prompt schema',
    checkOutAlert?.message
  );

  // ---------------------------------------------------------------------------
  // TEST 3: NEW BOOKING RESERVATION NOTIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: NEW BOOKING RESERVATION NOTIFICATION ---');
  notifySuperAdmin({
    eventType: 'EVENT_NEW_BOOKING',
    payload: {
      bookingReference: 'STG-20261109-7711',
      customerName: 'Srihari Swamy',
      roomCategory: 'Suite Room',
      roomsCount: 1,
      checkInDate: '2026-11-15',
      checkOutDate: '2026-11-18',
      totalAmount: 14997,
      source: 'online',
    },
  });

  await new Promise((r) => setTimeout(r, 50));

  const bookingNotifs = notificationEngine.getNotifications('bookings', 5);
  const foundBooking = bookingNotifs.notifications.find(
    (n) => n.metadata.bookingReference === 'STG-20261109-7711'
  );

  assert(
    Boolean(foundBooking),
    'EVENT_NEW_BOOKING captured in booking feed',
    foundBooking?.message
  );
  assert(
    foundBooking?.metadata.deepLink === '/admin/bookings',
    'Booking alert contains deep-link to /admin/bookings'
  );

  // ---------------------------------------------------------------------------
  // TEST 4: SECURITY TEST (UNAUTHORIZED CHANNEL CONNECTION)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: SECURITY TEST (RBAC CHANNEL ENFORCEMENT) ---');
  // We simulate request verification directly with verifyStaffRole
  const { verifyStaffRole } = await import('../src/lib/auth');

  // 4a. Unauthenticated request (no cookie/token)
  const unauthReq = new Request('http://localhost:3000/api/admin/notifications/stream');
  const authRes1 = verifyStaffRole(unauthReq, ['Super Admin']);
  assert(
    !authRes1.authorized,
    'Unauthenticated connection rejected with unauthorized status',
    `Error: ${authRes1.error}`
  );

  // 4b. Low-privilege role (Housekeeping) trying to join Super Admin alert stream
  const housekeepingToken = signSessionPayload({
    userId: 'stf-hk-01',
    name: 'Ramu Cleaner',
    email: 'ramu@sritayigrand.com',
    role: 'Housekeeping',
    exp: Date.now() + 3600000,
  });
  const hkReq = new Request('http://localhost:3000/api/admin/notifications/stream', {
    headers: { Authorization: `Bearer ${housekeepingToken}` },
  });
  const authRes2 = verifyStaffRole(hkReq, ['Super Admin']);
  assert(
    !authRes2.authorized && authRes2.error?.includes('Super Admin'),
    'Role "Housekeeping" rejected from Super Admin stream (HTTP 403)',
    `Error: ${authRes2.error}`
  );

  // 4c. Valid Super Admin authorization
  const superAdminToken = signSessionPayload({
    userId: 'stf-admin-01',
    name: 'Managing Director',
    email: 'admin@sritayigrand.com',
    role: 'Super Admin',
    exp: Date.now() + 3600000,
  });
  const saReq = new Request('http://localhost:3000/api/admin/notifications/stream', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  const authRes3 = verifyStaffRole(saReq, ['Super Admin']);
  assert(
    authRes3.authorized && authRes3.session?.role === 'Super Admin',
    'Authenticated Super Admin token successfully authorized'
  );

  // ---------------------------------------------------------------------------
  // TEST 5: STRESS TEST (20 RAPID RFID TAPS & 3-SECOND DEDUPLICATION)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: STRESS TEST (20 RAPID RFID TAPS IN 5S & THROTTLING) ---');
  const startCount = notificationEngine.getNotifications('rfid_taps', 100).totalCount;

  // Simulate 20 taps rapidly:
  // 10 identical taps on Room 101 reader with same card (hardware bounce)
  // 10 distinct taps on other rooms
  for (let i = 0; i < 10; i++) {
    notifySuperAdmin({
      eventType: 'EVENT_RFID_TAP',
      payload: {
        deviceId: 'reader-101',
        location: 'Room 101',
        cardUid: 'TEST-RFID-BOUNCE-999',
        holderName: 'Mark Wilson',
        cardType: 'guest',
        result: 'GRANTED',
        timestamp: new Date().toISOString(),
      },
    });
  }

  for (let i = 1; i <= 10; i++) {
    notifySuperAdmin({
      eventType: 'EVENT_RFID_TAP',
      payload: {
        deviceId: `reader-${200 + i}`,
        location: `Room ${200 + i}`,
        cardUid: `TEST-CARD-${1000 + i}`,
        holderName: `Guest ${i}`,
        cardType: 'guest',
        result: i % 2 === 0 ? 'GRANTED' : 'DENIED',
        reason: i % 2 === 0 ? undefined : 'Unregistered card',
        timestamp: new Date().toISOString(),
      },
    });
  }

  await new Promise((r) => setTimeout(r, 100));

  const afterCount = notificationEngine.getNotifications('rfid_taps', 100).notifications;
  const bounceEvents = afterCount.filter(
    (n) => n.metadata.cardUid === 'TEST-RFID-BOUNCE-999'
  );

  assert(
    bounceEvents.length === 1,
    '3-Second RFID deduplication window throttled 10 rapid bounce taps down to 1 event',
    `Received: ${bounceEvents.length} event (expected 1)`
  );

  const distinctTaps = afterCount.filter(
    (n) => n.metadata.cardUid && n.metadata.cardUid.startsWith('TEST-CARD-')
  );
  assert(
    distinctTaps.length === 10,
    'All 10 distinct room taps processed with 0% event loss under high load',
    `Processed: ${distinctTaps.length}/10 distinct taps`
  );

  // ---------------------------------------------------------------------------
  // TEST 6: MARK AS READ & CLEAR ALL OPERATIONS
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: MARK AS READ & CLEAR OPERATIONS ---');
  const unreadBefore = notificationEngine.getNotifications('all').unreadCount;
  assert(unreadBefore > 0, `Unread alerts before markAll: ${unreadBefore}`);

  notificationEngine.markAsRead(undefined, true);
  const unreadAfter = notificationEngine.getNotifications('all').unreadCount;
  assert(unreadAfter === 0, 'markAllRead() reset unread count to 0');

  // ===========================================================================
  // SUMMARY SCORECARD
  // ===========================================================================
  console.log('\n================================================================');
  console.log('📊 NOTIFICATION PIPELINE VERIFICATION SUMMARY');
  console.log('================================================================');
  console.log(`Total Assertions: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
