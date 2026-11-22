const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function testAuthoritativeAudit() {
  console.log('================================================================');
  console.log('SRI TAYI GRAND — PRODUCTION DATA & FINANCIAL RECONCILIATION AUDIT');
  console.log('================================================================\n');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // 1. Audit Supabase Booking Record
    const bRes = await client.query(`
      SELECT 
        b.id,
        b.booking_reference,
        g.full_name as guest_name,
        b.rooms_count,
        b.subtotal_amount,
        b.tax_amount,
        b.total_amount,
        b.paid_amount,
        b.status as master_status,
        b.payment_status,
        b.assigned_room_number,
        b.assigned_room_numbers,
        b.category_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      WHERE b.booking_reference = 'STG-20261122-4216'
    `);
    const booking = bRes.rows[0];

    // 2. Audit Supabase Booking Rooms Allocations
    const brRes = await client.query(`
      SELECT 
        br.id,
        br.room_number,
        br.price_per_night,
        br.status as allocation_status,
        br.assigned_guest_name,
        r.room_number as physical_room_number,
        rc.name as category_name
      FROM booking_rooms br
      LEFT JOIN rooms r ON br.assigned_room_id = r.id
      LEFT JOIN room_categories rc ON br.category_id = rc.id
      WHERE br.booking_id = $1
    `, [booking.id]);
    const allocations = brRes.rows;

    // 3. Audit Supabase Payments Ledger
    const pRes = await client.query(`
      SELECT 
        p.id,
        p.payment_reference,
        p.booking_id,
        p.booking_reference,
        p.amount,
        p.payment_method,
        p.gateway_order_id,
        p.gateway_payment_id,
        p.status,
        p.paid_at
      FROM payments p
      WHERE p.booking_reference = 'STG-20261122-4216' OR p.booking_id = $1
    `, [booking.id]);
    const payments = pRes.rows;

    console.log('--- 1. MASTER BOOKING RECORD (Supabase) ---');
    console.log(`Booking Reference    : ${booking.booking_reference}`);
    console.log(`Guest Name           : ${booking.guest_name}`);
    console.log(`Rooms Count          : ${booking.rooms_count}`);
    console.log(`Assigned Room Number : ${booking.assigned_room_number}`);
    console.log(`Room Category        : ${booking.category_name}`);
    console.log(`Master Status        : ${booking.master_status}`);
    console.log(`Payment Status       : ${booking.payment_status}`);
    console.log(`Room Charges         : ₹${Number(booking.subtotal_amount).toLocaleString('en-IN')}`);
    console.log(`Taxes (5% GST)       : ₹${Number(booking.tax_amount).toLocaleString('en-IN')}`);
    console.log(`Total Folio Amount   : ₹${Number(booking.total_amount).toLocaleString('en-IN')}`);
    console.log(`Recorded Paid Amount : ₹${Number(booking.paid_amount).toLocaleString('en-IN')}`);
    const balanceDue = Math.max(0, Number(booking.total_amount) - Number(booking.paid_amount));
    console.log(`Calculated Balance   : ₹${balanceDue.toLocaleString('en-IN')}`);

    console.log('\n--- 2. ROOM ALLOCATIONS (Supabase `booking_rooms`) ---');
    console.log(`Total Allocations Count : ${allocations.length}`);
    allocations.forEach((alloc, i) => {
      console.log(`Allocation #${i + 1}:`);
      console.log(`  - Allocation ID  : ${alloc.id}`);
      console.log(`  - Room Number    : ${alloc.room_number || alloc.physical_room_number}`);
      console.log(`  - Tariff / Night : ₹${Number(alloc.price_per_night).toLocaleString('en-IN')}`);
      console.log(`  - Alloc Status   : ${alloc.allocation_status}`);
      console.log(`  - Assigned Guest : ${alloc.assigned_guest_name}`);
    });

    console.log('\n--- 3. FINANCIAL PAYMENTS LEDGER (Supabase `payments`) ---');
    console.log(`Payments Count : ${payments.length}`);
    let totalPaymentsSum = 0;
    payments.forEach((p, i) => {
      console.log(`Payment Transaction #${i + 1}:`);
      console.log(`  - Payment Ref   : ${p.payment_reference}`);
      console.log(`  - Booking ID    : ${p.booking_id}`);
      console.log(`  - Amount        : ₹${Number(p.amount).toLocaleString('en-IN')}`);
      console.log(`  - Method        : ${p.payment_method}`);
      console.log(`  - Gateway Order : ${p.gateway_order_id}`);
      console.log(`  - Gateway PayID : ${p.gateway_payment_id}`);
      console.log(`  - Status        : ${p.status}`);
      console.log(`  - Paid At       : ${p.paid_at}`);
      if (p.status === 'successful' || !p.status) {
        totalPaymentsSum += Number(p.amount);
      }
    });
    console.log(`Authoritative Net Payments Sum: ₹${totalPaymentsSum.toLocaleString('en-IN')}`);

    // 4. Audit Local Disk Persistence (data/bookings.json and data/cards.json)
    const localBookingsPath = path.join(__dirname, '..', 'data', 'bookings.json');
    const localBookings = JSON.parse(fs.readFileSync(localBookingsPath, 'utf8'));
    const localTarget = localBookings.find(b => b.booking_reference === 'STG-20261122-4216');

    console.log('\n--- 4. LOCAL DISK PERSISTENCE (`data/bookings.json`) ---');
    console.log(`Local Booking Ref   : ${localTarget?.booking_reference}`);
    console.log(`Local Rooms Count   : ${localTarget?.rooms_count}`);
    console.log(`Local Assigned Room : ${localTarget?.assigned_room_number}`);
    console.log(`Local Allocations   : ${localTarget?.booking_rooms?.length || 0}`);
    console.log(`Local Paid Amount   : ₹${localTarget?.paid_amount}`);

    // 5. Verification Assertions
    console.log('\n--- 5. PRODUCTION INTEGRITY & RECONCILIATION VERIFICATION ---');
    const tests = [
      {
        name: 'Issue A: Master room count matches actual room allocations',
        pass: Number(booking.rooms_count) === allocations.length && allocations.length === 1,
        details: `Master rooms_count = ${booking.rooms_count}, Allocations count = ${allocations.length}`
      },
      {
        name: 'Issue B: Room number is retrieved from inventory (Room 106, not generic identifier)',
        pass: allocations[0]?.room_number === '106' && booking.assigned_room_number === '106',
        details: `Allocation room_number = ${allocations[0]?.room_number}`
      },
      {
        name: 'Issue B: Nightly tariff is ₹2,800/nt (subtotal ₹5,600 / 2 nights)',
        pass: Number(allocations[0]?.price_per_night) === 2800,
        details: `Allocation price_per_night = ₹${allocations[0]?.price_per_night}`
      },
      {
        name: 'Issue C: Amount paid is strictly ₹5,880.00 (NOT doubled to ₹11,760)',
        pass: Number(booking.paid_amount) === 5880 && totalPaymentsSum === 5880,
        details: `Recorded paid_amount = ₹${booking.paid_amount}, Sum of payments = ₹${totalPaymentsSum}`
      },
      {
        name: 'Issue C: Balance due is ₹0.00 (Total ₹5,880 - Paid ₹5,880)',
        pass: balanceDue === 0,
        details: `Balance Due = ₹${balanceDue}`
      },
      {
        name: 'Issue C: Foreign key relationship payments.booking_id is linked to bookings.id',
        pass: payments[0]?.booking_id === booking.id,
        details: `payments.booking_id = ${payments[0]?.booking_id}`
      },
      {
        name: 'Issue D: Master booking status and allocation status are consistent (checked_in)',
        pass: booking.master_status === 'checked_in' && allocations[0]?.allocation_status === 'checked_in',
        details: `Master = ${booking.master_status}, Allocation = ${allocations[0]?.allocation_status}`
      },
      {
        name: 'Issue E: Authoritative Razorpay gateway transaction verified (pay_U3K0ZbRYuzmei3)',
        pass: payments[0]?.gateway_payment_id === 'pay_U3K0ZbRYuzmei3' && payments[0]?.status === 'successful',
        details: `Gateway payment ID = ${payments[0]?.gateway_payment_id}, Status = ${payments[0]?.status}`
      },
      {
        name: 'Data Integrity: Disk persistence (data/bookings.json) in complete sync',
        pass: localTarget?.paid_amount === 5880 && localTarget?.booking_rooms?.length === 1 && localTarget?.booking_rooms[0]?.room_number === '106',
        details: `Local paid_amount = ₹${localTarget?.paid_amount}, Local room = ${localTarget?.booking_rooms?.[0]?.room_number}`
      }
    ];

    let allPass = true;
    tests.forEach((t, i) => {
      const icon = t.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`[Test ${i + 1}] ${icon} - ${t.name}`);
      console.log(`         Details: ${t.details}`);
      if (!t.pass) allPass = false;
    });

    console.log('\n================================================================');
    if (allPass) {
      console.log('✅ ALL PRODUCTION AUDIT AND RECONCILIATION VERIFICATIONS PASSED!');
    } else {
      console.log('❌ SOME TESTS FAILED. PLEASE REVIEW DETAILS ABOVE.');
    }
    console.log('================================================================\n');

  } finally {
    await client.end();
  }
}

testAuthoritativeAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
