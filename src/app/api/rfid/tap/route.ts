import { NextResponse } from 'next/server';
import { simulateDoorTap } from '@/lib/rfid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cardUid, roomNumber } = body;

    if (!cardUid || !roomNumber) {
      return NextResponse.json(
        { error: 'Card UID and Room Number are required' },
        { status: 400 }
      );
    }

    const event = simulateDoorTap(cardUid, roomNumber);

    return NextResponse.json({
      success: true,
      event,
      accessGranted: event.event_type === 'access_granted',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'RFID event processing error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
