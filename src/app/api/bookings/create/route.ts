import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { notifySuperAdmin } from '@/lib/notifications/engine';
import { checkCategoryAvailability } from '@/lib/booking-engine';
import { createRazorpayOrder } from '@/lib/razorpay';
import { sendNotification } from '@/lib/notifications';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  try {
    // 0. Anti-Abuse Rate Limiter (Max 12 booking creation requests per 5 minutes per IP)
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`booking-create:${clientIp}`, 12, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many booking requests. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds || 30) } }
      );
    }

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

    // 2.1 Enforce Online vs Walk-In Only perimeter check
    if (avail.category.walk_in_only) {
      return NextResponse.json(
        { error: `${avail.category.name} is reserved strictly for front-desk walk-in reservations and cannot be booked online.` },
        { status: 403 }
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

      // Persist in authoritative PaymentOrder ledger with status PENDING
      repo.createPaymentOrder({
        booking_reference: booking.booking_reference,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        amount_paise: razorpayOrder.amount,
        amount_rupees: avail.totalAmount,
        currency: razorpayOrder.currency,
        status: 'PENDING',
        razorpay_order_id: razorpayOrder.id,
        receipt: razorpayOrder.receipt,
        notes: {
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

    notifySuperAdmin({
      eventType: 'EVENT_NEW_BOOKING',
      payload: {
        bookingReference: booking.booking_reference,
        customerName: booking.guest_name,
        roomCategory: booking.category_name,
        roomsCount: booking.rooms_count,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        totalAmount: booking.total_amount,
        source: 'online',
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
