import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

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
