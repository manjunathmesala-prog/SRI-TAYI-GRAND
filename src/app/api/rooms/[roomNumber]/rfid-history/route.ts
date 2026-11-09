import { NextResponse } from 'next/server';
import { getRfidTapsForRoomAndStay } from '@/lib/rfid/tap-logger';

/**
 * STAY-BASED RFID TAP HISTORY AGGREGATION API
 * Endpoint: GET /api/rooms/[roomNumber]/rfid-history?bookingId=...
 *
 * Query taps strictly between customer Check-in time and Check-out time.
 * Calculates Summary Metrics: Total Taps, First Entry Time, Last Tapped Time.
 * Provides Universal Card Support (Guest, Housekeeping, Master Override).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomNumber: string }> }
) {
  try {
    const { roomNumber } = await params;
    const { searchParams } = new URL(request.url);

    const bookingId = searchParams.get('bookingId') || searchParams.get('booking_id') || undefined;
    const checkInTime = searchParams.get('checkInTime') || searchParams.get('check_in_time') || undefined;
    const checkOutTime = searchParams.get('checkOutTime') || searchParams.get('check_out_time') || undefined;

    if (!roomNumber) {
      return NextResponse.json(
        { success: false, error: 'Room number is required' },
        { status: 400 }
      );
    }

    const data = getRfidTapsForRoomAndStay(roomNumber, {
      bookingId,
      checkInTime,
      checkOutTime,
    });

    return NextResponse.json({
      success: true,
      roomNumber: data.roomNumber,
      booking: data.booking
        ? {
            id: data.booking.id,
            booking_reference: data.booking.booking_reference,
            guest_name: data.booking.guest_name,
            guest_phone: data.booking.guest_phone,
            check_in_date: data.booking.check_in_date,
            check_out_date: data.booking.check_out_date,
            checked_in_at: data.booking.checked_in_at,
            checked_out_at: data.booking.checked_out_at,
            status: data.booking.status,
          }
        : null,
      metrics: data.metrics,
      totalTaps: data.metrics.totalTaps,
      firstEntryTime: data.metrics.firstEntryTime,
      lastTappedTime: data.metrics.lastTappedTime,
      taps: data.taps,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query room RFID tap history';
    console.error('[API /api/rooms/:roomNumber/rfid-history ERROR]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
