import { NextResponse } from 'next/server';
import { searchAvailability } from '@/lib/booking-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { checkIn, checkOut, adults = 1, children = 0, roomsCount = 1 } = body;

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Check-in and check-out dates are required' },
        { status: 400 }
      );
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    const results = searchAvailability(
      checkIn,
      checkOut,
      Number(adults),
      Number(children),
      Number(roomsCount)
    );

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to check availability';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
