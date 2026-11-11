import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { PaymentMethod, PaymentStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts', 'Front Desk']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const payments = repo.getPayments();

    const totalReceived = payments
      .filter((p) => p.status === 'successful')
      .reduce((sum, p) => sum + p.amount, 0);

    const reconciledCount = payments.filter((p) => p.reconciled).length;
    const pendingCount = payments.filter((p) => p.status === 'pending' || !p.reconciled).length;
    const totalRefunded = payments.reduce((sum, p) => sum + (p.refund_amount || 0), 0);

    return NextResponse.json({
      success: true,
      payments,
      metrics: {
        totalReceived,
        reconciledCount,
        pendingCount,
        totalRefunded,
        totalCount: payments.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts', 'Front Desk']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const { bookingReference, guestName, amount, paymentMethod, status } = body;

    if (!bookingReference || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'bookingReference and valid positive amount are required.' },
        { status: 400 }
      );
    }

    const actor = auth.session?.name || body.staffName || 'Accounts Admin';

    const newPayment = await repo.recordPayment(
      {
        booking_reference: bookingReference,
        guest_name: guestName || 'Walk-in / Direct Guest',
        amount: Number(amount),
        currency: 'INR',
        payment_method: (paymentMethod || 'cash') as PaymentMethod,
        status: (status || 'successful') as PaymentStatus,
        paid_at: new Date().toISOString(),
      },
      actor
    );

    return NextResponse.json({
      success: true,
      payment: newPayment,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
