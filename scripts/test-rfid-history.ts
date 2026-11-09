import { repo } from '../src/lib/db/repository';
import {
  recordRfidTapAsync,
  getRfidTapsForRoomAndStay,
  getGlobalRfidHistory,
} from '../src/lib/rfid/tap-logger';

async function runRfidHistoryVerification() {
  console.log('================================================================');
  console.log('SRI TAYI GRAND - RFID TAP HISTORY & AUDIT TRAIL VERIFICATION');
  console.log('Zero Regression • Stay Resolution • Universal Card Auditing');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
    }
  }

  // 1. Setup Active Guest Booking for Room 24
  const testBookingRef = `TG-AUDIT-${Date.now().toString().slice(-5)}`;
  const now = new Date();
  const checkInDate = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
  const checkOutDate = new Date(now.getTime() + 22 * 60 * 60 * 1000).toISOString(); // Tomorrow

  const activeBooking = repo.createBooking({
    guest_name: 'Dr. Vikram Chandra',
    guest_phone: '+91 98480 12345',
    guest_email: 'vikram.chandra@hospitality.org',
    check_in_date: checkInDate.split('T')[0],
    check_out_date: checkOutDate.split('T')[0],
    category_id: 'cat-deluxe',
    adults_count: 2,
    children_count: 0,
    rooms_count: 1,
    booking_source: 'walk_in',
    tariff_source_date: new Date().toISOString(),
    payment_method: 'cash',
    total_amount: 3500,
    paid_amount: 3500,
  });

  // Assign Room 24 and mark checked in
  activeBooking.assigned_room_number = '24';
  activeBooking.room_number = '24';
  activeBooking.status = 'checked_in';
  activeBooking.checked_in_at = checkInDate;
  activeBooking.booking_reference = testBookingRef;

  console.log(`[1] Created Active Booking ${testBookingRef} for Guest Dr. Vikram Chandra in Room 24.`);

  // 2. Issue physical keycards using exact repository methods
  const guestCard = repo.issueRFIDCard('24', testBookingRef, 'Dr. Vikram Chandra', 'Front Desk');
  const guestCardUid = guestCard.card_uid;
  console.log(`[2] Issued Physical Keycard ${guestCardUid} assigned to Room 24.`);

  const masterCard = repo.issueSuperAdminCard('Super Admin Master Key', 'M. S. Reddy (GM)', 'System Root');
  const masterCardUid = masterCard.card_uid;

  const staffCard = repo.issueCleanerCard('Floor 1 Housekeeping Staff', 'Sunita Devi (HK)', 'Admin');
  const staffCardUid = staffCard.card_uid;

  // 4. Test Tap 1: Guest Card Taps Room 24 -> GRANTED
  console.log('\n--- Simulating Physical Taps at Room 24 ---');
  const tap1Result = repo.processDoorTap(guestCardUid, '24');
  const log1 = await recordRfidTapAsync({
    cardUid: guestCardUid,
    roomNumber: '24',
    result: tap1Result,
    cardType: tap1Result.cardType,
    customTimestamp: new Date(now.getTime() - 90 * 60 * 1000).toISOString(), // 90 min ago
  });

  assert(log1 !== null, 'Tap 1 Log Generated');
  assert(log1?.accessResult === 'GRANTED', 'Tap 1 Result is GRANTED', `Got ${log1?.accessResult}`);
  assert(log1?.cardType === 'GUEST', 'Tap 1 Card Type is GUEST', `Got ${log1?.cardType}`);
  assert(log1?.bookingId === activeBooking.id || log1?.bookingId === testBookingRef, 'Tap 1 Linked to Active Booking', `Got ${log1?.bookingId}`);
  assert(log1?.customerName === 'Dr. Vikram Chandra', 'Tap 1 Captured Customer Name', `Got ${log1?.customerName}`);
  assert(log1?.doorStatus === 'UNLOCKED', 'Tap 1 Door Status is UNLOCKED');

  // 5. Test Tap 2: Guest Taps Wrong Room (Room 25) -> WRONG_ROOM
  const tap2Result = repo.processDoorTap(guestCardUid, '25');
  const log2 = await recordRfidTapAsync({
    cardUid: guestCardUid,
    roomNumber: '25',
    result: tap2Result,
    cardType: tap2Result.cardType,
    customTimestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
  });

  assert(log2 !== null, 'Tap 2 (Wrong Room) Log Generated');
  assert(log2?.accessResult === 'WRONG_ROOM', 'Tap 2 Result is WRONG_ROOM', `Got ${log2?.accessResult}`);
  assert(log2?.doorStatus === 'LOCKED', 'Tap 2 Door Status is LOCKED');

  // 6. Test Tap 3: Housekeeping Staff Taps Room 24 -> STAFF
  const tap3Result = repo.processDoorTap(staffCardUid, '24');
  const log3 = await recordRfidTapAsync({
    cardUid: staffCardUid,
    roomNumber: '24',
    result: tap3Result,
    cardType: tap3Result.cardType,
    customTimestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
  });

  assert(log3 !== null, 'Tap 3 (Housekeeping) Log Generated');
  assert(log3?.cardType === 'STAFF', 'Tap 3 Card Type is STAFF', `Got ${log3?.cardType}`);

  // 7. Test Tap 4: Super Admin Master Card Taps Room 24 -> MASTER OVERRIDE
  const tap4Result = repo.processDoorTap(masterCardUid, '24');
  const log4 = await recordRfidTapAsync({
    cardUid: masterCardUid,
    roomNumber: '24',
    result: tap4Result,
    cardType: tap4Result.cardType,
    customTimestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
  });

  assert(log4 !== null, 'Tap 4 (Master) Log Generated');
  assert(log4?.cardType === 'MASTER', 'Tap 4 Card Type is MASTER', `Got ${log4?.cardType}`);
  assert(log4?.accessResult === 'GRANTED', 'Tap 4 Result is GRANTED');
  assert(log4?.customerName === 'M. S. Reddy (GM)', 'Tap 4 Captured Master Holder Name', `Got ${log4?.customerName}`);

  // 8. Test Tap 5: Unregistered Card UID -> DENIED
  const fakeCardUid = 'UNKNOWN-CARD-999';
  const tap5Result = repo.processDoorTap(fakeCardUid, '24');
  const log5 = await recordRfidTapAsync({
    cardUid: fakeCardUid,
    roomNumber: '24',
    result: tap5Result,
    cardType: tap5Result.cardType,
    customTimestamp: new Date().toISOString(),
  });

  assert(log5 !== null, 'Tap 5 (Unregistered) Log Generated');
  assert(log5?.accessResult === 'DENIED', 'Tap 5 Result is DENIED', `Got ${log5?.accessResult}`);

  // 9. Verify Stay-Based History Aggregation API Logic
  console.log('\n--- Verifying Stay-Based Aggregation for Room 24 & Booking ---');
  const stayAggregation = getRfidTapsForRoomAndStay('24', {
    bookingId: activeBooking.id,
  });

  assert(stayAggregation.roomNumber === '24', 'Aggregation matches Room 24');
  assert(stayAggregation.taps.length >= 4, `Aggregated taps during stay count >= 4 (Found ${stayAggregation.taps.length})`);
  assert(stayAggregation.metrics.totalTaps >= 4, 'Metrics Total Taps accurate');
  assert(stayAggregation.metrics.firstEntryTime !== null, 'First Entry Time resolved');
  assert(stayAggregation.metrics.lastTappedTime !== null, 'Last Tapped Time resolved');
  assert(stayAggregation.metrics.guestTaps >= 1, 'Metrics contains Guest taps');
  assert(stayAggregation.metrics.masterTaps >= 1, 'Metrics contains Master override taps');
  assert(stayAggregation.metrics.staffTaps >= 1, 'Metrics contains Housekeeping taps');

  console.log(`[Summary Metrics for Stay ${testBookingRef}]:`, {
    totalTaps: stayAggregation.metrics.totalTaps,
    firstEntryTime: stayAggregation.metrics.firstEntryTime,
    lastTappedTime: stayAggregation.metrics.lastTappedTime,
    breakdown: {
      guestTaps: stayAggregation.metrics.guestTaps,
      staffTaps: stayAggregation.metrics.staffTaps,
      masterTaps: stayAggregation.metrics.masterTaps,
      grantedTaps: stayAggregation.metrics.grantedTaps,
      deniedTaps: stayAggregation.metrics.deniedTaps,
    },
  });

  // 10. Verify Global Query with Filters
  console.log('\n--- Verifying Global Query Filters ---');
  const filteredByMaster = getGlobalRfidHistory({
    cardType: 'MASTER',
  });
  assert(filteredByMaster.taps.every((t) => t.cardType === 'MASTER'), 'Filtered by MASTER returns only master taps');

  const filteredByGranted = getGlobalRfidHistory({
    accessResult: 'GRANTED',
  });
  assert(filteredByGranted.taps.every((t) => t.accessResult === 'GRANTED'), 'Filtered by GRANTED returns only granted taps');

  const searchResult = getGlobalRfidHistory({
    search: 'Vikram',
  });
  assert(searchResult.taps.some((t) => t.customerName?.includes('Vikram')), 'Search by Guest Name found matching taps');

  console.log('\n================================================================');
  console.log(`FINAL RESULT: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runRfidHistoryVerification().catch((err) => {
  console.error('Fatal Test Exception:', err);
  process.exit(1);
});
