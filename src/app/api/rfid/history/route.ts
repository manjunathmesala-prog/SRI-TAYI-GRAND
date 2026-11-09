import { NextResponse } from 'next/server';
import { getGlobalRfidHistory } from '@/lib/rfid/tap-logger';
import { RfidHistoryCardType, RfidHistoryAccessResult } from '@/types/rfid-history';

/**
 * GLOBAL RFID TAP AUDIT LOG API (SUPER ADMIN)
 * Endpoint: GET /api/rfid/history
 *
 * Query all physical room taps with pagination and granular multi-dimensional filters.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const roomNumber = searchParams.get('roomNumber') || searchParams.get('room') || undefined;
    const bookingId = searchParams.get('bookingId') || searchParams.get('booking') || undefined;
    const cardTypeRaw = searchParams.get('cardType') || searchParams.get('type') || undefined;
    const accessResultRaw = searchParams.get('accessResult') || searchParams.get('result') || undefined;
    const startDate = searchParams.get('startDate') || searchParams.get('start') || undefined;
    const endDate = searchParams.get('endDate') || searchParams.get('end') || undefined;
    const search = searchParams.get('search') || searchParams.get('q') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const cardType = cardTypeRaw as RfidHistoryCardType | 'ALL' | undefined;
    const accessResult = accessResultRaw as RfidHistoryAccessResult | 'ALL' | undefined;

    const result = getGlobalRfidHistory({
      roomNumber,
      bookingId,
      cardType,
      accessResult,
      startDate,
      endDate,
      search,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query global RFID history';
    console.error('[API /api/rfid/history ERROR]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
