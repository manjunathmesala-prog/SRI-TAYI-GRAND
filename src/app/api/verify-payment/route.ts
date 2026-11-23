import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { repo } from '@/lib/db/repository';

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body.' },
        { status: 400 }
      );
    }

    // Accept both standard Razorpay parameter names and camelCase variants
    const orderId = body.razorpay_order_id || body.order_id || body.orderId;
    const paymentId = body.razorpay_payment_id || body.payment_id || body.paymentId;
    const signature = body.razorpay_signature || body.signature;
    const bookingReference = body.booking_reference || body.bookingReference;

    // 1. Perimeter Validation: Missing fields -> return 400
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: order_id, payment_id, and signature are required.',
        },
        { status: 400 }
      );
    }

    // 2. Fetch Secret
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('[SECURITY ERROR] RAZORPAY_KEY_SECRET is not configured.');
      return NextResponse.json(
        { success: false, error: 'Payment gateway configuration error.' },
        { status: 500 }
      );
    }

    // 3. Cryptographic HMAC-SHA256 Timing-Safe Verification
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');

    const isMatch =
      expectedBuf.length === signatureBuf.length &&
      crypto.timingSafeEqual(expectedBuf, signatureBuf);

    if (!isMatch) {
      console.warn(`[SECURITY ALERT] Razorpay payment signature mismatch for order ${orderId}, payment ${paymentId}`);

      // DO NOT mark as paid. Mark as failed in ledger if order exists
      try {
        repo.updatePaymentOrderStatus(orderId, 'FAILED');
      } catch {}

      return NextResponse.json(
        {
          success: false,
          error: 'Signature verification failed. Signatures do not match.',
        },
        { status: 400 }
      );
    }

    // 4. Mark Order as PAID in database ledger
    try {
      repo.updatePaymentOrderStatus(orderId, 'PAID');
    } catch (repoErr) {
      console.warn('[API /api/verify-payment] Ledger update warning:', repoErr);
    }

    // 5. Update Booking if booking reference is associated
    if (bookingReference) {
      try {
        const booking = repo.getBookingByReference(bookingReference);
        if (booking) {
          booking.status = 'confirmed';
          booking.payment_status = 'successful';
          booking.payment_method = 'online';
        }
      } catch (bkErr) {
        console.warn('[API /api/verify-payment] Booking update warning:', bkErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully.',
      order_id: orderId,
      payment_id: paymentId,
      signature_valid: true,
    });
  } catch (err: unknown) {
    console.error('[API /api/verify-payment] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal error verifying payment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
