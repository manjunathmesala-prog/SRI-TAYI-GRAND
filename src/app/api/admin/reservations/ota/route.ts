import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { notifySuperAdmin } from '@/lib/notifications/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Front Desk',
      'Receptionist',
      'Accounts',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized: Staff session required' }, { status: 403 });
    }

    const body = await req.json();

    if (!body.channelId) {
      return NextResponse.json({ success: false, error: 'Aggregator channel selection is required.' }, { status: 400 });
    }

    if (!body.otaBookingReference || !body.otaBookingReference.trim()) {
      return NextResponse.json({ success: false, error: 'OTA Booking Voucher Reference ID is required.' }, { status: 400 });
    }

    if (!body.guestName || !body.guestName.trim()) {
      return NextResponse.json({ success: false, error: 'Guest Full Name is required.' }, { status: 400 });
    }

    if (!body.guestPhone || !body.guestPhone.trim()) {
      return NextResponse.json({ success: false, error: 'Guest Contact Phone Number is required.' }, { status: 400 });
    }

    if (!body.checkInDate || !body.checkOutDate) {
      return NextResponse.json({ success: false, error: 'Check-in and check-out dates are required.' }, { status: 400 });
    }

    const totalAmount = Number(body.totalAmountInr);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid total booking amount is required.' }, { status: 400 });
    }

    const staffName = auth.session?.name || 'Front Desk Duty Officer';

    // Deduplication check
    const existing = repo.getBookings().find(
      (b) =>
        b.booking_reference === body.otaBookingReference.trim() ||
        (b.internal_notes && b.internal_notes.includes(body.otaBookingReference.trim()))
    );

    if (existing) {
      return NextResponse.json({
        success: true,
        reservation: existing,
        isExisting: true,
        message: 'This OTA booking voucher was already recorded previously in PMS.',
      });
    }

    // Resolve category
    const categories = repo.getCategories();
    const targetCat =
      categories.find((c) => c.id === body.roomTypeId || c.slug === body.roomTypeId) ||
      categories[0];

    const isPrepaid = body.paymentCollectionType === 'prepaid_by_ota';
    const subtotal = Math.round(totalAmount / 1.12);
    const tax = totalAmount - subtotal;

    const newBooking = repo.createBooking(
      {
        guest_id: `guest_${Date.now()}`,
        guest_name: body.guestName.trim(),
        guest_phone: body.guestPhone.trim(),
        guest_email: body.guestEmail?.trim() || '',
        check_in_date: body.checkInDate,
        check_out_date: body.checkOutDate,
        category_id: targetCat ? targetCat.id : 'cat_deluxe',
        category_name: targetCat ? targetCat.name : 'Deluxe Room',
        adults_count: Number(body.numAdults || 2),
        children_count: Number(body.numChildren || 0),
        rooms_count: 1,
        status: body.instantCheckIn ? 'checked_in' : 'confirmed',
        payment_status: isPrepaid ? 'successful' : 'pay_at_hotel',
        payment_method: isPrepaid ? 'bank_transfer' : 'cash',
        subtotal_amount: subtotal,
        tax_amount: tax,
        additional_charges_amount: 0,
        total_amount: totalAmount,
        paid_amount: isPrepaid ? totalAmount : 0,
        booking_source: body.channelId || 'ota',
        special_requests: body.specialRequests?.trim(),
        internal_notes: `OTA Channel: ${body.channelName || body.channelId} | Voucher: ${body.otaBookingReference.trim()} | Comm: ${body.commissionPercent || 18}% | Net: ₹${body.netHotelPayoutInr || (totalAmount - Math.round(totalAmount * 0.18))}`,
      },
      staffName
    );

    // If specific physical room assigned
    if (body.assignedRoomNumber) {
      try {
        repo.assignRoomToBooking(
          String(body.assignedRoomNumber).trim(),
          newBooking.booking_reference,
          newBooking.guest_name,
          staffName
        );
      } catch (assignErr) {
        console.warn('Physical room auto-assign warning:', assignErr);
      }
    }

    notifySuperAdmin({
      eventType: 'EVENT_BOOKING_CREATED',
      payload: {
        guestName: newBooking.guest_name,
        bookingReference: newBooking.booking_reference,
        categoryName: newBooking.category_name,
        totalAmount: newBooking.total_amount,
        source: body.channelName || body.channelId,
        staffName,
      },
    });

    return NextResponse.json({
      success: true,
      reservation: newBooking,
      isExisting: false,
      message: 'OTA reservation recorded successfully and room inventory blocked.',
    });
  } catch (err: any) {
    console.error('Failed to record OTA booking:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error recording OTA reservation' },
      { status: 500 }
    );
  }
}
