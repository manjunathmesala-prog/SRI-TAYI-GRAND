import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { getRazorpayClient, inrToPaise } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const { id: paymentId } = await params;

    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'Payment ID is required.' }, { status: 400 });
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const reason = body.reason || 'General refund request';

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid positive refund amount is required.' },
        { status: 400 }
      );
    }

    const payment = repo.getPayments().find((p) => p.id === paymentId);
    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment record not found.' }, { status: 404 });
    }

    // If online payment with Razorpay gateway payment ID, process real gateway refund
    let gatewayRefundId = '';
    const rzpPaymentId = payment.gateway_payment_id || (payment.id.startsWith('pay_') ? payment.id : null);
    if (rzpPaymentId && rzpPaymentId.startsWith('pay_')) {
      try {
        const razorpay = getRazorpayClient();
        const rzpRefund = await razorpay.payments.refund(rzpPaymentId, {
          amount: inrToPaise(amount),
          notes: {
            reason,
            payment_reference: payment.payment_reference,
            hotel: 'SRI TAYI GRAND',
          },
        });
        gatewayRefundId = rzpRefund.id;
      } catch (rzpErr: any) {
        console.error('[RAZORPAY REFUND API ERROR]', rzpErr);
        const errMsg = rzpErr?.error?.description || rzpErr?.message || 'Gateway refund processing error';
        return NextResponse.json({ success: false, error: `Razorpay Refund Failed: ${errMsg}` }, { status: 502 });
      }
    }

    const result = repo.refundPayment(paymentId, amount, reason);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    if (gatewayRefundId && result.payment) {
      result.payment.gateway_refund_id = gatewayRefundId;
    }

    return NextResponse.json({ ...result, gateway_refund_id: gatewayRefundId || undefined });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
