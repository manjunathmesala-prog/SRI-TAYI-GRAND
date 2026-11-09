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
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized: Staff session required' }, { status: 403 });
    }

    const rooms = repo.getRooms();
    return NextResponse.json({
      success: true,
      rooms,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch room inventory' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Front Desk',
      'Housekeeping',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { roomId, operationalStatus, housekeepingStatus, notes } = body;

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId is required' }, { status: 400 });
    }

    const updatedRoom = repo.updateRoomStatus(
      roomId,
      operationalStatus as OperationalStatus,
      housekeepingStatus as HousekeepingStatus,
      notes,
      auth.session?.name || 'Staff'
    );

    if (!updatedRoom) {
      return NextResponse.json({ success: false, error: `Room ${roomId} not found` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Room ${updatedRoom.room_number} status updated and synchronized to Supabase cloud.`,
      room: updatedRoom,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update room status' },
      { status: 500 }
    );
  }
}
