import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { HousekeepingStatus, HousekeepingTurnaroundChecklist } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Housekeeping']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    await repo.ensureRoomsLoaded();
    const rooms = repo.getRooms();
    const allStaff = repo.getStaff();
    const housekeepingStaff = allStaff.filter(
      (s) => s.is_active && (s.role === 'Housekeeping' || s.department?.toLowerCase().includes('housekeeping'))
    );

    return NextResponse.json({
      success: true,
      rooms,
      housekeepingStaff: housekeepingStaff.length > 0 ? housekeepingStaff : allStaff.filter(s => s.is_active),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Housekeeping']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const { action, roomId } = body;

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId is required.' }, { status: 400 });
    }

    if (action === 'assign_housekeeper') {
      const { staffId, staffName } = body;
      if (!staffId || !staffName) {
        return NextResponse.json(
          { success: false, error: 'staffId and staffName are required.' },
          { status: 400 }
        );
      }

      const ok = repo.assignHousekeeper(roomId, staffId, staffName);
      if (!ok) {
        return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: `Assigned ${staffName} to Room ${roomId}` });
    }

    if (action === 'complete_turnaround') {
      const { checklist, inspectedBy } = body as {
        checklist: HousekeepingTurnaroundChecklist;
        inspectedBy?: string;
      };

      if (!checklist) {
        return NextResponse.json({ success: false, error: 'Inspection checklist is required.' }, { status: 400 });
      }

      // Enforce: room cannot be marked clean without passing the inspection checklist
      const isComplete =
        checklist.linen_changed &&
        checklist.towels_replaced &&
        checklist.bathroom_sanitized &&
        checklist.toiletries_restocked &&
        checklist.ac_geyser_checked &&
        checklist.dustbin_emptied &&
        checklist.floor_mopped;

      if (!isComplete) {
        return NextResponse.json(
          { success: false, error: 'All 5 turnaround inspection checklist items must be verified before certifying clean.' },
          { status: 400 }
        );
      }

      const inspector = inspectedBy || auth.session?.name || 'G. Mohan Kumar (Hotel Manager)';
      const ok = repo.completeHousekeepingTurnaround(roomId, checklist, inspector);
      if (!ok) {
        return NextResponse.json({ success: false, error: 'Failed to complete turnaround. Room not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `Turnaround inspection passed for Room ${roomId}`,
      });
    }

    if (action === 'update_status') {
      const { housekeepingStatus, operationalStatus } = body;
      const room = repo.getRoomById(roomId);
      const newOpStatus = operationalStatus || room?.operational_status || 'available';
      const updated = repo.updateRoomStatus(
        roomId,
        newOpStatus,
        housekeepingStatus as HousekeepingStatus,
        undefined,
        auth.session?.name || 'Housekeeping Admin'
      );
      return NextResponse.json({ success: !!updated, room: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid action provided.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
