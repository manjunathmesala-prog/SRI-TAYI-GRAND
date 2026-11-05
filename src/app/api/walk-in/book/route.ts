import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

/**
 * Endpoint: POST /api/walk-in/book
 * Customer self-service walk-in booking endpoint triggered upon scanning the reception QR code
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      token,
      categoryId,
      category_id,
      guestName,
      guest_name,
      guestPhone,
      guest_phone,
      guestEmail,
      guest_email,
      idProofType,
      id_proof_type,
      idProofNumber,
      id_proof_number,
      numberOfNights,
      number_of_nights,
      paymentMethod,
      payment_method,
      specialRequests,
      special_requests,
    } = body;

    const walkInToken = token || '';
    if (!repo.verifyKioskToken(walkInToken)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid or missing reception kiosk token. Please scan the QR code at reception.',
        },
        { status: 403 }
      );
    }

    const name = (guestName || guest_name || '').trim();
    const phone = (guestPhone || guest_phone || '').trim();
    const catId = categoryId || category_id;

    if (!name || !phone || !catId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required booking fields: guest name, phone number, and room category are required.',
        },
        { status: 400 }
      );
    }

    const payMethod = paymentMethod || payment_method || 'pay_at_hotel';
    const nights = parseInt(String(numberOfNights || number_of_nights || '1'), 10);

    const booking = repo.createWalkInBooking({
      categoryId: catId,
      guestName: name,
      guestPhone: phone,
      guestEmail: guestEmail || guest_email,
      idProofType: idProofType || id_proof_type,
      idProofNumber: idProofNumber || id_proof_number,
      numberOfNights: isNaN(nights) || nights < 1 ? 1 : nights,
      paymentMethod: payMethod,
      walkInToken,
      specialRequests: specialRequests || special_requests,
    });

    return NextResponse.json({
      success: true,
      booking_reference: booking.booking_reference,
      pickup_code: booking.pickup_code,
      guest_name: booking.guest_name,
      category_name: booking.category_name,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      total_amount: booking.total_amount,
      payment_status: booking.payment_status,
      message: 'Walk-in booking created successfully! Please proceed to the front desk to collect your keycard.',
      booking,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Walk-in booking creation error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
