import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const result = repo.reconcilePayments();

    return NextResponse.json({
      success: true,
      message: `Successfully reconciled ${result.reconciled_count} payments totalling ₹${result.total_amount.toLocaleString('en-IN')}`,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const payments = repo.getPayments();
    const reconciledPayments = payments.filter((p) => p.reconciled);
    const unreconciledPayments = payments.filter((p) => !p.reconciled && p.status === 'successful');
    const totalReconciledAmount = reconciledPayments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      success: true,
      reconciledCount: reconciledPayments.length,
      unreconciledCount: unreconciledPayments.length,
      totalReconciledAmount,
      payments,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
