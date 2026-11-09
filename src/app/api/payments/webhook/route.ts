import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyWebhookSignature } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    // Strict validation: Cryptographic signature is mandatory on all webhook events
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing webhook signature.' },
        { status: 401 }
      );
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload.' },
        { status: 400 }
      );
    }

    const eventType = event.event;
    const payload = event.payload;

    if (!eventType || !payload) {
      return NextResponse.json(
        { success: false, error: 'Missing event or payload field.' },
        { status: 400 }
      );
    }

    switch (eventType) {
      case 'payment.captured': {
        const paymentEntity = payload.payment?.entity;
        if (!paymentEntity) break;

        const bookingRef =
          paymentEntity.notes?.bookingReference ||
          paymentEntity.notes?.booking_reference ||
          paymentEntity.description;

        const amountInRupees = paymentEntity.amount / 100;

        if (bookingRef) {
          const booking = repo.getBookingByReference(bookingRef);
          if (booking) {
            booking.status = 'confirmed';
            booking.payment_status = 'successful';
            booking.paid_amount = amountInRupees;

            // Idempotently record payment
            const existingPayments = repo.getPayments();
            const alreadyRecorded = existingPayments.some(
              (p) => p.gateway_payment_id === paymentEntity.id
            );

            if (!alreadyRecorded) {
              repo.recordPayment({
                booking_reference: booking.booking_reference,
                guest_name: booking.guest_name,
                amount: amountInRupees,
                currency: paymentEntity.currency || 'INR',
                payment_method: 'online',
                gateway_order_id: paymentEntity.order_id,
                gateway_payment_id: paymentEntity.id,
                status: 'successful',
                paid_at: new Date().toISOString(),
              });
            }
          }
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = payload.payment?.entity;
        if (!paymentEntity) break;

        const bookingRef =
          paymentEntity.notes?.bookingReference ||
          paymentEntity.notes?.booking_reference;

        if (bookingRef) {
          const booking = repo.getBookingByReference(bookingRef);
          if (booking && booking.payment_status !== 'successful') {
            booking.payment_status = 'failed';
          }
        }

        try {
          repo.recordAuditLog({
            action: 'PAYMENT_FAILED_WEBHOOK',
            entityType: 'payment',
            entityId: paymentEntity.id,
            userName: 'Razorpay Webhook',
            details: `Payment failure: ${paymentEntity.error_description || paymentEntity.error_code || 'Unknown error'}`,
          });
        } catch {}
        break;
      }

      case 'refund.processed': {
        const refundEntity = payload.refund?.entity;
        if (!refundEntity) break;

        try {
          repo.recordAuditLog({
            action: 'REFUND_PROCESSED_WEBHOOK',
            entityType: 'payment',
            entityId: refundEntity.payment_id,
            userName: 'Razorpay Webhook',
            details: `Refund processed: ₹${refundEntity.amount / 100} for payment ${refundEntity.payment_id}`,
          });
        } catch {}
        break;
      }

      default:
        // Ignore unhandled events with HTTP 200 acknowledgment
        break;
    }

    return NextResponse.json({ success: true, received: true, event: eventType });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}
