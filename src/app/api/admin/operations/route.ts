import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { BookingStatus, HousekeepingStatus, OperationalStatus, PaymentMethod } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const fullState = repo.getFullState();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...fullState,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch authoritative state' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing required field: action' }, { status: 400 });
    }

    // Role-based access validation
    switch (action) {
      case 'check_in': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const { bookingReference, roomId, roomNumber, issueRfid } = body;
        const booking = repo.getBookingByReference(bookingReference);
        if (!booking) {
          return NextResponse.json({ success: false, error: `Booking ${bookingReference} not found` }, { status: 404 });
        }

        const staffName = auth.session?.name || body.staffName || 'Front Desk';

        // If specific room selected, assign it
        const targetRoomIdentifier = roomId || roomNumber || booking.assigned_room_id;
        if (targetRoomIdentifier) {
          try {
            repo.assignRoomToBooking(targetRoomIdentifier, booking.booking_reference, booking.guest_name, staffName);
          } catch (assignErr: any) {
            return NextResponse.json({ success: false, error: assignErr.message }, { status: 409 });
          }
        }

        // Update status to checked_in
        const updatedBooking = repo.updateBookingStatus(bookingReference, 'checked_in', undefined, staffName);

        // Issue RFID if requested
        let issuedCard = null;
        if (issueRfid && updatedBooking?.assigned_room_number) {
          const checkOutDateStr = updatedBooking.check_out_date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
          const expiryIso = new Date(`${checkOutDateStr}T11:00:00+05:30`).toISOString();
          issuedCard = repo.issueRFIDCard(
            updatedBooking.assigned_room_number,
            updatedBooking.booking_reference,
            updatedBooking.guest_name,
            staffName,
            expiryIso
          );
          updatedBooking.keycard_issued_at = new Date().toISOString();
          updatedBooking.keycard_uid = issuedCard.card_uid;
        }

        return NextResponse.json({
          success: true,
          message: `Guest ${booking.guest_name} successfully checked in.`,
          booking: updatedBooking,
          card: issuedCard,
        });
      }

      case 'check_out': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const { bookingReference, additionalCharges, chargeDescription, settlementMethod } = body;
        const booking = repo.getBookingByReference(bookingReference);
        if (!booking) {
          return NextResponse.json({ success: false, error: `Booking ${bookingReference} not found` }, { status: 404 });
        }

        const staffName = auth.session?.name || body.staffName || 'Front Desk';

        // Add incidental charges if specified
        if (additionalCharges && Number(additionalCharges) > 0) {
          booking.additional_charges_amount = (booking.additional_charges_amount || 0) + Number(additionalCharges);
          booking.total_amount += Number(additionalCharges);
          booking.internal_notes = `${booking.internal_notes || ''}\nIncidental Charge: ₹${additionalCharges} (${chargeDescription || 'Extra Services'})`.trim();
        }

        // Settle pending balance
        const pendingBalance = booking.total_amount - booking.paid_amount;
        let settlementPayment = null;
        if (pendingBalance > 0) {
          settlementPayment = repo.recordPayment(
            {
              booking_reference: booking.booking_reference,
              guest_name: booking.guest_name,
              amount: pendingBalance,
              currency: 'INR',
              payment_method: (settlementMethod as PaymentMethod) || 'cash',
              status: 'successful',
              paid_at: new Date().toISOString(),
            },
            staffName
          );
          booking.paid_amount = booking.total_amount;
          booking.payment_status = 'successful';
        }

        // Update status to checked_out and mark room dirty
        const updatedBooking = repo.updateBookingStatus(bookingReference, 'checked_out', undefined, staffName);

        return NextResponse.json({
          success: true,
          message: `Guest ${booking.guest_name} successfully checked out. Room scheduled for housekeeping turnover.`,
          booking: updatedBooking,
          settlementPayment,
        });
      }

      case 'assign_room': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const { roomId, bookingReference, guestName } = body;
        if (!roomId || !bookingReference) {
          return NextResponse.json(
            { success: false, error: 'roomId and bookingReference are required' },
            { status: 400 }
          );
        }

        const staffName = auth.session?.name || body.staffName || 'Front Desk';
        try {
          const room = repo.assignRoomToBooking(roomId, bookingReference, guestName || 'Guest', staffName);
          return NextResponse.json({
            success: true,
            message: `Room ${room.room_number} assigned to booking ${bookingReference}.`,
            room,
          });
        } catch (conflictErr: any) {
          return NextResponse.json({ success: false, error: conflictErr.message }, { status: 409 });
        }
      }

      case 'housekeeping': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Housekeeping', 'Front Desk']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const { roomId, operationalStatus, housekeepingStatus, notes } = body;
        if (!roomId || !housekeepingStatus) {
          return NextResponse.json(
            { success: false, error: 'roomId and housekeepingStatus are required' },
            { status: 400 }
          );
        }

        const room = repo.getRoomById(roomId);
        if (!room) {
          return NextResponse.json({ success: false, error: `Room ${roomId} not found` }, { status: 404 });
        }

        // Automatic operational status logic if not explicitly provided
        let targetOpStatus: OperationalStatus = operationalStatus || room.operational_status;
        if (!operationalStatus) {
          if (housekeepingStatus === 'clean' || housekeepingStatus === 'inspected') {
            targetOpStatus = room.operational_status === 'cleaning' ? 'available' : room.operational_status;
          } else if (housekeepingStatus === 'dirty' || housekeepingStatus === 'in_progress') {
            targetOpStatus = room.operational_status === 'available' ? 'cleaning' : room.operational_status;
          }
        }

        const staffName = auth.session?.name || body.staffName || 'Housekeeping';
        const updatedRoom = repo.updateRoomStatus(
          roomId,
          targetOpStatus,
          housekeepingStatus as HousekeepingStatus,
          notes,
          staffName
        );

        return NextResponse.json({
          success: true,
          message: `Room ${updatedRoom?.room_number} housekeeping updated to ${housekeepingStatus}.`,
          room: updatedRoom,
        });
      }

      case 'booking_status': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const { bookingReference, status, notes } = body;
        if (!bookingReference || !status) {
          return NextResponse.json(
            { success: false, error: 'bookingReference and status are required' },
            { status: 400 }
          );
        }

        const staffName = auth.session?.name || body.staffName || 'Staff';
        const updated = repo.updateBookingStatus(bookingReference, status as BookingStatus, notes, staffName);
        if (!updated) {
          return NextResponse.json({ success: false, error: 'Booking reference not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: `Booking ${bookingReference} status updated to ${status}.`,
          booking: updated,
        });
      }

      case 'record_payment': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const { bookingReference, guestName, amount, paymentMethod } = body;
        if (!bookingReference || !amount) {
          return NextResponse.json(
            { success: false, error: 'bookingReference and amount are required' },
            { status: 400 }
          );
        }

        const staffName = auth.session?.name || body.staffName || 'Accounts';
        const payment = repo.recordPayment(
          {
            booking_reference: bookingReference,
            guest_name: guestName || 'Valued Guest',
            amount: Number(amount),
            currency: 'INR',
            payment_method: (paymentMethod as PaymentMethod) || 'cash',
            status: 'successful',
            paid_at: new Date().toISOString(),
          },
          staffName
        );

        return NextResponse.json({
          success: true,
          message: `Payment of ₹${amount} recorded for ${bookingReference}.`,
          payment,
        });
      }

      case 'create_booking': {
        // Can be public website booking or front desk
        const { bookingData } = body;
        if (!bookingData || !bookingData.category_id || !bookingData.guest_name || !bookingData.guest_phone) {
          return NextResponse.json(
            { success: false, error: 'Missing required booking parameters' },
            { status: 400 }
          );
        }

        try {
          const booking = repo.createBooking(bookingData, body.actor || 'Website Guest');
          return NextResponse.json({
            success: true,
            message: `Booking ${booking.booking_reference} confirmed.`,
            booking,
          });
        } catch (overbookErr: any) {
          return NextResponse.json({ success: false, error: overbookErr.message }, { status: 409 });
        }
      }

      default:
        return NextResponse.json({ success: false, error: `Unrecognized action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal operations error' },
      { status: 500 }
    );
  }
}
