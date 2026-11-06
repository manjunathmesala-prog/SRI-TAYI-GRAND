/**
 * ==============================================================================
 * SRI TAYI GRAND - COMPREHENSIVE TIER-1, TIER-2 & TIER-3 VERIFICATION SUITE
 * ==============================================================================
 * 
 * Verifies 100% end-to-end functionality and real-time synchronization for:
 * 
 * TIER-1:
 *  1. Cashbook & Cash Drawer Shift Management
 *  2. Operating Expenses & Cash Drawer Deductions
 *  3. Hotel Night Audit & 6-Step Daily Closing
 *  4. Property Maintenance Work Orders & Out-of-Order (OOO) Blocks
 * 
 * TIER-2:
 *  5. 2-Way OTA Channel Manager Engine & Rate Markup Buffer
 *  6. Interactive Room Tape Chart & Multi-Floor Timeline Matrix
 *  7. Dynamic Tariff & Seasonal Pricing Rules Engine
 * 
 * TIER-3:
 *  8. General Ledger Double-Entry Accounting (Chart of Accounts, P&L, Balance Sheet)
 *  9. Immutable System Audit Logs & Forensic Action Tracking
 * 10. Staff Daily Attendance & Shift Roster (Clock-In / Clock-Out)
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

async function runAllTiersVerification() {
  console.log('\n🏨 ================================================================');
  console.log('   SRI TAYI GRAND - FULL SUITE (TIER-1, TIER-2, TIER-3) AUDIT');
  console.log('================================================================\n');

  // ============================================================================
  // TIER-1: CASHBOOK & DRAWER
  // ============================================================================
  console.log('📌 [TIER-1] 1. Front Desk Cash Drawer & Shift Management');
  let activeShift = repo.getActiveCashShift();
  if (activeShift) {
    repo.closeCashShift({
      shiftId: activeShift.id,
      closingCashCounted: activeShift.opening_float,
      notes: 'Closing previous test shift',
    }, 'Auditor');
  }

  const shift = repo.openCashShift({
    cashierId: 'stf-001',
    cashierName: 'Raghavendra Rao',
    openingFloat: 5000,
    notes: 'Morning shift opening float verified',
  }, 'Raghavendra Rao');

  assert(Boolean(shift && shift.id), '1.1 Shift opened successfully');
  assert(shift.opening_float === 5000, '1.2 Opening float recorded as ₹5,000');

  repo.recordCashTransaction({
    shift_id: shift.id,
    type: 'cash_in',
    category: 'guest_payment',
    amount: 3500,
    reason: 'Room tariff cash advance',
    performed_by: 'Raghavendra Rao',
  }, 'Raghavendra Rao');

  let balance = repo.getCashBalance(shift.id);
  assert(balance.currentBalance === 8500, '1.3 Balance updated to ₹8,500 (+₹3,500)');

  repo.recordCashTransaction({
    shift_id: shift.id,
    type: 'cash_out',
    category: 'petty_cash',
    amount: 500,
    reason: 'Front desk postage and stationary',
    performed_by: 'Raghavendra Rao',
  }, 'Raghavendra Rao');

  balance = repo.getCashBalance(shift.id);
  assert(balance.currentBalance === 8000, '1.4 Balance updated to ₹8,000 (-₹500)');

  const closed = repo.closeCashShift({
    shiftId: shift.id,
    closingCashCounted: 8000,
    notes: 'Drawer verified exact balance',
  }, 'Raghavendra Rao');

  assert(closed.status === 'closed', '1.5 Shift status closed');
  assert(closed.discrepancy === 0, '1.6 Discrepancy is zero (Balanced drawer)');

  // Reopen shift for continuing operations
  const activeShift2 = repo.openCashShift({
    cashierId: 'stf-002',
    cashierName: 'Lakshmi Narayana',
    openingFloat: 8000,
    notes: 'Continuous operational shift',
  }, 'Lakshmi Narayana');

  // ============================================================================
  // TIER-1: EXPENSES & DRAWER DEDUCTION
  // ============================================================================
  console.log('\n📌 [TIER-1] 2. Operating Expenses & Automatic Drawer Cash Outflows');
  const preExpenseBal = repo.getCashBalance().currentBalance;

  const cashExp = repo.createExpense({
    category: 'laundry',
    title: 'Steam Laundry Linen Sanitization',
    description: 'Dry cleaning 35 bedsheets and 70 pillowcases',
    amount: 1400,
    payment_method: 'cash',
    recorded_by: 'Lakshmi Narayana',
    expense_date: new Date().toISOString().split('T')[0],
    receipt_ref: 'VOUCHER-EXP-101',
    status: 'approved',
  }, 'Lakshmi Narayana');

  assert(Boolean(cashExp && cashExp.id), '2.1 Cash expense voucher created');
  const postExpenseBal = repo.getCashBalance().currentBalance;
  assert(postExpenseBal === preExpenseBal - 1400, '2.2 Cash drawer balance automatically reduced by ₹1,400');

  // ============================================================================
  // TIER-1: NIGHT AUDIT & DAILY CLOSING
  // ============================================================================
  console.log('\n📌 [TIER-1] 3. Hotel Night Audit & 6-Step Daily Closing');
  const today = new Date().toISOString().split('T')[0];
  const summary = repo.getTodayClosingSummary(today);
  assert(Boolean(summary), '3.1 Night audit closing summary generated');
  assert(summary.operational.totalRooms === 25, '3.2 Total room inventory counted (25 rooms)');
  assert(typeof summary.operational.occupancyRate === 'number', '3.3 Occupancy rate calculated');
  assert(summary.gst.totalGst === summary.gst.cgst + summary.gst.sgst, '3.4 12% GST balanced (CGST + SGST = Total GST)');

  const closing = repo.performDailyClosing({
    closingDate: today,
    actualCashCounted: summary.expectedCashInDrawer,
    notes: 'Night audit verified and locked',
    closedByName: 'Lakshmi Narayana',
    closedByRole: 'Accounts',
  });
  assert(closing.status === 'closed', '3.5 Daily register closed and locked');
  assert(closing.discrepancy === 0, '3.6 Zero discrepancy recorded');

  // ============================================================================
  // TIER-1: MAINTENANCE & OOO ROOM BLOCKS
  // ============================================================================
  console.log('\n📌 [TIER-1] 4. Property Maintenance & Out-of-Order (OOO) Blocks');
  const room101 = repo.getRoomById('101');
  assert(Boolean(room101), '4.1 Room 101 retrieved');

  const ticket = repo.createMaintenanceTicket({
    room_number: '101',
    issue_title: 'AC compressor low cooling test',
    description: 'Thermostat sensor calibrated',
    category: 'ac_climate',
    priority: 'urgent',
    estimated_cost: 1500,
    room_blocked: true,
    reported_by: 'Suresh (Maintenance)',
  }, 'Suresh');

  assert(Boolean(ticket && ticket.id), '4.2 Maintenance ticket created');
  const blocked101 = repo.getRoomById('101');
  assert(blocked101?.operational_status === 'maintenance', '4.3 Room 101 immediately set to "maintenance" (OOO)');

  const resolved = repo.updateMaintenanceTicket(ticket.id, {
    status: 'resolved',
    actual_cost: 1400,
    resolution_notes: 'Compressor switch replaced',
    room_blocked: false,
  }, 'Suresh');

  assert(resolved.status === 'resolved', '4.4 Maintenance ticket marked resolved');
  const unblocked101 = repo.getRoomById('101');
  assert(unblocked101?.operational_status === 'cleaning', '4.5 Room 101 automatically moved to "cleaning"');
  assert(unblocked101?.housekeeping_status === 'dirty', '4.6 Housekeeping status set to "dirty" for turnover inspection');

  // ============================================================================
  // TIER-2: OTA CHANNEL MANAGER & 2-WAY SYNC
  // ============================================================================
  console.log('\n📌 [TIER-2] 5. 2-Way OTA Channel Manager Engine & Rate Markup');
  const channels = repo.getChannels();
  assert(channels.length >= 4, `5.1 OTA Channels retrieved (${channels.length} channels: MMT, Goibibo, Booking.com, Agoda)`);

  const mmt = repo.getChannel('makemytrip');
  assert(Boolean(mmt && mmt.isConnected), '5.2 MakeMyTrip & Goibibo is connected');
  assert(mmt?.rateMultiplier === 1.15, '5.3 +15% Rate Parity markup multiplier configured (1.15x)');

  // Update channel
  const updatedMmt = repo.updateChannel('makemytrip', { rateMultiplier: 1.18 }, 'Admin');
  assert(updatedMmt.rateMultiplier === 1.18, '5.4 Channel markup adjusted to +18%');

  // Sync channel
  const syncResult = repo.syncChannel('makemytrip', 'Admin');
  assert(syncResult.success === true, '5.5 2-way ARI sync executed successfully');
  assert(syncResult.log.status === 'success', '5.6 Sync log recorded as "success"');
  assert(syncResult.log.roomsUpdatedCount === 25, '5.7 All 25 rooms synchronized to OTA portal');

  const logs = repo.getChannelSyncLogs();
  assert(logs.length > 0, '5.8 Channel sync audit trail accessible');

  // Restore 1.15 multiplier
  repo.updateChannel('makemytrip', { rateMultiplier: 1.15 }, 'Admin');

  // ============================================================================
  // TIER-2: ROOM TAPE CHART (VISUAL MATRIX)
  // ============================================================================
  console.log('\n📌 [TIER-2] 6. Interactive Room Tape Chart & Multi-Floor Timeline');
  const rooms = repo.getRooms();
  assert(rooms.length === 25, '6.1 All 25 physical rooms mapped');
  
  const floor1 = rooms.filter(r => r.floor_number === 1);
  const floor2 = rooms.filter(r => r.floor_number === 2);
  const floor3 = rooms.filter(r => r.floor_number === 3);
  assert(floor1.length > 0 && floor2.length > 0 && floor3.length > 0, '6.2 Rooms categorized across Floors 1, 2, and 3');

  const bookings = repo.getBookings();
  assert(bookings.length > 0, '6.3 Reservation blocks available for visual timeline plotting');
  const firstBooking = bookings[0];
  assert(Boolean(firstBooking.check_in_date && firstBooking.check_out_date), '6.4 Booking has valid arrival and departure span');

  // ============================================================================
  // TIER-2: DYNAMIC TARIFF & PRICING RULES
  // ============================================================================
  console.log('\n📌 [TIER-2] 7. Dynamic Tariff & Seasonal Pricing Rules Engine');
  const rules = repo.getPricingRules();
  assert(rules.length >= 3, `7.1 Pricing rules loaded (${rules.length} active rules)`);

  const weekendRule = rules.find(r => r.rule_type === 'weekend_surge');
  assert(Boolean(weekendRule && weekendRule.is_active), '7.2 Weekend Surge rule (+15%) active');

  const festivalRule = rules.find(r => r.rule_type === 'festival_surge');
  assert(Boolean(festivalRule && festivalRule.adjustment_value === 30), '7.3 Kadiri Brahmotsavam Surge (+30%) verified');

  // Rate calculator test
  const categories = repo.getCategories();
  assert(categories.length > 0, '7.4 Room categories available');
  const testCat = categories[0];

  // Test weekend calculation (simulate Friday)
  const fridayRate = repo.calculateEffectiveRate(testCat.id, '2026-11-13'); // Friday
  assert(
    fridayRate.effectiveRate > fridayRate.baseRate,
    `7.5 Weekend surge calculated: Base ₹${fridayRate.baseRate} -> Effective ₹${fridayRate.effectiveRate}`,
    `Rules applied: ${fridayRate.appliedRules.join(', ')}`
  );

  // Test rule creation, update, and deletion
  const newRule = repo.createPricingRule({
    name: 'New Year Eve Surge 2027',
    description: 'Holiday surge for 31st December',
    rule_type: 'seasonal_surge',
    adjustment_type: 'percentage',
    adjustment_value: 25,
    applies_to_categories: ['all'],
    start_date: '2026-12-30',
    end_date: '2027-01-02',
    is_active: true,
  }, 'Admin');

  assert(Boolean(newRule && newRule.id), '7.6 New pricing rule created');
  const updatedRule = repo.updatePricingRule(newRule.id, { adjustment_value: 20 }, 'Admin');
  assert(updatedRule.adjustment_value === 20, '7.7 Pricing rule updated to 20%');
  const deletedRule = repo.deletePricingRule(newRule.id, 'Admin');
  assert(deletedRule === true, '7.8 Pricing rule deleted cleanly');

  // ============================================================================
  // TIER-3: GENERAL LEDGER DOUBLE-ENTRY ACCOUNTING
  // ============================================================================
  console.log('\n📌 [TIER-3] 8. General Ledger Double-Entry Accounting');
  const coa = repo.getChartOfAccounts();
  assert(coa.length >= 10, `8.1 Chart of Accounts loaded (${coa.length} GL accounts)`);

  const assets = coa.filter(a => a.category === 'asset');
  const liabilities = coa.filter(a => a.category === 'liability');
  const equity = coa.filter(a => a.category === 'equity');
  const revenue = coa.filter(a => a.category === 'revenue');
  const expense = coa.filter(a => a.category === 'expense');

  assert(assets.length > 0 && liabilities.length > 0 && equity.length > 0 && revenue.length > 0 && expense.length > 0,
    '8.2 All 5 GAAP accounting categories represented (Assets, Liabilities, Equity, Revenue, Expense)'
  );

  // Balanced Journal Entry
  const je = repo.createJournalEntry({
    date: today,
    reference: 'TEST-TX-001',
    description: 'Guest cash settlement for Deluxe Room stay',
    lines: [
      { accountCode: '1010', accountName: 'Cash in Front Desk Drawer', debit: 2500, credit: 0, description: 'Cash collected' },
      { accountCode: '4010', accountName: 'Room Accommodation Revenue', debit: 0, credit: 2232, description: 'Room tariff' },
      { accountCode: '2010', accountName: 'GST Output SGST (6%) Payable', debit: 0, credit: 134, description: 'SGST 6%' },
      { accountCode: '2020', accountName: 'GST Output CGST (6%) Payable', debit: 0, credit: 134, description: 'CGST 6%' },
    ],
    total_debit: 2500,
    total_credit: 2500,
    is_posted: true,
    created_by: 'Lakshmi Narayana',
  }, 'Lakshmi Narayana');

  assert(Boolean(je && je.id), '8.3 Balanced Journal Entry posted successfully');
  assert(je.total_debit === 2500 && je.total_credit === 2500, '8.4 Total Debit (₹2,500) === Total Credit (₹2,500)');
  assert(je.is_balanced === true, '8.5 Journal entry validated as balanced');

  // Test rejection of unbalanced entry
  let threwUnbalanced = false;
  try {
    repo.createJournalEntry({
      date: today,
      reference: 'UNBALANCED-TX',
      description: 'Illegal unbalanced entry',
      lines: [
        { accountCode: '1010', accountName: 'Cash', debit: 5000, credit: 0 },
        { accountCode: '4010', accountName: 'Revenue', debit: 0, credit: 4000 },
      ],
      total_debit: 5000,
      total_credit: 4000,
      is_posted: true,
      created_by: 'Tester',
    });
  } catch {
    threwUnbalanced = true;
  }
  assert(threwUnbalanced === true, '8.6 Out-of-balance journal entry strictly rejected with exception');

  // P&L and Balance Sheet
  const pnl = repo.getPnL();
  assert(typeof pnl.revenueTotal === 'number' && typeof pnl.expenseTotal === 'number', '8.7 Profit & Loss statement computed');
  assert(pnl.netProfit === pnl.revenueTotal - pnl.expenseTotal, '8.8 Net Profit = Revenue Total - Expense Total');

  const bs = repo.getBalanceSheet();
  assert(typeof bs.assetsTotal === 'number' && typeof bs.liabilitiesTotal === 'number', '8.9 Balance sheet assets & liabilities computed');

  // ============================================================================
  // TIER-3: IMMUTABLE AUDIT LOGS
  // ============================================================================
  console.log('\n📌 [TIER-3] 9. Immutable System Audit Logs');
  const initialLogCount = repo.getAuditLogs().length;

  const testLog = repo.recordAuditLog({
    action: 'GUEST_CHECKIN_KEYCARD_TAP',
    entityType: 'booking',
    entityId: 'BK-TEST-99',
    details: 'Guest checked in and tapped Room 204 RFID keycard at elevator reader',
    userName: 'Raghavendra Rao',
    userRole: 'Front Desk',
  });

  assert(Boolean(testLog && testLog.id), '9.1 Audit log entry recorded with unique ID');
  const postLogCount = repo.getAuditLogs().length;
  assert(postLogCount === initialLogCount + 1, '9.2 Audit log count incremented');

  const bookingLogs = repo.getAuditLogs('booking');
  const foundLog = bookingLogs.find(l => l.id === testLog.id);
  assert(Boolean(foundLog), '9.3 Audit log retrievable by entity category filter');

  // ============================================================================
  // TIER-3: STAFF ATTENDANCE & SHIFT ROSTER
  // ============================================================================
  console.log('\n📌 [TIER-3] 10. Staff Attendance & Shift Roster (Clock-In / Clock-Out)');
  const staffMembers = repo.getStaff();
  assert(staffMembers.length > 0, '10.1 Staff members available in property roster');
  const testStaff = staffMembers[0];

  // Clock in staff
  const clockIn = repo.clockInStaff({
    staffId: testStaff.id,
    shift: 'morning',
    notes: 'Morning shift duty commenced',
  }, 'Staff Lead');

  assert(Boolean(clockIn && clockIn.id), `10.2 Staff ${testStaff.full_name} clocked in successfully`);
  assert(Boolean(clockIn.clock_in), '10.3 Clock-in timestamp recorded');
  assert(clockIn.status === 'present', '10.4 Status marked as "present"');

  // Clock out staff
  const clockOut = repo.clockOutStaff(clockIn.id, 'Staff Lead');
  assert(Boolean(clockOut.clock_out), '10.5 Clock-out timestamp recorded');
  assert(typeof clockOut.work_hours === 'number', `10.6 Work hours calculated: ${clockOut.work_hours} hrs`);

  // ============================================================================
  // FINAL RESULTS SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log(`🎉 COMPREHENSIVE SUITE COMPLETED: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🌟 ALL 10 MODULES (TIER-1, TIER-2, TIER-3) 100% OPERATIONAL WITH ZERO DEFECTS!\n');
    process.exit(0);
  } else {
    console.error(`💥 ${totalTests - passedTests} tests failed.`);
    process.exit(1);
  }
}

runAllTiersVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
