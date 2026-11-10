import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

/**
 * Endpoint: GET /api/walk-in/pickup-status?code=TG-8821&ref=TG-W-...
 * Returns live status of a walk-in booking for the customer's pickup pass screen.
 * Formatted to support both Anantha-style camelCase clients and Tayi-style snake_case clients.
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
    const isCheckedIn =
      booking.status === 'checked_in' || !!booking.keycard_issued_at || !!booking.keycard_uid;
    const isPaid =
      booking.payment_status === 'successful' ||
      booking.payment_status === 'paid' ||
      booking.paid_amount >= booking.total_amount;

    return NextResponse.json({
      success: true,
      bookingReference: booking.booking_reference,
      booking_reference: booking.booking_reference,
      pickupCode: booking.pickup_code,
      pickup_code: booking.pickup_code,
      guestName: booking.guest_name,
      guest_name: booking.guest_name,
      guestPhone: booking.guest_phone,
      guest_phone: booking.guest_phone,
      roomTypeName: booking.category_name,
      category_name: booking.category_name,
      assignedRoomNumber: booking.assigned_room_number,
      assigned_room_number: booking.assigned_room_number,
      isKeyHandedOver: isCheckedIn,
      is_key_issued: isCheckedIn,
      is_assigned: isAssigned,
      status: booking.status,
      paymentStatus: isPaid ? 'paid' : 'unpaid',
      payment_status: booking.payment_status,
      paymentMethod: booking.payment_method,
      payment_method: booking.payment_method,
      totalAmountInr: booking.total_amount,
      total_amount: booking.total_amount,
      amountPaidInr: booking.paid_amount,
      paid_amount: booking.paid_amount,
      checkInDate: booking.check_in_date,
      check_in_date: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      check_out_date: booking.check_out_date,
      wifiSsid: 'SriTayiGrand_Guest',
      wifi_ssid: 'SriTayiGrand_Guest',
      wifiPassword: 'TayiGrand@2026',
      wifi_password: 'TayiGrand@2026',
      hotelName: 'Sri Tayi Grand',
      hotelAddress: 'Main Road, Kadiri, Andhra Pradesh 515591',
      hotelPhone: '+91 85002 23344',
      keycard_issued_at: booking.keycard_issued_at,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Status poll error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
