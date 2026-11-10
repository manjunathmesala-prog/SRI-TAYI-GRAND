import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Front Desk',
      'Receptionist',
      'Accounts',
      'Housekeeping',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    let bookings = repo.getBookings();

    if (status && status !== 'all') {
      bookings = bookings.filter((b) => b.status === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      bookings = bookings.filter(
        (b) =>
          b.booking_reference.toLowerCase().includes(q) ||
          b.guest_name.toLowerCase().includes(q) ||
          b.guest_phone.includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      reservations: bookings,
      bookings,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
