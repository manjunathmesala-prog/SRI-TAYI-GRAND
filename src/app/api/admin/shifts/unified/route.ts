import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Front Desk',
      'Receptionist',
      'Accounts',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    await repo.ensureCashbookLoaded();
    await repo.ensureStaffAttendanceLoaded();
    await repo.ensureStaffLoaded();

    const activeShift = repo.getActiveCashShift();
    const allAttendance = repo.getStaffAttendance();
    const activeAttendance = allAttendance.find((a) => Boolean(a.clock_in) && !a.clock_out) || null;

    const balanceData = repo.getCashBalance(activeShift?.id);
    const recentShifts = repo.getCashShifts().slice(0, 10);
    const recentTransactions = repo.getCashTransactions(activeShift?.id).slice(0, 25);

    // Eligible managers for duty (Strictly Hari Achari & Sagar)
    const staff = repo.getStaff();
    const eligibleManagers = staff.filter(
      (s) =>
        s.role === 'Hotel Manager' ||
        s.email.toLowerCase().includes('hari') ||
        s.email.toLowerCase().includes('sagar')
    );

    return NextResponse.json({
      success: true,
      hasActiveShift: Boolean(activeShift),
      activeShift,
      activeAttendance,
      balance: balanceData.currentBalance,
      openingFloat: balanceData.openingFloat,
      totalCashIn: balanceData.totalCashIn,
      totalCashOut: balanceData.totalCashOut,
      expectedClosingCash: balanceData.currentBalance,
      recentShifts,
      recentTransactions,
      eligibleManagers,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Front Desk',
      'Receptionist',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    const actor = auth.session?.name || body.performedBy || 'Duty Manager';

    if (action === 'start_shift') {
      const {
        managerId,
        managerName,
        openingFloat,
        openingDenominations,
        shiftType = 'general',
        notes,
      } = body;

      if (!managerId) {
        return NextResponse.json(
          { success: false, error: 'managerId is required to start a shift.' },
          { status: 400 }
        );
      }

      if (openingFloat === undefined || isNaN(Number(openingFloat)) || Number(openingFloat) < 0) {
        return NextResponse.json(
          { success: false, error: 'A valid non-negative opening float amount is required.' },
          { status: 400 }
        );
      }

      const result = await repo.startUnifiedManagerShift({
        staffId: managerId,
        staffName: managerName,
        openingFloat: Number(openingFloat),
        openingDenominations: openingDenominations || {},
        shiftType,
        notes,
        actor,
      });

      return NextResponse.json({
        success: true,
        message: `Shift #${result.shift.shift_number} successfully started for ${result.attendance.staff_name}. Cash drawer is open with float ₹${result.shift.opening_float}.`,
        shift: result.shift,
        attendance: result.attendance,
      });
    }

    if (action === 'end_shift') {
      const {
        shiftId,
        closingCashCounted,
        closingDenominations,
        handoverNotes,
        discrepancyReason,
      } = body;

      const targetShiftId = shiftId || repo.getActiveCashShift()?.id;
      if (!targetShiftId) {
        return NextResponse.json(
          { success: false, error: 'No active cash shift found to close.' },
          { status: 400 }
        );
      }

      if (closingCashCounted === undefined || isNaN(Number(closingCashCounted)) || Number(closingCashCounted) < 0) {
        return NextResponse.json(
          { success: false, error: 'A valid counted physical cash amount is required.' },
          { status: 400 }
        );
      }

      const result = await repo.endUnifiedManagerShift({
        shiftId: targetShiftId,
        closingCashCounted: Number(closingCashCounted),
        closingDenominations: closingDenominations || {},
        handoverNotes,
        discrepancyReason,
        actor,
      });

      return NextResponse.json({
        success: true,
        message: `Shift #${result.shift.shift_number} closed successfully. Attendance clocked out.`,
        shift: result.shift,
        attendance: result.attendance,
        financials: result.financials,
      });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}. Supported: 'start_shift', 'end_shift'` },
      { status: 400 }
    );
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to process unified shift operation.';
    const isConflict =
      errorMsg.includes('Collision') ||
      errorMsg.includes('already clocked in') ||
      errorMsg.includes('already active') ||
      errorMsg.includes('still open') ||
      errorMsg.includes('idx_single_');

    return NextResponse.json(
      { success: false, error: errorMsg, collision: isConflict },
      { status: isConflict ? 409 : 400 }
    );
  }
}
