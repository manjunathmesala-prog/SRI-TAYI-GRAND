import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { notifySuperAdmin } from '@/lib/notifications/engine';
import { verifyPaymentSignature, inrToPaise } from '@/lib/razorpay';
import { sendNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const booking = repo.getBookingByReference(reference);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching booking' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      bookingReference,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = body;

    if (!bookingReference || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Missing payment verification credentials: order ID, payment ID, and cryptographic signature are required.' },
        { status: 400 }
      );
    }

    const booking = repo.getBookingByReference(bookingReference);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking reference not found' },
        { status: 404 }
      );
    }

    // Server-side HMAC SHA256 Signature Verification
    const isValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      repo.updatePaymentOrderStatus(razorpayOrderId, 'FAILED');
      repo.recordPaymentTransaction({
        booking_reference: bookingReference,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: 'failed',
        amount_paise: inrToPaise(booking.total_amount),
        amount_rupees: booking.total_amount,
        currency: 'INR',
        error_code: 'SIGNATURE_VERIFICATION_FAILED',
        error_description: 'Cryptographic signature mismatch during verification',
      });

      return NextResponse.json(
        { error: 'Invalid payment signature. Verification failed.' },
        { status: 400 }
      );
    }

    // Transactionally update booking
    booking.status = 'confirmed';
    booking.payment_status = 'successful';
    repo.updateBookingStatus(bookingReference, 'confirmed');

    // Update PaymentOrder in ledger
    repo.updatePaymentOrderStatus(razorpayOrderId, 'PAID');

    // Record PaymentTransaction
    repo.recordPaymentTransaction({
      booking_reference: booking.booking_reference,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      status: 'captured',
      amount_paise: inrToPaise(booking.total_amount),
      amount_rupees: booking.total_amount,
      currency: 'INR',
      method: 'online',
    });

    // Record payment ledger entry
    repo.recordPayment({
      booking_reference: booking.booking_reference,
      guest_name: booking.guest_name,
      amount: booking.total_amount,
      currency: 'INR',
      payment_method: 'online',
      gateway_order_id: razorpayOrderId,
      gateway_payment_id: razorpayPaymentId,
      status: 'successful',
      paid_at: new Date().toISOString(),
    });

    // Non-blocking Super Admin payment alert
    notifySuperAdmin({
      eventType: 'EVENT_TRANSACTION',
      payload: {
        transactionId: razorpayPaymentId,
        amount: booking.total_amount,
        currency: 'INR',
        method: 'upi',
        payerName: booking.guest_name,
        bookingReference: booking.booking_reference,
        status: 'captured',
      },
    });

    // Send confirmation notification
    await sendNotification({
      recipient: booking.guest_email,
      type: 'email',
      template: 'payment_successful_booking_confirmed',
      data: {
        reference: booking.booking_reference,
        amount: booking.total_amount,
        paymentId: razorpayPaymentId,
      },
    });

    return NextResponse.json({
      success: true,
      bookingReference: booking.booking_reference,
      status: 'confirmed',
    });
  } catch (err: unknown) {
    console.error('Payment verification error:', err);
    const message = err instanceof Error ? err.message : 'Payment verification error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
