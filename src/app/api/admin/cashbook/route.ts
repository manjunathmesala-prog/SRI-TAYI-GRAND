import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts', 'Receptionist']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const shiftId = searchParams.get('shiftId') || undefined;

    const balanceData = repo.getCashBalance(shiftId);
    const shifts = repo.getCashShifts();
    const transactions = repo.getCashTransactions(shiftId);

    return NextResponse.json({
      success: true,
      activeShift: balanceData.activeShift,
      balance: balanceData.currentBalance,
      openingFloat: balanceData.openingFloat,
      totalCashIn: balanceData.totalCashIn,
      totalCashOut: balanceData.totalCashOut,
      shifts,
      transactions,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts', 'Receptionist']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    const staffName = auth.session?.name || body.performedBy || 'Front Desk Staff';
    const staffId = auth.session?.userId || 'stf-current';

    if (action === 'open_shift') {
      const { openingFloat, notes } = body;
      const shift = repo.openCashShift(
        {
          cashierId: staffId,
          cashierName: staffName,
          openingFloat: Number(openingFloat) || 0,
          notes,
        },
        staffName
      );
      return NextResponse.json({
        success: true,
        message: `Cash drawer shift #${shift.shift_number} successfully opened.`,
        shift,
      });
    }

    if (action === 'close_shift') {
      const { shiftId, closingCashCounted, notes } = body;
      if (!shiftId || closingCashCounted === undefined) {
        return NextResponse.json(
          { success: false, error: 'shiftId and closingCashCounted are required.' },
          { status: 400 }
        );
      }
      const shift = repo.closeCashShift(
        {
          shiftId,
          closingCashCounted: Number(closingCashCounted),
          notes,
          closedByName: staffName,
        },
        staffName
      );
      return NextResponse.json({
        success: true,
        message: `Shift #${shift.shift_number} closed with discrepancy ₹${shift.discrepancy}.`,
        shift,
      });
    }

    if (action === 'record_transaction') {
      const { type, category, amount, reason, bookingReference, receiptRef, shiftId } = body;
      if (!type || !amount || Number(amount) <= 0 || !reason) {
        return NextResponse.json(
          { success: false, error: 'type (cash_in/cash_out), positive amount, and reason are required.' },
          { status: 400 }
        );
      }

      const tx = repo.recordCashTransaction(
        {
          shift_id: shiftId,
          type,
          category: category || 'other',
          amount: Number(amount),
          reason,
          booking_reference: bookingReference,
          receipt_ref: receiptRef,
          performed_by: staffName,
        },
        staffName
      );

      return NextResponse.json({
        success: true,
        message: `Cash ${type === 'cash_in' ? 'receipt' : 'payout'} of ₹${tx.amount} recorded.`,
        transaction: tx,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Supported: open_shift, close_shift, record_transaction' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
