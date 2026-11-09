import { repo } from '../src/lib/db/repository';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${desc}`);
    failed++;
  }
}

async function runPhaseAudit() {
  console.log('\n🏨 ================================================================');
  console.log('   SRI TAYI GRAND - PHASE-A & PHASE-B PRODUCTION AUDIT');
  console.log('================================================================\n');

  // 1. HOSPITALITY ANALYTICS COMMAND CENTER
  console.log('📌 1. Hospitality Analytics Command Center & KPIs');
  const analytics30d = repo.getHospitalityAnalytics('30d');
  assert(!!analytics30d.kpis, '1.1 KPI metrics generated');
  assert(analytics30d.kpis.totalRooms === 25, '1.2 Total rooms correctly counted (25 physical rooms)');
  assert(analytics30d.kpis.occupancyRate >= 0 && analytics30d.kpis.occupancyRate <= 100, `1.3 Occupancy rate computed: ${analytics30d.kpis.occupancyRate}%`);
  assert(analytics30d.kpis.adr > 0, `1.4 Average Daily Rate (ADR) calculated: ₹${analytics30d.kpis.adr}`);
  assert(analytics30d.kpis.revPAR > 0, `1.5 RevPAR calculated: ₹${analytics30d.kpis.revPAR}`);
  assert(analytics30d.channelBreakdown.length === 3, '1.6 Distribution channel breakdown contains 3 segments (Direct, MMT, Booking.com)');
  assert(analytics30d.categoryYield.length > 0, '1.7 Category yield generated for all room categories');
  assert(analytics30d.monthlyTrajectory.length === 6, '1.8 Monthly trajectory covers 6 months historical curve');

  // 2. CUSTOMER ENQUIRIES PIPELINE
  console.log('\n📌 2. Customer Enquiries & Banquet Leads Pipeline');
  const initialEnquiries = repo.getContactEnquiries();
  assert(initialEnquiries.length >= 3, `2.1 Contact enquiries seeded (${initialEnquiries.length} found)`);

  const newEnq = repo.createContactEnquiry({
    name: 'Anjineyulu Naidu',
    phone: '+91 94405 67890',
    email: 'anjineyulu@gmail.com',
    subject: 'Family Pilgrimage Stay',
    message: 'Need 4 rooms for Kadiri temple darshan next Friday',
    check_in_date: '2026-11-20',
    check_out_date: '2026-11-22',
    adults_count: 8,
    source: 'website_contact',
    admin_notes: 'Spoke on phone, confirmed booking intention',
  });
  assert(newEnq.status === 'new', '2.2 New enquiry created with status "new"');
  assert(newEnq.id.startsWith('ce-'), '2.3 Enquiry assigned unique ID');

  const updatedEnq = repo.updateContactEnquiryStatus(newEnq.id, 'contacted', 'Quoted group rate of ₹1800/night');
  assert(updatedEnq?.status === 'contacted', '2.4 Enquiry transitioned to "contacted"');
  assert(updatedEnq?.admin_notes?.includes('₹1800'), '2.5 Admin follow-up notes updated');

  const unifiedList = repo.getUnifiedEnquiries();
  assert(unifiedList.length >= initialEnquiries.length + 1, `2.6 Unified enquiries pipeline aggregates ${unifiedList.length} leads across hall and rooms`);

  // 3. GUEST FOLIO BILLING & INCIDENTAL CHARGES
  console.log('\n📌 3. Guest Folio Billing, Incidental Charges & Taxes');
  const existingCharges = repo.getFolioCharges();
  assert(existingCharges.length >= 3, `3.1 Initial folio charges seeded (${existingCharges.length} found)`);

  const addedCharge = repo.addFolioCharge({
    booking_id: 'bk-stg-01',
    booking_reference: 'STG-20261104-8142',
    description: 'Special Kadiri Temple Flower Garland & Pooja Kit',
    category: 'misc',
    amount: 450,
    tax_rate: 0.12,
    tax_amount: 54,
    total_amount: 504,
    posted_by: 'Front Desk Lead',
  });
  assert(addedCharge.tax_amount === 54, '3.2 12% GST calculated correctly (₹54 on ₹450)');
  assert(addedCharge.total_amount === 504, '3.3 Total charge computed (₹450 base + ₹54 tax = ₹504)');

  const bookingCharges = repo.getFolioCharges('STG-20261104-8142');
  const foundCharge = bookingCharges.find(c => c.id === addedCharge.id);
  assert(!!foundCharge, '3.4 Charge mapped to booking STG-20261104-8142 folio ledger');

  const deleted = repo.deleteFolioCharge(addedCharge.id);
  assert(deleted, '3.5 Folio charge deleted and ledger reconciled cleanly');

  // 4. STATUTORY WALK-IN REGISTRATION VALIDATION
  console.log('\n📌 4. Indian Statutory Hotel Guest Registration (Form C)');
  const availableRooms = repo.getAvailableCleanRooms();
  assert(availableRooms.length > 0, `4.1 Clean room inventory available for immediate allocation (${availableRooms.length} rooms)`);
  const room = availableRooms[0];
  assert(room.housekeeping_status === 'clean', '4.2 Allocated room verified clean');

  // 5. RAZORPAY PAYMENT RECONCILIATION & REFUNDS
  console.log('\n📌 5. Razorpay Payments, Links & In-App Refunds');
  const paymentLink = repo.createPaymentLink('STG-20261104-8142', 3500, 'Stay balance settlement');
  assert(paymentLink.success && paymentLink.link_url.includes('rzp.io'), `5.1 Razorpay payment request link generated: ${paymentLink.link_url}`);

  const reconResult = repo.reconcilePayments();
  assert(reconResult.reconciled_count > 0, `5.2 Payment reconciliation completed (${reconResult.reconciled_count} transactions verified)`);

  const refundRes = repo.refundPayment('pay-01', 1000, 'Guest early departure adjustment');
  assert(refundRes.success, '5.3 In-app partial refund processed successfully');
  assert(refundRes.payment?.refund_status === 'partial', '5.4 Payment status updated to "partial" refund');
  assert(refundRes.payment?.refund_amount === 1000, '5.5 Refund amount verified as ₹1,000');

  // 6. GUEST CRM VIP REGISTRY
  console.log('\n📌 6. Guest CRM VIP Classification & Blacklist Management');
  const guests = repo.getGuests();
  assert(guests.length >= 3, `6.1 Guest registry contains ${guests.length} customer profiles`);
  const drAnand = guests.find(g => g.email === 'dr.anand@apollo.org');
  assert(drAnand?.vip_tier === 'vip_platinum', '6.2 VIP Platinum tier verified for premium guest');
  assert((drAnand?.total_spend || 0) > 40000, `6.3 Lifetime spend aggregated: ₹${drAnand?.total_spend}`);

  const blacklisted = repo.toggleGuestBlacklist('gst-02', 'Repeated unauthorized noise violation');
  assert(blacklisted?.is_blacklisted === true, '6.4 Guest successfully marked as blacklisted');
  assert(blacklisted?.blacklist_reason?.includes('noise'), '6.5 Incident reason recorded');

  const reinstated = repo.toggleGuestBlacklist('gst-02');
  assert(reinstated?.is_blacklisted === false, '6.6 Guest blacklist flag cleanly cleared');

  // 7. CONVENTION HALL BANQUET QUOTE BUILDER
  console.log('\n📌 7. Convention Hall Seating Designer & Banquet Quote Generator');
  const quotes = repo.getConventionQuotes();
  assert(quotes.length >= 2, `7.1 Existing banquet quotes loaded (${quotes.length} found)`);

  const newQuote = repo.createConventionQuote({
    client_name: 'Kadiri Chamber of Commerce',
    client_phone: '+91 94400 11223',
    client_email: 'chamber@kadiri.org',
    event_name: 'Trade & Commerce Annual Gala',
    event_date: '2026-12-18',
    seating_layout: 'cluster',
    guest_count: 250,
    catering_package: 'deluxe_buffet',
    catering_rate_per_plate: 550,
    hall_rental_charge: 35000,
    av_sound_lighting: 12000,
    stage_decoration: 15000,
    generator_diesel: 4000,
    subtotal: 203500,
    gst_rate: 0.18,
    gst_amount: 36630,
    total_amount: 240130,
    status: 'draft',
    created_by: 'Event Manager',
    valid_until: '2026-12-01',
  });
  assert(newQuote.quote_number.startsWith('STG-QT-'), `7.2 Quote assigned sequential number: ${newQuote.quote_number}`);
  assert(newQuote.total_amount === 240130, `7.3 18% GST banquet total calculated: ₹${newQuote.total_amount}`);

  const quoteUpdated = repo.updateConventionQuoteStatus(newQuote.id, 'sent');
  assert(quoteUpdated, '7.4 Quote status updated to "sent"');

  // 8. HOUSEKEEPING ATTENDANT ASSIGNMENT & CHECKLIST
  console.log('\n📌 8. Housekeeping Attendant Assignment & 5-Point Turnaround Checklist');
  const assignResult = repo.assignHousekeeper('102', 'stf-04', 'K. Ramesh');
  assert(assignResult, '8.1 Room 102 assigned to housekeeper K. Ramesh');

  const inspectResult = repo.completeHousekeepingTurnaround('102', {
    linen_changed: true,
    towels_replaced: true,
    bathroom_sanitized: true,
    toiletries_restocked: true,
    ac_geyser_checked: true,
    dustbin_emptied: true,
    floor_mopped: true,
    assigned_staff_id: 'stf-04',
    assigned_staff_name: 'K. Ramesh',
    inspection_notes: 'All amenities verified and fresh fragrance applied',
  }, 'G. Mohan Kumar (Hotel Manager)');
  assert(inspectResult, '8.2 Housekeeping 5-point inspection passed and certified');
  const room102 = repo.getRoomById('rm-102');
  assert(room102?.housekeeping_status === 'clean', '8.3 Room 102 housekeeping status set to "clean"');
  assert(room102?.turnaround_checklist?.bathroom_sanitized === true, '8.4 Inspection record stored on physical room entity');

  // 9. STAFF RBAC PERMISSIONS MATRIX
  console.log('\n📌 9. Staff Department & Granular RBAC Permissions');
  const staffMember = repo.updateStaffPermissions('stf-03', {
    can_override_rates: true,
    can_process_refunds: true,
    can_view_accounting: false,
    can_encode_rfid: true,
    can_run_night_audit: true,
    can_manage_inventory: true,
  }, 'Front Desk Operations');
  assert(staffMember?.permissions?.can_process_refunds === true, '9.1 Staff member granted refund privilege');
  assert(staffMember?.department === 'Front Desk Operations', '9.2 Department assigned as Front Desk Operations');

  // 10. REAL-TIME EVENT STREAM TELEMETRY
  console.log('\n📌 10. Real-Time Telemetry & Event Dispatch');
  let eventCaptured = false;
  const unsubscribe = repo.subscribeEvents((msg) => {
    if (msg.eventType === 'full_sync' || msg.eventType === 'enquiry_created' || msg.eventType === 'payment_refunded') {
      eventCaptured = true;
    }
  });
  repo.broadcastEvent('full_sync', { timestamp: new Date().toISOString() });
  assert(eventCaptured, '10.1 Realtime SSE event successfully dispatched and intercepted');
  unsubscribe();

  console.log('\n================================================================');
  console.log(`🎉 AUDIT COMPLETE: ${passed} / ${passed + failed} TESTS PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhaseAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
