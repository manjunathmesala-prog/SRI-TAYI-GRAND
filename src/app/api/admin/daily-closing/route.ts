import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts', 'Front Desk', 'Receptionist']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    await repo.ensureCashbookLoaded();

    const url = new URL(req.url);
    const dateStr = url.searchParams.get('date') || undefined;

    const summary = repo.getTodayClosingSummary(dateStr);
    const history = repo.getDailyClosings();

    return NextResponse.json({
      success: true,
      summary,
      history,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Accounts, Hotel Manager, Super Admin, or Front Desk Lead can perform Daily Closing
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts', 'Front Desk', 'Receptionist']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const { closingDate, actualCashCounted, notes } = body;

    const targetDate = closingDate || new Date().toISOString().split('T')[0];
    if (actualCashCounted === undefined || isNaN(Number(actualCashCounted)) || Number(actualCashCounted) < 0) {
      return NextResponse.json(
        { success: false, error: 'actualCashCounted is required and must be a non-negative number.' },
        { status: 400 }
      );
    }

    const closedByName = auth.session?.name || 'Accounts Auditor';
    const closedByRole = auth.session?.role || 'Accounts';

    await repo.ensureCashbookLoaded();

    const closing = await repo.performDailyClosing({
      closingDate: targetDate,
      actualCashCounted: Number(actualCashCounted),
      notes: notes || 'Register balanced and closed.',
      closedByName,
      closedByRole,
    });

    return NextResponse.json({
      success: true,
      message: `Daily register closed for ${targetDate}. Drawer discrepancy: ₹${closing.discrepancy}.`,
      closing,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
