import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { ShiftType } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Accounts',
      'Front Desk',
      'Receptionist',
      'Housekeeping',
      'Event Manager',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    await repo.ensureStaffAttendanceLoaded();
    const attendance = repo.getStaffAttendance(date);
    const staff = repo.getStaff();

    // Compute metrics
    const totalStaff = staff.length;
    const onDutyCount = attendance.filter((a) => a.clock_in && !a.clock_out).length;
    const morningShiftCount = attendance.filter((a) => a.shift === 'morning').length;
    const eveningShiftCount = attendance.filter((a) => a.shift === 'evening').length;
    const nightShiftCount = attendance.filter((a) => a.shift === 'night').length;
    const generalShiftCount = attendance.filter((a) => a.shift === 'general').length;

    return NextResponse.json({
      success: true,
      date,
      attendance,
      staff,
      stats: {
        totalStaff,
        onDutyCount,
        morningShiftCount,
        eveningShiftCount,
        nightShiftCount,
        generalShiftCount,
      },
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
      'Accounts',
      'Front Desk',
      'Receptionist',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action;
    const actor = body.actor || auth.session?.name || 'Duty Manager';

    if (action === 'clock_in') {
      const { staffId, shift = 'general', notes } = body;
      if (!staffId) {
        return NextResponse.json(
          { success: false, error: 'staffId is required to clock in.' },
          { status: 400 }
        );
      }

      const attendance = await repo.clockInStaff(
        {
          staffId,
          shift: shift as ShiftType,
          notes,
        },
        actor
      );

      return NextResponse.json({
        success: true,
        attendance,
        message: `${attendance.staff_name} successfully clocked in for ${attendance.shift} shift.`,
      });
    }

    if (action === 'clock_out') {
      const { attendanceId } = body;
      if (!attendanceId) {
        return NextResponse.json(
          { success: false, error: 'attendanceId is required to clock out.' },
          { status: 400 }
        );
      }

      const attendance = await repo.clockOutStaff(attendanceId, actor);

      return NextResponse.json({
        success: true,
        attendance,
        message: `${attendance.staff_name} clocked out (${attendance.work_hours || 0} hours worked).`,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
