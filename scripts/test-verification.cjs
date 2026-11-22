const { repo } = require('../src/lib/db/repository');

async function verify() {
  console.log('--- REPOSITORY & FINANCIAL RECONCILIATION VERIFICATION ---');
  await repo.ensureAllLoaded();

  const booking = repo.getBookingByReference('STG-20261122-4216');
  if (!booking) {
    console.error('ERROR: STG-20261122-4216 not found!');
    process.exit(1);
  }

  console.log('Booking Reference:', booking.booking_reference);
  console.log('Guest Name:', booking.guest_name);
  console.log('Category:', booking.category_name);
  console.log('Assigned Room Number:', booking.assigned_room_number);
  console.log('Assigned Room Numbers Array:', booking.assigned_room_numbers);
  console.log('Rooms Count:', booking.rooms_count);
  console.log('Booking Rooms Allocations:', booking.booking_rooms);
  console.log('Master Booking Status:', booking.status);
  console.log('Payment Status:', booking.payment_status);
  console.log('Subtotal (Room charges):', booking.subtotal_amount);
  console.log('Tax (5% GST):', booking.tax_amount);
  console.log('Total Amount:', booking.total_amount);
  console.log('Paid Amount:', booking.paid_amount);
  console.log('Calculated Authoritative Paid Amount:', repo.calculateBookingPaidAmount(booking.booking_reference));
  console.log('Balance Due:', Math.max(0, booking.total_amount - booking.paid_amount));

  const payments = repo.getPayments().filter(p => p.booking_reference === 'STG-20261122-4216');
  console.log('Associated Payments Count:', payments.length);
  console.log('Payments List:', payments.map(p => ({
    id: p.id,
    ref: p.payment_reference,
    gateway_id: p.gateway_payment_id,
    amount: p.amount,
    method: p.payment_method,
    status: p.status
  })));

  // Assertions
  const asserts = [
    { desc: 'Room count is 1', pass: (booking.booking_rooms?.length || 1) === 1 && booking.rooms_count === 1 },
    { desc: 'Room number is 106', pass: booking.assigned_room_number === '106' && booking.booking_rooms?.[0]?.room_number === '106' },
    { desc: 'Total Amount is 5880', pass: Number(booking.total_amount) === 5880 },
    { desc: 'Paid Amount is 5880 (NOT 11760)', pass: Number(booking.paid_amount) === 5880 },
    { desc: 'Balance Due is 0', pass: (booking.total_amount - booking.paid_amount) === 0 },
    { desc: 'Payment Status is successful', pass: booking.payment_status === 'successful' },
    { desc: 'Booking Status is checked_in', pass: booking.status === 'checked_in' },
    { desc: 'Allocation status is checked_in', pass: booking.booking_rooms?.[0]?.status === 'checked_in' },
    { desc: 'Payments count is exactly 1', pass: payments.length === 1 && Number(payments[0].amount) === 5880 },
  ];

  console.log('\n--- AUDIT ASSERTIONS ---');
  let allPassed = true;
  for (const a of asserts) {
    console.log(`${a.pass ? '✅ PASS' : '❌ FAIL'}: ${a.desc}`);
    if (!a.pass) allPassed = false;
  }

  if (allPassed) {
    console.log('\n🎉 ALL PRODUCTION RECONCILIATION ASSERTIONS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error('\n⚠️ SOME ASSERTIONS FAILED');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
