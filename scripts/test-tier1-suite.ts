/**
 * ==============================================================================
 * SRI TAYI GRAND - TIER-1 OPERATIONAL MODULES VERIFICATION SUITE
 * ==============================================================================
 * 
 * Verifies full functionality and real-time event generation for:
 * 1. Cashbook & Cash Drawer Shift Management
 * 2. Operating Expenses & Automatic Drawer Cash Outflow Linkage
 * 3. Daily Closing & 6-Step Night Audit Reconciliation
 * 4. Property Maintenance Work Orders & Out-of-Order (OOO) Room Blocking
 */

import { repo } from '../src/lib/db/repository';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Details: ${detail}`);
    process.exitCode = 1;
  }
}

async function runTier1Tests() {
  console.log('\n🏨 ================================================================');
  console.log('    SRI TAYI GRAND - TIER-1 INTEGRATION & VERIFICATION SUITE');
  console.log('================================================================\n');

  // ----------------------------------------------------------------------------
  // SECTION 1: CASHBOOK & CASH DRAWER SHIFT MANAGEMENT
  // ----------------------------------------------------------------------------
  console.log('📌 [TEST 1] Front Desk Cash Drawer & Shift Management');

  let activeShift = repo.getActiveCashShift();
  if (activeShift) {
    // If a shift was already open, close it cleanly first to start fresh
    repo.closeCashShift({
      shiftId: activeShift.id,
      closingCashCounted: 5000,
      notes: 'Closing previous test shift',
    }, 'Test Auditor');
  }

  // 1.1 Open a new Cash Shift with ₹5,000 opening float
  const openResult = repo.openCashShift({
    cashierId: 'stf-001',
    cashierName: 'Raghavendra Rao (Lead Front Desk)',
    openingFloat: 5000,
    notes: 'Morning shift drawer handover with ₹5,000 cash float.',
  }, 'Raghavendra Rao');

  assert(Boolean(openResult && openResult.id), '1.1 Shift successfully opened with ID', openResult?.id);
  assert(openResult.status === 'open', '1.2 Shift status is marked "open"');
  assert(openResult.opening_float === 5000, '1.3 Shift opening float is recorded as ₹5,000');

  // 1.2 Verify initial balance
  let balance = repo.getCashBalance(openResult.id);
  assert(balance.openingFloat === 5000, '1.4 Opening float reflects in balance query');
  assert(balance.currentBalance === 5000, '1.5 Current drawer balance equals float before transactions');

  // 1.3 Record Cash In (Guest room tariff cash payment ₹2,400)
  const cashInTx = repo.recordCashTransaction({
    shift_id: openResult.id,
    type: 'cash_in',
    category: 'guest_payment',
    amount: 2400,
    reason: 'Guest cash payment for Room 204 booking advance',
    booking_reference: 'BK-TEST-204',
    receipt_ref: 'RCPT-0091',
    performed_by: 'Raghavendra Rao',
  }, 'Raghavendra Rao');

  assert(Boolean(cashInTx && cashInTx.id), '1.6 Cash In transaction recorded successfully');
  balance = repo.getCashBalance(openResult.id);
  assert(balance.totalCashIn === 2400, '1.7 Total Cash In tracked as ₹2,400');
  assert(balance.currentBalance === 7400, '1.8 Balance incremented to ₹7,400 (Float 5000 + 2400 in)');

  // 1.4 Record Cash Out (Front desk petty cash payout ₹600)
  const cashOutTx = repo.recordCashTransaction({
    shift_id: openResult.id,
    type: 'cash_out',
    category: 'petty_cash',
    amount: 600,
    reason: 'Emergency courier & speed post for guest forgotten documents',
    performed_by: 'Raghavendra Rao',
  }, 'Raghavendra Rao');

  assert(Boolean(cashOutTx && cashOutTx.id), '1.9 Cash Out transaction recorded successfully');
  balance = repo.getCashBalance(openResult.id);
  assert(balance.totalCashOut === 600, '1.10 Total Cash Out tracked as ₹600');
  assert(balance.currentBalance === 6800, '1.11 Balance decremented to ₹6,800 (7400 - 600)');

  // 1.5 Close Shift with physical cash count
  // Expected = 6800. Let's count 6800 for exact balanced close.
  const closedShift = repo.closeCashShift({
    shiftId: openResult.id,
    closingCashCounted: 6800,
    notes: 'Shift balanced without discrepancy. Physical cash verified.',
  }, 'Raghavendra Rao');

  assert(closedShift.status === 'closed', '1.12 Shift status transitioned to "closed"');
  assert(closedShift.closing_cash_counted === 6800, '1.13 Actual cash counted recorded as ₹6,800');
  assert(closedShift.discrepancy === 0, '1.14 Discrepancy is exactly 0 (Balanced drawer)');
  assert(Boolean(closedShift.closed_at), '1.15 Closed timestamp generated');

  // Re-open a shift for subsequent tests
  const activeShift2 = repo.openCashShift({
    cashierId: 'stf-002',
    cashierName: 'Lakshmi Narayana (Accounts Manager)',
    openingFloat: 6800,
    notes: 'Afternoon / Evening continuous shift',
  }, 'Lakshmi Narayana');

  // ----------------------------------------------------------------------------
  // SECTION 2: OPERATING EXPENSES & AUTOMATIC CASH DRAWER DEDUCTION
  // ----------------------------------------------------------------------------
  console.log('\n📌 [TEST 2] Operating Expenses & Cash Drawer Deductions');

  const preExpenseBalance = repo.getCashBalance().currentBalance;

  // 2.1 Create an operating expense with payment_method: 'cash'
  const cashExpense = repo.createExpense({
    category: 'laundry',
    title: 'Steam Laundry & Bedding Sanitization Batch #89',
    description: 'Dry cleaning 40 bedsheets, 80 pillow covers, 40 bath towels',
    amount: 1500,
    payment_method: 'cash',
    recorded_by: 'Lakshmi Narayana',
    expense_date: new Date().toISOString().split('T')[0],
    receipt_ref: 'VOUCHER-EXP-89',
    status: 'approved',
  }, 'Lakshmi Narayana');

  assert(Boolean(cashExpense && cashExpense.id), '2.1 Cash expense voucher created successfully');

  // 2.2 Verify cash drawer auto-deduction
  const postExpenseBalance = repo.getCashBalance().currentBalance;
  assert(
    postExpenseBalance === preExpenseBalance - 1500,
    '2.2 Drawer cash balance automatically decremented by ₹1,500 cash expense payout',
    `Pre: ${preExpenseBalance}, Post: ${postExpenseBalance}`
  );

  // 2.3 Verify cashbook transaction ledger contains the auto-logged cash out
  const shiftTransactions = repo.getCashTransactions(activeShift2.id);
  const autoTx = shiftTransactions.find((tx) => tx.receipt_ref === 'VOUCHER-EXP-89');
  assert(Boolean(autoTx), '2.3 Automatic Cash Transaction logged in active shift for cash expense');
  assert(autoTx?.amount === 1500, '2.4 Auto transaction amount matches expense amount (₹1,500)');
  assert(autoTx?.category === 'expense_payout', '2.5 Auto transaction categorized as "expense_payout"');

  // 2.4 Create a digital (UPI / online) expense and verify drawer is NOT affected
  const digitalExpense = repo.createExpense({
    category: 'utilities',
    title: 'Broadband Fiber Internet Lease Bill',
    description: 'BSNL FTTH high-speed internet monthly recharge for hotel rooms',
    amount: 2800,
    payment_method: 'upi',
    recorded_by: 'Lakshmi Narayana',
    expense_date: new Date().toISOString().split('T')[0],
    status: 'approved',
  }, 'Lakshmi Narayana');

  assert(Boolean(digitalExpense && digitalExpense.id), '2.6 UPI expense voucher created');
  const postDigitalBalance = repo.getCashBalance().currentBalance;
  assert(
    postDigitalBalance === postExpenseBalance,
    '2.7 Digital (UPI) expense did NOT deduct physical cash from drawer'
  );

  // ----------------------------------------------------------------------------
  // SECTION 3: HOTEL NIGHT AUDIT & DAILY CLOSING
  // ----------------------------------------------------------------------------
  console.log('\n📌 [TEST 3] Hotel Night Audit & Daily Closing');

  const todayStr = new Date().toISOString().split('T')[0];
  const summary = repo.getTodayClosingSummary(todayStr);

  assert(Boolean(summary), '3.1 Today closing summary computed');
  assert(typeof summary.totalRevenue === 'number', '3.2 Total Revenue calculated');
  assert(typeof summary.cashCollected === 'number', '3.3 Cash Collected calculated');
  assert(typeof summary.expectedCashInDrawer === 'number', '3.4 Expected Cash in Drawer calculated');

  // 3.5 Operational room statistics
  assert(Boolean(summary.operational), '3.5 Operational room statistics present');
  assert(summary.operational.totalRooms > 0, `3.6 Total rooms counted (${summary.operational.totalRooms} rooms)`);
  assert(typeof summary.operational.occupancyRate === 'number', `3.7 Occupancy rate calculated: ${summary.operational.occupancyRate}%`);
  assert(typeof summary.operational.cleanRooms === 'number', '3.8 Clean rooms counted');

  // 3.9 Statutory GST Tax Slab
  assert(Boolean(summary.gst), '3.9 GST statutory breakdown present');
  assert(summary.gst.totalGst === summary.gst.cgst + summary.gst.sgst, '3.10 CGST + SGST equals Total GST');

  // 3.11 Perform Daily Closing
  const closingRecord = repo.performDailyClosing({
    closingDate: todayStr,
    actualCashCounted: summary.expectedCashInDrawer,
    notes: 'Automated test night audit completed. All ledgers balanced.',
    closedByName: 'Lakshmi Narayana',
    closedByRole: 'Accounts',
  });

  assert(Boolean(closingRecord && closingRecord.id), '3.11 Daily closing record generated');
  assert(closingRecord.status === 'closed', '3.12 Daily closing status is "closed"');
  assert(closingRecord.discrepancy === 0, '3.13 Discrepancy is 0 when actual matches expected');
  assert(repo.getDailyClosings().length > 0, '3.14 Closing record saved in immutable history');

  // ----------------------------------------------------------------------------
  // SECTION 4: PROPERTY MAINTENANCE & OUT-OF-ORDER (OOO) ROOM BLOCKS
  // ----------------------------------------------------------------------------
  console.log('\n📌 [TEST 4] Maintenance Work Orders & Out-of-Order (OOO) Blocks');

  const allRooms = repo.getRooms();
  assert(allRooms.length > 0, '4.1 Property rooms available in inventory');
  const targetRoom = allRooms[0];
  const roomNum = targetRoom.room_number;

  // 4.2 Create maintenance work order with room_blocked: true
  const maintTicket = repo.createMaintenanceTicket({
    room_number: roomNum,
    issue_title: 'AC cooling coil freezing / Compressor thermostat failure',
    description: 'Guest reported room temperature not dropping below 26C. Inspection showed ice accumulation on evaporator.',
    category: 'ac_climate',
    priority: 'urgent',
    estimated_cost: 2200,
    room_blocked: true,
    reported_by: 'Suresh (Maintenance Engineer)',
  }, 'Suresh');

  assert(Boolean(maintTicket && maintTicket.id), '4.2 Maintenance ticket created with ID', maintTicket.id);
  assert(maintTicket.status === 'reported', '4.3 Ticket status initialized to "reported"');
  assert(maintTicket.room_blocked === true, '4.4 Room block flag is true');

  // 4.5 Verify room operational_status is immediately set to 'maintenance'
  const blockedRoom = repo.getRoomById(roomNum);
  assert(
    blockedRoom?.operational_status === 'maintenance',
    `4.5 Room ${roomNum} operational status automatically updated to "maintenance" (OOO Block)`,
    `Actual status: ${blockedRoom?.operational_status}`
  );

  // 4.6 Update maintenance ticket with technician assignment
  const inProgressTicket = repo.updateMaintenanceTicket(
    maintTicket.id,
    {
      assigned_to: 'Kadiri Carrier AC Services',
      status: 'in_progress',
    },
    'Suresh'
  );
  assert(inProgressTicket.status === 'in_progress', '4.6 Ticket status updated to "in_progress"');
  assert(inProgressTicket.assigned_to === 'Kadiri Carrier AC Services', '4.7 Assigned technician updated');

  // 4.8 Resolve maintenance ticket: verify auto-unblock and transfer to Housekeeping (dirty / cleaning)
  const resolvedTicket = repo.updateMaintenanceTicket(
    maintTicket.id,
    {
      status: 'resolved',
      actual_cost: 1950,
      resolution_notes: 'Replaced defrost thermostat switch and refilled R-32 refrigerant. Cooling tested at 20°C.',
      room_blocked: false,
    },
    'Suresh'
  );

  assert(resolvedTicket.status === 'resolved', '4.8 Ticket status transitioned to "resolved"');
  assert(Boolean(resolvedTicket.resolved_at), '4.9 Resolved timestamp generated');
  assert(resolvedTicket.actual_cost === 1950, '4.10 Actual repair cost recorded as ₹1,950');

  // 4.11 Verify room operational_status transitioned to 'cleaning' and housekeeping_status to 'dirty'
  const unblockedRoom = repo.getRoomById(roomNum);
  assert(
    unblockedRoom?.operational_status === 'cleaning',
    `4.11 Room ${roomNum} operational status automatically set to "cleaning" upon resolution`,
    `Actual: ${unblockedRoom?.operational_status}`
  );
  assert(
    unblockedRoom?.housekeeping_status === 'dirty',
    `4.12 Room ${roomNum} housekeeping status automatically marked "dirty" for turnover sanitization`,
    `Actual: ${unblockedRoom?.housekeeping_status}`
  );

  // 4.13 Delete ticket verification
  const ticketIdToDelete = maintTicket.id;
  const deleteSuccess = repo.deleteMaintenanceTicket(ticketIdToDelete, 'Admin');
  assert(deleteSuccess === true, '4.13 Maintenance ticket deleted successfully');
  const deletedTicket = repo.getMaintenanceTicket(ticketIdToDelete);
  assert(deletedTicket === null, '4.14 Deleted ticket is no longer retrievable');

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎉 TEST EXECUTION COMPLETED: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🌟 ALL TIER-1 MODULES VERIFIED 100% OPERATIONAL WITH ZERO DEFECTS!\n');
    process.exit(0);
  } else {
    console.error(`💥 ${totalTests - passedTests} tests failed.`);
    process.exit(1);
  }
}

runTier1Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
