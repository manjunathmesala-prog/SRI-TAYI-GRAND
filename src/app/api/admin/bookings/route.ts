import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { BookingStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Front Desk',
      'Accounts',
      'Receptionist',
      'Housekeeping',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as BookingStatus | 'all' | null;
    const source = searchParams.get('source');
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const date = searchParams.get('date');

    let bookings = repo.getBookings();

    if (status && status !== 'all') {
      bookings = bookings.filter((b) => b.status === status);
    }

    if (source && source !== 'all') {
      bookings = bookings.filter((b) => b.booking_source === source);
    }

    if (date) {
      bookings = bookings.filter((b) => b.check_in_date === date || b.check_out_date === date);
    }

    if (search) {
      bookings = bookings.filter(
        (b) =>
          b.booking_reference.toLowerCase().includes(search) ||
          b.guest_name.toLowerCase().includes(search) ||
          b.guest_phone.toLowerCase().includes(search) ||
          (b.assigned_room_number && b.assigned_room_number.includes(search))
      );
    }

    const totalCount = bookings.length;
    const checkedInCount = bookings.filter((b) => b.status === 'checked_in').length;
    const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;

    return NextResponse.json({
      success: true,
      bookings,
      metrics: {
        totalCount,
        checkedInCount,
        confirmedCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const staffName = auth.session?.name || body.staffName || 'Front Desk Staff';

    const newBooking = repo.createBooking(body, staffName);

    return NextResponse.json({
      success: true,
      booking: newBooking,
      message: `Booking ${newBooking.booking_reference} registered successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to create booking' }, { status: 400 });
  }
}
