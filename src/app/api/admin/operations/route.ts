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

    await repo.ensureAllLoaded();
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
        if (targetRoomIdentifier && !booking.assigned_room_id) {
          try {
            await repo.assignRoomToBooking(targetRoomIdentifier, booking.booking_reference, booking.guest_name, staffName);
          } catch (assignErr: any) {
            return NextResponse.json({ success: false, error: assignErr.message }, { status: 409 });
          }
        }

        // Support partial check-in if roomNumbers is specified as an array
        let updatedBooking: any;
        const requestedRoomNums = Array.isArray(body.roomNumbers)
          ? body.roomNumbers
          : Array.isArray(body.room_numbers)
          ? body.room_numbers
          : null;

        if (requestedRoomNums && requestedRoomNums.length > 0) {
          updatedBooking = await repo.checkInSpecificRooms(bookingReference, requestedRoomNums, staffName);
        } else {
          updatedBooking = await repo.updateBookingStatus(bookingReference, 'checked_in', undefined, staffName);
        }

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
          const outstanding = Math.max(0, updatedBooking.total_amount - (updatedBooking.paid_amount || 0));
          const requestedAmt = Number(body.paymentAmount);
          const payAmt = Math.min(requestedAmt, outstanding > 0 ? outstanding : requestedAmt);
          const payMethod = (body.paymentMethod as PaymentMethod) || 'cash';
          await repo.recordPayment(
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

          // Attempt hardware bridge programming if Be-Tech encoder is connected on Port 8989
          let bridgeCardNo: number | undefined;
          try {
            const bridgeRes = await fetch('http://127.0.0.1:8989/api/issue-card', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Staff-User': staffName },
              body: JSON.stringify({
                roomNumber: updatedBooking.assigned_room_number,
                guestName: updatedBooking.guest_name,
                staffUser: staffName,
                beginTime: '0001010000',
                endTime: '9912312359',
              }),
              signal: AbortSignal.timeout(4000),
            }).catch(() => null);
            if (bridgeRes && bridgeRes.ok) {
              const bData = await bridgeRes.json();
              if (bData.cardNo) bridgeCardNo = bData.cardNo;
            }
          } catch {}

          const customCardUid = bridgeCardNo ? `BT-57-${bridgeCardNo}` : (body.cardUid || body.card_uid || undefined);
          issuedCard = repo.issueRFIDCard(
            updatedBooking.assigned_room_number,
            updatedBooking.booking_reference,
            updatedBooking.guest_name,
            staffName,
            expiryIso,
            customCardUid
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

        // Stale Data Guard: Check-out requires active in-house stay
        if (booking.status === 'checked_out') {
          return NextResponse.json(
            { success: false, error: `Booking ${bookingReference} has already checked out.` },
            { status: 409 }
          );
        }
        if (
          booking.status !== 'checked_in' &&
          booking.status !== 'partially_checked_in' &&
          booking.status !== 'partially_checked_out'
        ) {
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
          settlementPayment = await repo.recordPayment(
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
        }

        // Support partial checkout if roomNumbers is specified as an array
        const requestedCheckoutRooms = Array.isArray(body.roomNumbers)
          ? body.roomNumbers
          : Array.isArray(body.room_numbers)
          ? body.room_numbers
          : null;

        let updatedBooking: any;
        if (requestedCheckoutRooms && requestedCheckoutRooms.length > 0) {
          updatedBooking = await repo.checkOutSpecificRooms(bookingReference, requestedCheckoutRooms, staffName);
        } else {
          // Deactivate card on hardware bridge if connected
          const targetRooms =
            booking.assigned_room_numbers && booking.assigned_room_numbers.length > 0
              ? booking.assigned_room_numbers
              : booking.assigned_room_number
              ? [booking.assigned_room_number]
              : booking.room_number
              ? [booking.room_number]
              : [];
          for (const rNum of targetRooms) {
            fetch('http://127.0.0.1:8989/api/checkout-card', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Staff-User': staffName },
              body: JSON.stringify({
                roomNumber: rNum,
                staffUser: staffName,
              }),
              signal: AbortSignal.timeout(3000),
            }).catch(() => {});
          }

          // Update status to checked_out and mark room dirty
          updatedBooking = await repo.updateBookingStatus(bookingReference, 'checked_out', undefined, staffName);
        }

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
        const updatedBooking = await repo.cancelCheckout(bookingReference, staffName);

        if (updatedBooking) {
          await syncBookingToSupabase(updatedBooking);
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
          const room = await repo.assignRoomToBooking(roomId, bookingReference, guestName || booking.guest_name || 'Guest', staffName);
          return NextResponse.json({
            success: true,
            message: `Room ${room.room_number} assigned to booking ${bookingReference}.`,
            room,
          });
        } catch (conflictErr: any) {
          return NextResponse.json({ success: false, error: conflictErr.message }, { status: 409 });
        }
      }

      case 'add_extra_room': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const { bookingReference, roomId, roomNumber, categoryId } = body;
        if (!bookingReference) {
          return NextResponse.json(
            { success: false, error: 'bookingReference is required' },
            { status: 400 }
          );
        }
        if (!roomId && !roomNumber && !categoryId) {
          return NextResponse.json(
            { success: false, error: 'roomId, roomNumber, or categoryId is required to add an extra room' },
            { status: 400 }
          );
        }

        const staffName = auth.session?.name || body.staffName || 'Front Desk Duty Officer';
        try {
          const result = await repo.addExtraRoomToBooking({
            bookingReference,
            roomId,
            roomNumber,
            categoryId,
            actor: staffName,
          });

          return NextResponse.json({
            success: true,
            message: `Extra Room #${result.extraRoom.room_number} added to booking ${bookingReference}.`,
            newRoomsCount: result.booking.rooms_count,
            ...result,
          });
        } catch (err: any) {
          const isConflict =
            err?.message?.toLowerCase().includes('already booked') ||
            err?.message?.toLowerCase().includes('conflict') ||
            err?.message?.toLowerCase().includes('occupied') ||
            err?.message?.toLowerCase().includes('already assigned');
          return NextResponse.json(
            { success: false, error: err.message || 'Failed to add extra room' },
            { status: isConflict ? 409 : 400 }
          );
        }
      }

      case 'remove_room': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const { bookingReference, roomNumber } = body;
        if (!bookingReference || !roomNumber) {
          return NextResponse.json(
            { success: false, error: 'bookingReference and roomNumber are required to remove a room' },
            { status: 400 }
          );
        }

        const staffName = auth.session?.name || body.staffName || 'Front Desk Duty Officer';
        try {
          const result = await repo.removeRoomFromBooking({
            bookingReference,
            roomNumber,
            actor: staffName,
          });

          return NextResponse.json({
            success: true,
            message: `Room #${roomNumber} removed from booking ${bookingReference}.`,
            ...result,
          });
        } catch (err: any) {
          return NextResponse.json(
            { success: false, error: err.message || 'Failed to remove room' },
            { status: 400 }
          );
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
          const result = await repo.transferBookingRoom({
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

      case 'check_extension_availability': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const { bookingReference, newCheckOutDate, targetRoomNumber } = body;
        if (!bookingReference || !newCheckOutDate) {
          return NextResponse.json(
            { success: false, error: 'bookingReference and newCheckOutDate are required' },
            { status: 400 }
          );
        }

        try {
          const availResult = repo.checkStayExtensionAvailability({
            bookingReference,
            newCheckOutDate,
            targetRoomNumber,
          });
          return NextResponse.json({ success: true, ...availResult });
        } catch (err: any) {
          return NextResponse.json({ success: false, error: err.message || 'Availability check failed' }, { status: 400 });
        }
      }

      case 'extend_stay': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const {
          bookingReference,
          newCheckOutDate,
          additionalNights,
          dailyRoomCharge,
          taxRate,
          pricingMode,
          paidNow,
          paymentMethod,
          reason,
          targetRoomNumber,
          idempotencyKey,
        } = body;

        if (!bookingReference || !newCheckOutDate) {
          return NextResponse.json(
            { success: false, error: 'bookingReference and newCheckOutDate are required' },
            { status: 400 }
          );
        }

        const staffName = auth.session?.name || body.staffName || 'Front Desk Staff';

        try {
          const result = await repo.extendStay({
            bookingReference,
            newCheckOutDate,
            additionalNights,
            dailyRoomCharge,
            taxRate,
            pricingMode,
            paidNow,
            paymentMethod,
            actor: staffName,
            idempotencyKey,
            reason,
            targetRoomNumber,
          });

          notifySuperAdmin({
            eventType: 'EVENT_CHECK_IN',
            payload: {
              bookingReference,
              guestName: result.booking.guest_name,
              roomNumber: result.extension.room_number,
              nights: result.extension.additional_nights,
              source: 'front_desk_extension',
            },
            title: `Stay Extended: Room ${result.extension.room_number} (${bookingReference})`,
            message: `Guest ${result.booking.guest_name} stay extended by ${result.extension.additional_nights} night(s) to ${result.extension.new_checkout_date}. Total: ₹${result.extension.total_extension_charge}. Paid: ₹${result.extension.paid_now}.`,
            metadata: {
              bookingReference,
              guestName: result.booking.guest_name,
              roomNumber: result.extension.room_number,
              previousCheckout: result.extension.previous_checkout_date,
              newCheckout: result.extension.new_checkout_date,
              additionalNights: result.extension.additional_nights,
              totalCharge: result.extension.total_extension_charge,
              paidNow: result.extension.paid_now,
              paymentMethod: result.extension.payment_method,
              staffName,
            },
          });

          return NextResponse.json({
            ...result,
            message: `Stay successfully extended for ${result.booking.guest_name} to ${result.extension.new_checkout_date}.`,
          });
        } catch (extErr: any) {
          return NextResponse.json({ success: false, error: extErr.message || 'Stay extension failed' }, { status: 400 });
        }
      }

      case 'housekeeping': {
        const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Housekeeping', 'Front Desk']);
        if (!auth.authorized) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
        }

        const roomId = body.roomId || body.room_id || body.roomNumber || body.room_number;
        const operationalStatus = body.operationalStatus || body.operational_status;
        const housekeepingStatus = body.housekeepingStatus || body.housekeeping_status;
        const notes = body.notes;

        if (!roomId || !housekeepingStatus) {
          return NextResponse.json(
            { success: false, error: 'roomId (or roomNumber) and housekeepingStatus are required' },
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

        // Check if room has an authoritative active checked-in stay
        const hasActiveStay = repo.getBookings().some(
          (b) =>
            b.status === 'checked_in' &&
            (b.assigned_room_id === room.id ||
              b.assigned_room_number === room.room_number ||
              (b.assigned_room_numbers && b.assigned_room_numbers.includes(room.room_number)) ||
              (b.booking_rooms &&
                b.booking_rooms.some(
                  (br) =>
                    (br.room_number === room.room_number || br.room_id === room.id) &&
                    br.status === 'checked_in'
                )))
        );

        // Operational status logic: preserve occupancy if guest is in-house
        let targetOpStatus: OperationalStatus = room.operational_status;
        if (hasActiveStay) {
          targetOpStatus = 'occupied';
        } else if (operationalStatus) {
          targetOpStatus = operationalStatus as OperationalStatus;
        } else if (housekeepingStatus === 'clean' || housekeepingStatus === 'inspected') {
          targetOpStatus = room.operational_status === 'cleaning' ? 'available' : room.operational_status;
        } else if (housekeepingStatus === 'dirty' || housekeepingStatus === 'in_progress') {
          targetOpStatus = room.operational_status === 'available' ? 'cleaning' : room.operational_status;
        }

        const staffName = auth.session?.name || body.staffName || 'Housekeeping';
        const updatedRoom = await repo.updateRoomStatus(
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
        const updated = await repo.updateBookingStatus(bookingReference, status as BookingStatus, notes, staffName);
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
        const payment = await repo.recordPayment(
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
          const booking = await repo.createBooking(bookingData, body.actor || 'Website Guest');
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

        const hasRoomsList = Array.isArray(body.rooms) && body.rooms.length > 0;
        if (!guestName || !guestPhone || !idProofType || !idProofNumber || (!hasRoomsList && (!roomNumber || !categoryId))) {
          return NextResponse.json(
            { success: false, error: 'Guest name, phone, Govt ID type, Govt ID number, and room selection are required' },
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
          const result = await repo.createFrontDeskWalkIn({
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
            rooms: body.rooms,
            checkInDate: checkInDate || new Date().toISOString().split('T')[0],
            checkOutDate: checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
            adultsCount: Number(adultsCount) || 2,
            childrenCount: Number(childrenCount) || 0,
            baseTariff: baseTariff !== undefined ? Number(baseTariff) : undefined,
            isTariffOverridden: Boolean(isTariffOverridden),
            tariffOverrideReason,
            paymentMethod: paymentMethod || 'cash',
            pricingMode: body.pricingMode,
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
