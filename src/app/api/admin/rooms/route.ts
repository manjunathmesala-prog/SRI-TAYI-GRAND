import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { OperationalStatus, HousekeepingStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Front Desk',
      'Housekeeping',
      'Receptionist',
      'Accounts',
    ]);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized: Staff session required' },
        { status: 403 }
      );
    }

    const rooms = repo.getRooms();
    return NextResponse.json({
      success: true,
      rooms,
      totalRooms: rooms.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  return handleRoomUpdate(req);
}

export async function POST(req: NextRequest) {
  return handleRoomUpdate(req);
}

async function handleRoomUpdate(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Front Desk',
      'Housekeeping',
    ]);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Access denied' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Accept both camelCase and snake_case parameter formats
    const roomId = body.roomId || body.room_id || body.id;
    const operationalStatus = body.operationalStatus || body.operational_status;
    const housekeepingStatus = body.housekeepingStatus || body.housekeeping_status;
    const notes = body.notes;

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'roomId (or room_id) is required.' },
        { status: 400 }
      );
    }

    const room = repo.getRoomById(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, error: `Room with identifier '${roomId}' was not found.` },
        { status: 404 }
      );
    }

    const targetOpStatus = (operationalStatus as OperationalStatus) || room.operational_status;
    const targetHkStatus = (housekeepingStatus as HousekeepingStatus) || room.housekeeping_status;

    const updatedRoom = repo.updateRoomStatus(
      roomId,
      targetOpStatus,
      targetHkStatus,
      notes,
      auth.session?.name || 'Staff'
    );

    return NextResponse.json({
      success: true,
      message: `Room ${updatedRoom?.room_number} status updated successfully.`,
      room: updatedRoom,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update room' },
      { status: 500 }
    );
  }
}
