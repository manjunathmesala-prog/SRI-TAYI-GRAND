import { NextResponse } from 'next/server';
import { getRazorpayClient } from '@/lib/razorpay';
import { repo } from '@/lib/db/repository';

export async function POST(request: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Perimeter Authentication check
    if (!keyId || !keySecret || keyId === 'rzp_test_placeholder') {
      return NextResponse.json(
        {
          success: false,
          error: 'Razorpay authentication failed: missing or unconfigured API credentials.',
        },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body.' },
        { status: 400 }
      );
    }

    const rawAmount = body.amount ?? body.amountInPaise;
    const currency = body.currency || 'INR';
    const receipt = (body.receipt || body.bookingReference || `rcpt_${Date.now()}`).substring(0, 40);
    const notes = body.notes || {};

    // Validate amount
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount)) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount. Numeric amount in paise is required.' },
        { status: 400 }
      );
    }

    // Minimum order amount: 100 paise (₹1.00)
    if (amount < 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order amount must be at least 100 paise (₹1.00).',
        },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(amount);

    // Call Razorpay API
    let razorpayOrder: any;
    try {
      const razorpay = getRazorpayClient();
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt,
        notes: {
          hotel: 'SRI TAYI GRAND',
          ...notes,
        },
      });
    } catch (apiErr: any) {
      console.error('[API /api/create-order] Razorpay API Error:', apiErr);
      const statusCode = apiErr?.statusCode === 401 ? 401 : 500;
      const errorMsg = apiErr?.error?.description || apiErr?.message || 'Failed to create order with Razorpay';
      return NextResponse.json({ success: false, error: errorMsg }, { status: statusCode });
    }

    // Record order in system repository ledger if available
    try {
      repo.createPaymentOrder({
        booking_reference: receipt,
        guest_name: notes.customer_name || 'Guest',
        guest_email: notes.customer_email || '',
        guest_phone: notes.customer_phone || '',
        amount_paise: razorpayOrder.amount,
        amount_rupees: razorpayOrder.amount / 100,
        currency: razorpayOrder.currency,
        status: 'PENDING',
        razorpay_order_id: razorpayOrder.id,
        receipt: razorpayOrder.receipt,
        notes: notes || {},
      });
    } catch (repoErr) {
      // Non-blocking ledger recording
      console.warn('[API /api/create-order] Repository record warning:', repoErr);
    }

    return NextResponse.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      key_id: keyId,
    });
  } catch (err: unknown) {
    console.error('[API /api/create-order] Internal Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error creating order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
