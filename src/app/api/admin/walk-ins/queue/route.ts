import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { loadBookingsFromSupabase } from '@/lib/db/supabase-sync';

/**
 * Endpoint: GET /api/admin/walk-ins/queue
 * Real-time queue of walk-in guests waiting for physical room assignment and keycard encoding
 */
export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const remoteBookings = await loadBookingsFromSupabase();
    if (remoteBookings && remoteBookings.length > 0) {
      remoteBookings.forEach((b) => repo.upsertBooking(b));
    }
    const queue = repo.getWalkInQueue();
    const cleanRooms = repo.getAvailableCleanRooms();
    const allRooms = repo.getRooms();

    // Group clean rooms by category for quick staff selection
    const cleanRoomsByCategory: Record<string, typeof cleanRooms> = {};
    cleanRooms.forEach((r) => {
      if (!cleanRoomsByCategory[r.category_id]) {
        cleanRoomsByCategory[r.category_id] = [];
      }
      cleanRoomsByCategory[r.category_id].push(r);
    });

    return NextResponse.json({
      success: true,
      count: queue.length,
      queue,
      clean_rooms: cleanRooms,
      clean_rooms_by_category: cleanRoomsByCategory,
      total_clean_rooms: cleanRooms.length,
      total_occupied_rooms: allRooms.filter((r) => r.operational_status === 'occupied').length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Walk-in queue fetch error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
