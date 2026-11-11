import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyPaymentSignature, inrToPaise } from '@/lib/razorpay';
import { sendNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const orderId = body.orderId || body.razorpay_order_id || body.razorpayOrderId;
    const paymentId = body.paymentId || body.razorpay_payment_id || body.razorpayPaymentId;
    const signature = body.signature || body.razorpay_signature || body.razorpaySignature;
    const bookingReference = body.bookingReference || body.booking_reference;

    // 1. Perimeter Validation
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required credentials: orderId, paymentId, and signature are required for verification.',
        },
        { status: 400 }
      );
    }

    // 2. Cryptographic HMAC-SHA256 Timing-Safe Verification
    const isValid = verifyPaymentSignature(orderId, paymentId, signature);

    if (!isValid) {
      console.warn(`[SECURITY ALERT] Invalid Razorpay payment signature received for order ${orderId}, payment ${paymentId}`);
      
      // Update order status to FAILED in ledger
      repo.updatePaymentOrderStatus(orderId, 'FAILED');

      // Record failed transaction attempt
      repo.recordPaymentTransaction({
        booking_reference: bookingReference || orderId,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        status: 'failed',
        amount_paise: 0,
        amount_rupees: 0,
        currency: 'INR',
        error_code: 'SIGNATURE_VERIFICATION_FAILED',
        error_description: 'Cryptographic HMAC-SHA256 signature did not match server expectation.',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Payment signature verification failed. Fraud attempt logged.',
        },
        { status: 400 }
      );
    }

    // 3. Update Order Status in Database Ledger: PENDING -> PAID
    const orderRecord = repo.updatePaymentOrderStatus(orderId, 'PAID');

    // 4. Update Booking if bookingReference provided
    let booking = null;
    let amountRupees = orderRecord?.amount_rupees || 0;
    let guestEmail = orderRecord?.guest_email || '';

    if (bookingReference) {
      booking = repo.getBookingByReference(bookingReference);
      if (booking) {
        amountRupees = booking.total_amount;
        guestEmail = booking.guest_email;
        booking.status = 'confirmed';
        booking.payment_status = 'successful';
        booking.payment_method = 'online';
      }
    }

    // 5. Record Payment Ledger & Transaction Entry
    const amountPaise = inrToPaise(amountRupees);

    const transaction = repo.recordPaymentTransaction({
      order_id: orderRecord?.id,
      booking_reference: bookingReference || orderId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      status: 'captured',
      amount_paise: amountPaise,
      amount_rupees: amountRupees,
      currency: 'INR',
      method: body.method || 'online',
    });

    const paymentRecord = await repo.recordPayment({
      booking_reference: bookingReference || orderId,
      guest_name: booking?.guest_name || orderRecord?.guest_name || 'Online Guest',
      amount: amountRupees,
      currency: 'INR',
      payment_method: 'online',
      gateway_order_id: orderId,
      gateway_payment_id: paymentId,
      status: 'successful',
      paid_at: new Date().toISOString(),
    });

    // 6. Asynchronous Notification dispatch
    if (guestEmail && bookingReference) {
      await sendNotification({
        recipient: guestEmail,
        type: 'email',
        template: 'payment_successful_booking_confirmed',
        data: {
          reference: bookingReference,
          amount: amountRupees,
          paymentId,
        },
      }).catch((notifErr) => console.warn('Non-blocking notification error:', notifErr));
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and transaction ledger recorded successfully.',
      bookingReference: bookingReference || orderId,
      paymentId,
      orderId,
      transactionId: transaction.id,
      paymentReference: paymentRecord.payment_reference,
    });
  } catch (err: unknown) {
    console.error('[API /api/razorpay/verify-payment] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal payment verification error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
