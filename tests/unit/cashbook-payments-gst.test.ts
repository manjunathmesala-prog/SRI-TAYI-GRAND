import { describe, it, expect } from 'vitest';
import { repo } from '@/lib/db/repository';

describe('Payments, Cashbook Register & GST Invoicing Rules', () => {
  it('manages cash shift lifecycle and accurately tracks drawer balance', () => {
    // If a shift was already open from previous state, close it first for a clean test
    const existing = repo.getActiveCashShift();
    if (existing) {
      repo.closeCashShift({
        shiftId: existing.id,
        closingCashCounted: repo.getCashBalance(existing.id).currentBalance,
        closedByName: 'System Test',
      });
    }

    // 1. Open a new cash shift with ₹5,000 float
    const shift = repo.openCashShift(
      {
        cashierId: 'stf-test-01',
        cashierName: 'A. Ramanjaneyulu',
        openingFloat: 5000,
        notes: 'Morning shift opening float',
      },
      'A. Ramanjaneyulu'
    );

    expect(shift).toBeDefined();
    expect(shift.status).toBe('open');
    expect(shift.opening_float).toBe(5000);
    expect(shift.shift_number).toMatch(/^SH-\d{8}-\d{2}$/);

    // 2. Reject opening a second shift while one is active
    expect(() =>
      repo.openCashShift({
        cashierId: 'stf-test-02',
        cashierName: 'Second Cashier',
        openingFloat: 2000,
      })
    ).toThrow(/is currently active/i);

    // 3. Check initial balance
    const initBalance = repo.getCashBalance();
    expect(initBalance.openingFloat).toBe(5000);
    expect(initBalance.currentBalance).toBe(5000);

    // 4. Record a Cash Payment (e.g. ₹2,016 walk-in collection)
    const payment = repo.recordPayment(
      {
        booking_reference: 'TEST-STG-CASH-01',
        guest_name: 'V. Krishna Murthy',
        amount: 2016,
        currency: 'INR',
        payment_method: 'cash',
        status: 'successful',
        paid_at: new Date().toISOString(),
      },
      'A. Ramanjaneyulu'
    );

    expect(payment.amount).toBe(2016);
    expect(payment.payment_method).toBe('cash');

    // 5. Verify the cash drawer automatically updated by +₹2,016
    const balanceAfterCashPayment = repo.getCashBalance();
    expect(balanceAfterCashPayment.totalCashIn).toBeGreaterThanOrEqual(2016);
    expect(balanceAfterCashPayment.currentBalance).toBe(5000 + balanceAfterCashPayment.totalCashIn - balanceAfterCashPayment.totalCashOut);

    // 6. Record a cash expense (e.g. ₹350 milk and laundry supplies)
    const expense = repo.createExpense(
      {
        title: 'Morning Cleaning Detergent & Disinfectant',
        category: 'cleaning_supplies',
        amount: 350,
        payment_method: 'cash',
        expense_date: new Date().toISOString().split('T')[0],
        recorded_by: 'A. Ramanjaneyulu',
      },
      'A. Ramanjaneyulu'
    );

    expect(expense.amount).toBe(350);

    // 7. Verify cash drawer reflects the payout
    const balanceAfterExpense = repo.getCashBalance();
    expect(balanceAfterExpense.totalCashOut).toBeGreaterThanOrEqual(350);

    // 8. Close shift with exact counted cash
    const expectedClosing = balanceAfterExpense.currentBalance;
    const closedShift = repo.closeCashShift(
      {
        shiftId: shift.id,
        closingCashCounted: expectedClosing,
        notes: 'End of shift reconciliation perfect match',
        closedByName: 'A. Ramanjaneyulu',
      },
      'A. Ramanjaneyulu'
    );

    expect(closedShift.status).toBe('closed');
    expect(closedShift.discrepancy).toBe(0);
    expect(closedShift.closing_cash_counted).toBe(expectedClosing);
  });

  it('computes daily closing summary with 12% GST breakdown (6% CGST + 6% SGST)', () => {
    const today = new Date().toISOString().split('T')[0];
    const summary = repo.getTodayClosingSummary(today);

    expect(summary).toBeDefined();
    expect(summary.closingDate).toBe(today);
    expect(summary.gst).toBeDefined();

    if (summary.totalRevenue > 0) {
      expect(summary.gst!.netTaxable).toBe(Math.round(summary.totalRevenue / 1.12));
      expect(summary.gst!.totalGst).toBe(summary.totalRevenue - summary.gst!.netTaxable);
      expect(summary.gst!.cgst + summary.gst!.sgst).toBe(summary.gst!.totalGst);
      expect(Math.abs(summary.gst!.cgst - summary.gst!.sgst)).toBeLessThanOrEqual(1);
    }
  });

  it('performs daily closing and records discrepancy audit trail', () => {
    const today = new Date().toISOString().split('T')[0];
    const summary = repo.getTodayClosingSummary(today);

    const actualCounted = summary.expectedCashInDrawer + 50; // ₹50 surplus
    const closing = repo.performDailyClosing({
      closingDate: today,
      actualCashCounted: actualCounted,
      notes: 'Night register closing audit with ₹50 surplus coin float',
      closedByName: 'G. Mohan Kumar',
      closedByRole: 'Hotel Manager',
    });

    expect(closing.closing_date).toBe(today);
    expect(closing.actual_cash_counted).toBe(actualCounted);
    expect(closing.expected_cash_in_drawer).toBe(summary.expectedCashInDrawer);
    expect(closing.discrepancy).toBe(50);
    expect(closing.status).toBe('closed');
  });
});
