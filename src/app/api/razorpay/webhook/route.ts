import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyWebhookSignature, paiseToInr } from '@/lib/razorpay';
import { sendNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Read Raw Unparsed Body Buffer
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!rawBody || !signature) {
      console.warn('[WEBHOOK SECURITY REJECT] Missing body or x-razorpay-signature header.');
      return NextResponse.json(
        { error: 'Missing raw webhook payload or signature header.' },
        { status: 400 }
      );
    }

    // 2. Cryptographic HMAC-SHA256 Signature Verification
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('[WEBHOOK SECURITY REJECT] Cryptographic webhook signature verification failed.');
      return NextResponse.json(
        { error: 'Webhook cryptographic signature verification failed.' },
        { status: 400 }
      );
    }

    // 3. Parse JSON Event Payload
    let eventPayload: any;
    try {
      eventPayload = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error('[WEBHOOK PAYLOAD ERROR] Malformed JSON received:', parseErr);
      return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }

    const eventName: string = eventPayload.event;
    const entity = eventPayload.payload?.payment?.entity || eventPayload.payload?.order?.entity || {};

    console.log(`[RAZORPAY WEBHOOK RECEIVED] Event: ${eventName}, ID: ${entity.id || 'N/A'}`);

    // 4. Idempotent Event Handlers
    switch (eventName) {
      case 'order.paid': {
        const orderEntity = eventPayload.payload?.order?.entity;
        if (orderEntity && orderEntity.id) {
          const rzpOrderId = orderEntity.id;
          const receipt = orderEntity.receipt;
          
          // Transition order status to PAID
          repo.updatePaymentOrderStatus(rzpOrderId, 'PAID');

          // Backup fulfillment if browser was closed prematurely
          if (receipt) {
            const booking = repo.getBookingByReference(receipt);
            if (booking && booking.payment_status !== 'successful') {
              booking.status = 'confirmed';
              booking.payment_status = 'successful';
              booking.payment_method = 'online';
              booking.paid_amount = booking.total_amount;

              repo.recordPayment({
                booking_reference: booking.booking_reference,
                guest_name: booking.guest_name,
                amount: booking.total_amount,
                currency: 'INR',
                payment_method: 'online',
                gateway_order_id: rzpOrderId,
                status: 'successful',
                paid_at: new Date().toISOString(),
              });

              await sendNotification({
                recipient: booking.guest_email,
                type: 'email',
                template: 'payment_successful_booking_confirmed',
                data: {
                  reference: booking.booking_reference,
                  amount: booking.total_amount,
                  notes: 'Confirmed via asynchronous Razorpay webhook (order.paid)',
                },
              }).catch((e) => console.warn('Non-blocking notification error:', e));
            }
          }
        }
        break;
      }

      case 'payment.captured': {
        const paymentEntity = eventPayload.payload?.payment?.entity;
        if (paymentEntity && paymentEntity.id) {
          const rzpPaymentId = paymentEntity.id;
          const rzpOrderId = paymentEntity.order_id || '';
          const amountPaise = Number(paymentEntity.amount || 0);
          const amountRupees = paiseToInr(amountPaise);
          const feePaise = Number(paymentEntity.fee || 0);
          const taxPaise = Number(paymentEntity.tax || 0);
          const method = String(paymentEntity.method || 'unknown');
          const bank = paymentEntity.bank || undefined;
          const wallet = paymentEntity.wallet || undefined;
          const vpa = paymentEntity.vpa || undefined;
          const bookingRef = paymentEntity.notes?.booking_reference || '';

          // Transition order status to PAID
          if (rzpOrderId) {
            repo.updatePaymentOrderStatus(rzpOrderId, 'PAID');
          }

          // Record or idempotently update transaction ledger
          repo.recordPaymentTransaction({
            booking_reference: bookingRef || rzpOrderId,
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: rzpPaymentId,
            status: 'captured',
            amount_paise: amountPaise,
            amount_rupees: amountRupees,
            currency: paymentEntity.currency || 'INR',
            method,
            bank,
            wallet,
            vpa,
            fee_paise: feePaise,
            tax_paise: taxPaise,
            raw_webhook_payload: rawBody,
          });

          // If booking exists, ensure it is confirmed
          if (bookingRef) {
            const booking = repo.getBookingByReference(bookingRef);
            if (booking && booking.payment_status !== 'successful') {
              booking.status = 'confirmed';
              booking.payment_status = 'successful';
              booking.paid_amount = amountRupees;

              repo.recordPayment({
                booking_reference: booking.booking_reference,
                guest_name: booking.guest_name,
                amount: amountRupees,
                currency: 'INR',
                payment_method: 'online',
                gateway_order_id: rzpOrderId,
                gateway_payment_id: rzpPaymentId,
                status: 'successful',
                paid_at: new Date().toISOString(),
              });
            }
          }
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = eventPayload.payload?.payment?.entity;
        if (paymentEntity && paymentEntity.id) {
          const rzpPaymentId = paymentEntity.id;
          const rzpOrderId = paymentEntity.order_id || '';
          const errorCode = paymentEntity.error_code || 'PAYMENT_FAILED';
          const errorDesc = paymentEntity.error_description || 'Transaction declined by issuer.';
          const bookingRef = paymentEntity.notes?.booking_reference || '';

          if (rzpOrderId) {
            repo.updatePaymentOrderStatus(rzpOrderId, 'FAILED');
          }

          repo.recordPaymentTransaction({
            booking_reference: bookingRef || rzpOrderId,
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: rzpPaymentId,
            status: 'failed',
            amount_paise: Number(paymentEntity.amount || 0),
            amount_rupees: paiseToInr(Number(paymentEntity.amount || 0)),
            currency: paymentEntity.currency || 'INR',
            method: paymentEntity.method,
            error_code: errorCode,
            error_description: errorDesc,
            raw_webhook_payload: rawBody,
          });

          console.warn(`[PAYMENT FAILED] Order: ${rzpOrderId}, Payment: ${rzpPaymentId}, Code: ${errorCode}`);
        }
        break;
      }

      case 'refund.processed': {
        const refundEntity = eventPayload.payload?.refund?.entity;
        const paymentEntity = eventPayload.payload?.payment?.entity;

        if (refundEntity && paymentEntity) {
          const refundAmountRupees = paiseToInr(Number(refundEntity.amount || 0));
          const bookingRef = paymentEntity.notes?.booking_reference || '';

          repo.recordPaymentTransaction({
            booking_reference: bookingRef || paymentEntity.order_id,
            razorpay_order_id: paymentEntity.order_id,
            razorpay_payment_id: refundEntity.id,
            status: 'refunded',
            amount_paise: Number(refundEntity.amount || 0),
            amount_rupees: refundAmountRupees,
            currency: refundEntity.currency || 'INR',
            notes: {
              refund_id: refundEntity.id,
              original_payment_id: paymentEntity.id,
            },
            raw_webhook_payload: rawBody,
          });

          if (bookingRef) {
            const booking = repo.getBookingByReference(bookingRef);
            if (booking) {
              booking.payment_status = 'refunded';
            }
          }
        }
        break;
      }

      default:
        console.log(`[WEBHOOK EVENT UNHANDLED] ${eventName} (Acknowledged)`);
        break;
    }

    // Return immediate HTTP 200 upon successful verification and execution
    return NextResponse.json({ status: 'ok', received: true, event: eventName });
  } catch (err: unknown) {
    console.error('[API /api/razorpay/webhook] Processing Error:', err);
    return NextResponse.json(
      { error: 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}
