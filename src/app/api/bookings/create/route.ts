import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { checkCategoryAvailability } from '@/lib/booking-engine';
import { createRazorpayOrder } from '@/lib/razorpay';
import { sendNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      categoryId,
      checkIn,
      checkOut,
      adultsCount = 1,
      childrenCount = 0,
      roomsCount = 1,
      guestName,
      guestEmail,
      guestPhone,
      address,
      city,
      specialRequests,
      earlyCheckIn = false,
      lateCheckOut = false,
      paymentMethod = 'online', // 'online' | 'pay_at_hotel'
    } = body;

    // 1. Perimeter Validation
    if (!categoryId || !checkIn || !checkOut || !guestName || !guestPhone || !guestEmail) {
      return NextResponse.json(
        { error: 'Missing required booking parameters' },
        { status: 400 }
      );
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      return NextResponse.json(
        { error: 'Check-out date must be strictly after check-in date' },
        { status: 400 }
      );
    }

    // 2. Server-side Availability & Exact Price Calculation
    const avail = checkCategoryAvailability(
      categoryId,
      checkIn,
      checkOut,
      Number(roomsCount),
      Number(adultsCount),
      Number(childrenCount)
    );
    if (!avail.isAvailable) {
      return NextResponse.json(
        { error: 'Selected room category is not available for these dates or exceeds permitted occupancy' },
        { status: 409 }
      );
    }

    // 3. Create Booking Record
    const isPayAtHotel = paymentMethod === 'pay_at_hotel';
    const booking = repo.createBooking({
      guest_id: 'temp-id',
      guest_name: guestName.trim(),
      guest_phone: guestPhone.trim(),
      guest_email: guestEmail.trim().toLowerCase(),
      check_in_date: checkIn,
      check_out_date: checkOut,
      category_id: avail.category.id,
      category_name: avail.category.name,
      adults_count: Number(adultsCount),
      children_count: Number(childrenCount),
      rooms_count: Number(roomsCount),
      status: isPayAtHotel ? 'confirmed' : 'pending',
      payment_status: isPayAtHotel ? 'pay_at_hotel' : 'pending',
      payment_method: isPayAtHotel ? 'pay_at_hotel' : 'online',
      room_charges_amount: avail.roomCharges,
      extra_persons_count: avail.extraPersonsCount,
      extra_person_charges_amount: avail.extraPersonCharges,
      subtotal_amount: avail.subtotal,
      tax_amount: avail.taxAmount,
      additional_charges_amount: 0,
      total_amount: avail.totalAmount,
      paid_amount: 0,
      special_requests: specialRequests,
      early_check_in_requested: Boolean(earlyCheckIn),
      late_check_out_requested: Boolean(lateCheckOut),
      tariff_source_date: avail.tariffSourceDate,
    });

    // 4. If Online Payment, generate Razorpay Order
    let razorpayOrder = null;
    if (!isPayAtHotel) {
      razorpayOrder = await createRazorpayOrder({
        amount: avail.totalAmount,
        currency: 'INR',
        receipt: booking.booking_reference,
        notes: {
          booking_reference: booking.booking_reference,
          guest_name: guestName,
          category: avail.category.name,
        },
      });
    }

    // 5. Send Notification
    await sendNotification({
      recipient: guestEmail,
      type: 'email',
      template: isPayAtHotel ? 'booking_confirmed' : 'booking_created',
      data: {
        reference: booking.booking_reference,
        hotelName: 'SRI TAYI GRAND',
        total: avail.totalAmount,
      },
    });

    return NextResponse.json({
      success: true,
      bookingReference: booking.booking_reference,
      booking,
      razorpayOrder,
    });
  } catch (err: unknown) {
    console.error('Booking creation error:', err);
    const message = err instanceof Error ? err.message : 'Internal booking error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
