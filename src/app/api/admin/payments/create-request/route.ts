import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const bookingReference = body.bookingReference || body.bookingRef;
    const amount = Number(body.amount);
    const description = body.description || 'Hotel Booking Payment Request';

    if (!bookingReference || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'bookingReference and valid positive amount are required.' },
        { status: 400 }
      );
    }

    const result = repo.createPaymentLink(bookingReference, amount, description);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
