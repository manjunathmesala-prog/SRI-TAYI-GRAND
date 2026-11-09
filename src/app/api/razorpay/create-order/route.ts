import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { checkCategoryAvailability } from '@/lib/booking-engine';
import { createRazorpayOrder, inrToPaise } from '@/lib/razorpay';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  try {
    // 1. Anti-Abuse Rate Limiter (Max 15 order creation requests per 5 minutes per IP)
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`rzp-create-order:${clientIp}`, 15, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many payment requests. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds || 30) } }
      );
    }

    const body = await request.json();
    const {
      bookingReference,
      categoryId,
      checkIn,
      checkOut,
      roomsCount = 1,
      adultsCount = 1,
      childrenCount = 0,
      guestName,
      guestEmail,
      guestPhone,
    } = body;

    let targetBookingReference = bookingReference;
    let totalRupees = 0;
    let customerName = guestName || '';
    let customerEmail = guestEmail || '';
    let customerPhone = guestPhone || '';
    let roomCategoryName = '';

    // ZERO FINANCIAL LEAKAGE: Calculate total amount exclusively on the server
    if (bookingReference) {
      const existingBooking = repo.getBookingByReference(bookingReference);
      if (!existingBooking) {
        return NextResponse.json(
          { error: `Booking reference ${bookingReference} not found` },
          { status: 404 }
        );
      }
      totalRupees = existingBooking.total_amount;
      customerName = existingBooking.guest_name;
      customerEmail = existingBooking.guest_email;
      customerPhone = existingBooking.guest_phone;
      roomCategoryName = existingBooking.category_name;
    } else {
      if (!categoryId || !checkIn || !checkOut) {
        return NextResponse.json(
          { error: 'Missing required parameters: categoryId, checkIn, and checkOut are required.' },
          { status: 400 }
        );
      }

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
          { error: 'Selected room category is not available for requested dates.' },
          { status: 409 }
        );
      }

      totalRupees = avail.totalAmount;
      roomCategoryName = avail.category.name;
      targetBookingReference = `STG-TMP-${Date.now().toString().slice(-6)}`;
    }

    if (totalRupees <= 0) {
      return NextResponse.json(
        { error: 'Invalid order amount calculated on server.' },
        { status: 400 }
      );
    }

    // 2. Create authoritative order with Razorpay
    const razorpayOrder = await createRazorpayOrder({
      amount: totalRupees,
      currency: 'INR',
      receipt: targetBookingReference,
      notes: {
        booking_reference: targetBookingReference,
        customer_name: customerName,
        category: roomCategoryName,
        hotel: 'SRI TAYI GRAND',
      },
    });

    // 3. Persist Order in Database Ledger with PENDING status
    const orderRecord = repo.createPaymentOrder({
      booking_reference: targetBookingReference,
      guest_name: customerName,
      guest_email: customerEmail,
      guest_phone: customerPhone,
      amount_paise: razorpayOrder.amount,
      amount_rupees: totalRupees,
      currency: razorpayOrder.currency,
      status: 'PENDING',
      razorpay_order_id: razorpayOrder.id,
      receipt: razorpayOrder.receipt,
      notes: {
        booking_reference: targetBookingReference,
        category: roomCategoryName,
      },
    });

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      currency: razorpayOrder.currency,
      amount: razorpayOrder.amount, // in paise
      amountRupees: totalRupees,
      keyId,
      receipt: razorpayOrder.receipt,
      ledgerOrderId: orderRecord.id,
    });
  } catch (err: unknown) {
    console.error('[API /api/razorpay/create-order] Error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create Razorpay order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
