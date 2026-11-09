import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { notifySuperAdmin } from '@/lib/notifications/engine';
import { recordRfidTapAsync } from '@/lib/rfid/tap-logger';

/**
 * RFID Tap Processing Engine
 * Endpoint: POST /api/rfid/tap
 * Processes card taps at door locks for Super Admin, Cleaner (in/out dual-tap), and Customer keys
 * Supports both camelCase and snake_case payloads from hardware readers, bridge daemon, and web UI.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cardUid = body.cardUid || body.card_uid;
    const roomNumber = body.roomNumber || body.room_number;
    const action = body.action || body.action_type;

    if (!cardUid || !roomNumber) {
      return NextResponse.json(
        {
          success: false,
          authorized: false,
          accessGranted: false,
          error: 'Card UID and Room Number are required',
          message: 'Card UID and Room Number are required',
        },
        { status: 400 }
      );
    }

    const result = repo.processDoorTap(cardUid, roomNumber, action);

    // =========================================================================
    // STEP 2: NON-BLOCKING RFID TAP HISTORY & AUDIT TRAIL HOOK (OBSERVER PATTERN)
    // Zero throw propagation — hardware door response is never blocked or delayed
    // =========================================================================
    recordRfidTapAsync({
      cardUid,
      roomNumber,
      result,
      cardType: result.cardType,
    }).catch((err) => console.error('RFID History Log Error:', err));

    // Non-blocking Super Admin notification dispatch with 3s deduplication
    notifySuperAdmin({
      eventType: 'EVENT_RFID_TAP',
      payload: {
        deviceId: body.deviceId || `reader-${roomNumber}`,
        location: `Room ${roomNumber}`,
        cardUid,
        holderName: result.event?.holder_name,
        cardType: result.cardType,
        result: result.success ? 'GRANTED' : 'DENIED',
        reason: result.message,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: result.success,
      authorized: result.success,
      accessGranted: result.success,
      message: result.message,
      reason: result.message,
      cardType: result.cardType,
      card_type: result.cardType,
      roomStatus: result.roomStatus,
      housekeepingStatus: result.housekeepingStatus,
      action: result.event?.action_type || 'door_unlock',
      event: result.event,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'RFID event processing error';
    return NextResponse.json(
      {
        success: false,
        authorized: false,
        accessGranted: false,
        error: message,
        message,
      },
      { status: 500 }
    );
  }
}
