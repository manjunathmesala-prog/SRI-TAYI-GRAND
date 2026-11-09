import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

/**
 * Endpoint: POST /api/admin/walk-ins/assign-and-encode
 * Front Desk Staff selects physical room, verifies payment, and issues keycard via Be-Tech USB encoder
 */
export async function POST(request: NextRequest) {
  try {
    const auth = verifyStaffRole(request, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Receptionist']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      bookingReference,
      booking_reference,
      roomNumber,
      room_number,
      staffName,
      staff_name,
      markPaymentCollected,
      mark_payment_collected,
      paymentMethod,
      payment_method,
      cardUid,
      card_uid,
    } = body;

    const ref = bookingReference || booking_reference;
    const room = roomNumber || room_number;
    const staff = auth.session?.name || staffName || staff_name || 'Front Desk Staff';

    if (!ref || !room) {
      return NextResponse.json(
        {
          success: false,
          error: 'Booking reference and physical room number are required.',
        },
        { status: 400 }
      );
    }

    // 1. Assign room and issue key in HotelRepository
    const result = repo.assignRoomAndIssueWalkInKey({
      bookingReference: ref,
      roomNumber: room,
      staffName: staff,
      cardUid: cardUid || card_uid,
      markPaid: markPaymentCollected ?? mark_payment_collected,
      paymentMethod: paymentMethod || payment_method,
    });

    if (!result.success || !result.booking || !result.card) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to assign room and issue keycard.',
        },
        { status: 400 }
      );
    }

    // 2. Hardware bridge call (attempt to program physical Be-Tech card on USB encoder if bridge is up)
    let bridgeResult = null;
    try {
      const bridgeHost = 'http://127.0.0.1:8989';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Quick 3s check

      const bridgeRes = await fetch(`${bridgeHost}/api/issue-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Staff-User': staff },
        body: JSON.stringify({
          roomNumber: room,
          guestName: result.booking.guest_name,
          staffUser: staff,
          beginTime: '0001010000',
          endTime: result.card.expires_at
            ? String(new Date(result.card.expires_at).getFullYear()).slice(-2) +
              String(new Date(result.card.expires_at).getMonth() + 1).padStart(2, '0') +
              String(new Date(result.card.expires_at).getDate()).padStart(2, '0') +
              '1100'
            : '9912312359',
        }),
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (bridgeRes && bridgeRes.ok) {
        bridgeResult = await bridgeRes.json();
        if (bridgeResult.cardNo) {
          result.card.card_uid = `BT-57-${bridgeResult.cardNo}`;
        }
      }
    } catch {
      // Bridge is optional in fallback/development mode; repository and database are source of truth
    }

    return NextResponse.json({
      success: true,
      message: `Room ${room} assigned and keycard issued for ${result.booking.guest_name}!`,
      booking: result.booking,
      room: result.room,
      card: result.card,
      bridge_result: bridgeResult,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Assign and encode error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
