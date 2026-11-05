import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

/**
 * Endpoint: GET /api/walk-in/pickup-status?code=TG-8821&ref=TG-W-...
 * Returns live status of a walk-in booking for the customer's pickup pass screen
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || '';
    const ref = searchParams.get('ref') || '';

    const bookings = repo.getBookings();
    const booking = bookings.find(
      (b) =>
        (code && b.pickup_code?.toLowerCase() === code.toLowerCase()) ||
        (ref && b.booking_reference.toLowerCase() === ref.toLowerCase())
    );

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Pickup code or booking reference not found' },
        { status: 404 }
      );
    }

    const isAssigned = !!booking.assigned_room_number;
    const isKeyIssued = !!booking.keycard_issued_at;

    return NextResponse.json({
      success: true,
      booking_reference: booking.booking_reference,
      pickup_code: booking.pickup_code,
      guest_name: booking.guest_name,
      category_name: booking.category_name,
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method,
      total_amount: booking.total_amount,
      paid_amount: booking.paid_amount,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      is_assigned: isAssigned,
      is_key_issued: isKeyIssued,
      assigned_room_number: booking.assigned_room_number,
      keycard_issued_at: booking.keycard_issued_at,
      wifi_ssid: 'SriTayiGrand_Guest',
      wifi_password: 'TayiGrand@2026',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Status poll error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
