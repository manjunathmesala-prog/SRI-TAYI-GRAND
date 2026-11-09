import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { searchAvailability } from '@/lib/booking-engine';
import { calculateBookingTariff } from '@/lib/pricing';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingReference, newCheckInDate, newCheckOutDate, guestPhone, guestEmail } = body;

    if (!bookingReference || !newCheckInDate || !newCheckOutDate) {
      return NextResponse.json(
        { success: false, error: 'Booking reference, new check-in date, and new check-out date are required.' },
        { status: 400 }
      );
    }

    if (new Date(newCheckOutDate) <= new Date(newCheckInDate)) {
      return NextResponse.json(
        { success: false, error: 'Check-out date must be strictly after check-in date.' },
        { status: 400 }
      );
    }

    const booking = repo.getBookingByReference(bookingReference);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: `Booking ${bookingReference} not found.` },
        { status: 404 }
      );
    }

    // BOLA/IDOR Defense: Verify caller is staff or authorized guest
    const staffAuth = verifyStaffRole(req);
    const isStaff = staffAuth.authorized;

    if (!isStaff) {
      const inputPhone = (guestPhone || '').replace(/\D/g, '');
      const recordPhone = (booking.guest_phone || '').replace(/\D/g, '');
      const phoneMatch = inputPhone.length >= 8 && recordPhone.endsWith(inputPhone);

      const inputEmail = (guestEmail || '').trim().toLowerCase();
      const recordEmail = (booking.guest_email || '').trim().toLowerCase();
      const emailMatch = inputEmail.length > 3 && inputEmail === recordEmail;

      if (!phoneMatch && !emailMatch) {
        return NextResponse.json(
          {
            success: false,
            error: 'Verification required: Please provide the phone number or email address registered with this reservation to reschedule.',
          },
          { status: 403 }
        );
      }
    }

    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot reschedule booking in '${booking.status}' status. Only active confirmed or pending bookings can be rescheduled.` },
        { status: 409 }
      );
    }

    // Verify availability for the requested new dates
    const availability = searchAvailability(
      newCheckInDate,
      newCheckOutDate,
      booking.adults_count || 1,
      booking.children_count || 0,
      booking.rooms_count || 1
    );

    const categoryAvailable = availability.find((c) => c.category.id === booking.category_id);
    if (!categoryAvailable || categoryAvailable.availableRooms < (booking.rooms_count || 1)) {
      return NextResponse.json(
        { success: false, error: 'No rooms available for the selected dates in this room category. Please choose alternative dates.' },
        { status: 409 }
      );
    }

    // Recalculate tariff
    const newTariff = calculateBookingTariff({
      categoryId: booking.category_id,
      checkIn: newCheckInDate,
      checkOut: newCheckOutDate,
      roomsCount: booking.rooms_count || 1,
      adultsCount: booking.adults_count || 1,
      childrenCount: booking.children_count || 0,
    });

    const previousCheckIn = booking.check_in_date;
    const previousCheckOut = booking.check_out_date;

    // Apply rescheduled stay details
    booking.check_in_date = newCheckInDate;
    booking.check_out_date = newCheckOutDate;
    booking.total_amount = newTariff.totalRupees;
    booking.subtotal_amount = newTariff.subtotalRupees;
    booking.tax_amount = newTariff.taxAmountRupees;

    // Unassign room so front desk can assign appropriate room for new dates
    if (booking.assigned_room_id) {
      try {
        repo.updateRoomStatus(
          booking.assigned_room_id,
          'available',
          'clean',
          `Booking ${bookingReference} rescheduled from ${previousCheckIn} to ${newCheckInDate}`
        );
      } catch {}
      booking.assigned_room_id = undefined;
      booking.assigned_room_number = undefined;
    }

    const actor = isStaff ? (staffAuth.session?.name || 'Authorized Staff') : 'Guest Self-Service';

    // Record audit log
    try {
      repo.recordAuditLog({
        action: 'RESCHEDULE_BOOKING',
        entityType: 'booking',
        entityId: booking.id,
        userId: staffAuth.session?.userId,
        userName: actor,
        userRole: staffAuth.session?.role || 'Guest',
        details: `Reservation ${bookingReference} rescheduled from ${previousCheckIn}-${previousCheckOut} to ${newCheckInDate}-${newCheckOutDate}.`,
        previousValue: `${previousCheckIn} to ${previousCheckOut}`,
        newValue: `${newCheckInDate} to ${newCheckOutDate}`,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      booking,
      tariff: newTariff,
      message: `Reservation ${bookingReference} successfully rescheduled to ${newCheckInDate} – ${newCheckOutDate}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to reschedule reservation.' },
      { status: 500 }
    );
  }
}
