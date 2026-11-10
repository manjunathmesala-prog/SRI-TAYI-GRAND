import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { notifySuperAdmin } from '@/lib/notifications/engine';
import { verifyStaffRole } from '@/lib/auth';
import { BookingStatus, HousekeepingStatus, OperationalStatus, PaymentMethod } from '@/types';
import { syncBookingToSupabase } from '@/lib/db/supabase-sync';

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
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized: Staff session required' }, { status: 403 });
    }

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

        // Stale Data Guard: Validate current booking state
        if (booking.status === 'checked_in') {
          return NextResponse.json(
            { success: false, error: `Booking ${bookingReference} is already checked in.` },
            { status: 409 }
          );
        }
        if (booking.status === 'checked_out') {
          return NextResponse.json(
            { success: false, error: `Cannot check in: Booking ${bookingReference} has already checked out.` },
            { status: 409 }
          );
        }
        if (booking.status === 'cancelled') {
          return NextResponse.json(
            { success: false, error: `Cannot check in: Booking ${bookingReference} was cancelled.` },
            { status: 409 }
          );
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

        // Update statutory guest registration fields if provided
        if (updatedBooking) {
          if (body.idProofType) updatedBooking.id_proof_type = body.idProofType;
          if (body.idProofNumber) updatedBooking.id_proof_number = body.idProofNumber;
          if (body.nationality) updatedBooking.nationality = body.nationality;
          if (body.cityOfOrigin) updatedBooking.city_of_origin = body.cityOfOrigin;
          if (body.purposeOfVisit) updatedBooking.purpose_of_visit = body.purposeOfVisit;
        }

        // Record check-in advance / room payment if requested
        if (body.collectPayment && Number(body.paymentAmount) > 0 && updatedBooking) {
          const payAmt = Number(body.paymentAmount);
          const payMethod = (body.paymentMethod as PaymentMethod) || 'cash';
          repo.recordPayment(
            {
              booking_reference: updatedBooking.booking_reference,
              guest_name: updatedBooking.guest_name,
              amount: payAmt,
              payment_method: payMethod,
              currency: 'INR',
              status: 'successful',
              paid_at: new Date().toISOString(),

            },
            staffName
          );
        }

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

        if (updatedBooking) {
          syncBookingToSupabase(updatedBooking);
        }

        notifySuperAdmin({
          eventType: 'EVENT_CHECK_IN',
          payload: {
            guestName: booking.guest_name,
            roomNumber: updatedBooking?.assigned_room_number || targetRoomIdentifier || 'Room',
            bookingReference: booking.booking_reference,
            checkInTime: new Date().toISOString(),
            staffName,
          },
        });

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

        // Stale Data Guard: Check-out requires active checked_in status
        if (booking.status === 'checked_out') {
          return NextResponse.json(
            { success: false, error: `Booking ${bookingReference} has already checked out.` },
            { status: 409 }
          );
        }
        if (booking.status !== 'checked_in') {
          return NextResponse.json(
            { success: false, error: `Cannot check out: Booking ${bookingReference} is not checked in (current status: ${booking.status}).` },
            { status: 409 }
          );
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

        if (updatedBooking) {
          syncBookingToSupabase(updatedBooking);
        }

        notifySuperAdmin({
          eventType: 'EVENT_CHECK_OUT',
          payload: {
            guestName: booking.guest_name,
            roomNumber: booking.assigned_room_number || 'Room',
            bookingReference: booking.booking_reference,
            checkOutTime: new Date().toISOString(),
            balanceStatus: pendingBalance > 0 && !settlementPayment ? 'pending' : 'settled',
            outstandingAmount: pendingBalance > 0 && !settlementPayment ? pendingBalance : 0,
            staffName,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Guest ${booking.guest_name} successfully checked out. Room scheduled for housekeeping turnover.`,
          booking: updatedBooking,
          settlementPayment,
        });
      }

      case 'cancel_checkout': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const { bookingReference } = body;
        if (!bookingReference) {
          return NextResponse.json({ success: false, error: 'bookingReference is required' }, { status: 400 });
        }

        const booking = repo.getBookingByReference(bookingReference);
        if (!booking) {
          return NextResponse.json({ success: false, error: `Booking ${bookingReference} not found` }, { status: 404 });
        }

        if (booking.status !== 'checked_out') {
          return NextResponse.json(
            { success: false, error: `Cannot cancel checkout: Booking ${bookingReference} is not checked out (current status: ${booking.status}).` },
            { status: 409 }
          );
        }

        const staffName = auth.session?.name || body.staffName || 'Front Desk';
        const updatedBooking = repo.cancelCheckout(bookingReference, staffName);

        if (updatedBooking) {
          syncBookingToSupabase(updatedBooking);
        }

        notifySuperAdmin({
          eventType: 'EVENT_CHECK_IN',
          payload: {
            guestName: updatedBooking.guest_name,
            roomNumber: updatedBooking.assigned_room_number || 'Room',
            bookingReference: updatedBooking.booking_reference,
            checkInTime: new Date().toISOString(),
            staffName,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Checkout cancelled. Stay ${bookingReference} restored to In-House status.`,
          booking: updatedBooking,
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

        const booking = repo.getBookingByReference(bookingReference);
        if (!booking) {
          return NextResponse.json({ success: false, error: `Booking ${bookingReference} not found` }, { status: 404 });
        }
        if (booking.status === 'checked_out') {
          return NextResponse.json(
            { success: false, error: `Cannot assign room: Booking ${bookingReference} has already checked out.` },
            { status: 409 }
          );
        }
        if (booking.status === 'cancelled') {
          return NextResponse.json(
            { success: false, error: `Cannot assign room: Booking ${bookingReference} was cancelled.` },
            { status: 409 }
          );
        }

        const staffName = auth.session?.name || body.staffName || 'Front Desk';
        try {
          const room = repo.assignRoomToBooking(roomId, bookingReference, guestName || booking.guest_name || 'Guest', staffName);
          return NextResponse.json({
            success: true,
            message: `Room ${room.room_number} assigned to booking ${bookingReference}.`,
            room,
          });
        } catch (conflictErr: any) {
          return NextResponse.json({ success: false, error: conflictErr.message }, { status: 409 });
        }
      }

      case 'change_room':
      case 'transfer_room': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const {
          bookingReference,
          toRoomIdOrNumber,
          toRoomNumber,
          toRoomId,
          reasonCategory = 'other_technical',
          reasonNotes = 'Guest requested room change',
          createMaintenanceTicket = true,
          oldRoomAction,
        } = body;

        const targetRoom = toRoomIdOrNumber || toRoomNumber || toRoomId;

        if (!bookingReference || !targetRoom) {
          return NextResponse.json(
            { success: false, error: 'bookingReference and toRoomIdOrNumber are required' },
            { status: 400 }
          );
        }

        const staffName = auth.session?.name || body.staffName || 'Front Desk Staff';

        try {
          const result = repo.transferBookingRoom({
            bookingReference,
            toRoomIdOrNumber: targetRoom,
            reasonCategory,
            reasonNotes,
            actor: staffName,
            createMaintenanceTicket,
            oldRoomAction,
          });

          notifySuperAdmin({
            eventType: 'EVENT_CHECK_IN',
            payload: { bookingReference, guestName: result.booking.guest_name, roomNumber: result.newRoom.room_number, categoryName: result.newRoom.category_name || 'Room', nights: 1, source: 'front_desk' },
            title: `Room Transfer: ${result.oldRoom.room_number} ➔ ${result.newRoom.room_number}`,
            message: `Guest ${result.booking.guest_name} (${bookingReference}) transferred from Room ${result.oldRoom.room_number} to Room ${result.newRoom.room_number}. Reason: ${reasonNotes}`,
            metadata: {
              bookingReference,
              guestName: result.booking.guest_name,
              fromRoom: result.oldRoom.room_number,
              toRoom: result.newRoom.room_number,
              reasonCategory,
              reasonNotes,
              staffName,
              maintenanceTicketId: result.maintenanceTicket?.id,
            },
          });

          return NextResponse.json({
            success: true,
            message: `Guest ${result.booking.guest_name} successfully transferred from Room ${result.oldRoom.room_number} to Room ${result.newRoom.room_number}.`,
            ...result,
          });
        } catch (transferErr: any) {
          return NextResponse.json({ success: false, error: transferErr.message || 'Room transfer failed' }, { status: 400 });
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

        const validHkStatuses: HousekeepingStatus[] = ['clean', 'dirty', 'inspected', 'in_progress'];
        if (!validHkStatuses.includes(housekeepingStatus as HousekeepingStatus)) {
          return NextResponse.json(
            { success: false, error: `Invalid housekeepingStatus: '${housekeepingStatus}'. Allowed: ${validHkStatuses.join(', ')}` },
            { status: 400 }
          );
        }

        if (operationalStatus) {
          const validOpStatuses: OperationalStatus[] = ['available', 'occupied', 'reserved', 'maintenance', 'cleaning'];
          if (!validOpStatuses.includes(operationalStatus as OperationalStatus)) {
            return NextResponse.json(
              { success: false, error: `Invalid operationalStatus: '${operationalStatus}'. Allowed: ${validOpStatuses.join(', ')}` },
              { status: 400 }
            );
          }
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

        const validBookingStatuses: BookingStatus[] = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
        if (!validBookingStatuses.includes(status as BookingStatus)) {
          return NextResponse.json(
            { success: false, error: `Invalid booking status: '${status}'. Allowed: ${validBookingStatuses.join(', ')}` },
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
        if (!bookingReference || amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
          return NextResponse.json(
            { success: false, error: 'Valid bookingReference and positive numeric amount are required' },
            { status: 400 }
          );
        }

        const booking = repo.getBookingByReference(bookingReference);
        if (!booking) {
          return NextResponse.json({ success: false, error: `Booking ${bookingReference} not found` }, { status: 404 });
        }

        const staffName = auth.session?.name || body.staffName || 'Accounts';
        const payment = repo.recordPayment(
          {
            booking_reference: bookingReference,
            guest_name: guestName || booking.guest_name || 'Valued Guest',
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

      case 'statutory_walk_in': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const {
          guestName,
          guestPhone,
          guestEmail,
          nationality,
          cityOfOrigin,
          idProofType,
          idProofNumber,
          purposeOfVisit,
          categoryId,
          roomNumber,
          checkInDate,
          checkOutDate,
          adultsCount,
          childrenCount,
          baseTariff,
          isTariffOverridden,
          tariffOverrideReason,
          paymentMethod,
          amountCollected,
          paymentReference,
          issueKeycard,
          cardUid,
          specialRequests,
        } = body;

        if (!guestName || !guestPhone || !idProofType || !idProofNumber || !roomNumber || !categoryId) {
          return NextResponse.json(
            { success: false, error: 'Guest name, phone, Govt ID type, Govt ID number, room number, and category are required' },
            { status: 400 }
          );
        }

        if (isTariffOverridden && !tariffOverrideReason) {
          return NextResponse.json(
            { success: false, error: 'Manager justification note is required when tariff is overridden' },
            { status: 400 }
          );
        }

        const staffName = auth.session?.name || body.staffName || 'Front Desk Reception';

        try {
          const result = repo.createFrontDeskWalkIn({
            guestName,
            guestPhone,
            guestEmail,
            nationality,
            cityOfOrigin,
            idProofType,
            idProofNumber,
            purposeOfVisit: purposeOfVisit || 'Pilgrimage / Temple Darshan',
            categoryId,
            roomNumber,
            checkInDate: checkInDate || new Date().toISOString().split('T')[0],
            checkOutDate: checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
            adultsCount: Number(adultsCount) || 2,
            childrenCount: Number(childrenCount) || 0,
            baseTariff: baseTariff !== undefined ? Number(baseTariff) : undefined,
            isTariffOverridden: Boolean(isTariffOverridden),
            tariffOverrideReason,
            paymentMethod: paymentMethod || 'cash',
            amountCollected: amountCollected !== undefined ? Number(amountCollected) : undefined,
            paymentReference,
            issueKeycard: issueKeycard !== false,
            cardUid,
            specialRequests,
            staffName,
          });

          return NextResponse.json({
            success: true,
            message: `Walk-in guest ${result.booking.guest_name} registered and checked into Room ${result.room.room_number}.`,
            ...result,
          });
        } catch (err: any) {
          return NextResponse.json({ success: false, error: err.message }, { status: 409 });
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
