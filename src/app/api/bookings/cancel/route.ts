import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingReference, guestPhone, guestEmail, reason } = body;

    if (!bookingReference) {
      return NextResponse.json(
        { success: false, error: 'Booking reference is required.' },
        { status: 400 }
      );
    }

    const booking = repo.getBookingByReference(bookingReference);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: `Booking with reference ${bookingReference} was not found.` },
        { status: 404 }
      );
    }

    // BOLA/IDOR Defense: Verify requesting caller is either authorized staff or verified guest
    const staffAuth = verifyStaffRole(req);
    const isStaff = staffAuth.authorized;

    if (!isStaff) {
      // For guest self-service, require matching registered contact info (phone or email)
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
            error: 'Verification required: Please provide the phone number or email address registered with this reservation to cancel.',
          },
          { status: 403 }
        );
      }
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: `Booking ${bookingReference} is already cancelled.` },
        { status: 409 }
      );
    }

    if (booking.status === 'checked_in') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel reservation: Guest is currently checked-in. Please proceed to front desk for checkout.' },
        { status: 409 }
      );
    }

    if (booking.status === 'checked_out') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel reservation: Stay is already completed.' },
        { status: 409 }
      );
    }

    const actor = isStaff ? (staffAuth.session?.name || 'Authorized Staff') : 'Guest Self-Service';

    // Cancel booking via repository
    const updated = repo.updateBookingStatus(
      bookingReference,
      'cancelled',
      actor
    );

    // If a physical room was assigned, release it back to available
    if (booking.assigned_room_id) {
      try {
        repo.updateRoomStatus(
          booking.assigned_room_id,
          'available',
          'clean',
          `Reservation ${bookingReference} cancelled by ${actor}`
        );
      } catch {}
    }

    // Record audit log
    try {
      repo.recordAuditLog({
        action: 'CANCEL_BOOKING',
        entityType: 'booking',
        entityId: booking.id,
        userId: staffAuth.session?.userId,
        userName: actor,
        userRole: staffAuth.session?.role || 'Guest',
        details: `Reservation ${bookingReference} cancelled. Reason: ${reason || 'Guest requested cancellation'}`,
        previousValue: booking.status,
        newValue: 'cancelled',
      });
    } catch {}

    return NextResponse.json({
      success: true,
      booking: updated,
      message: `Reservation ${bookingReference} has been successfully cancelled. Any eligible refund will be credited back per hotel cancellation policy.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to cancel reservation.' },
      { status: 500 }
    );
  }
}
