import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

/**
 * Sri Tayi Grand - RFID Hardware Bridge Tap & Audit Ingestion Webhook
 * Endpoint: POST /api/admin/rfid-logs
 * Receives every card tap, key issuance, and checkout event from SriAnanthaKeycardBridge.exe
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      event_type,   // 'TAP_READ' | 'TAP_ACTIVATE' | 'TAP_DEACTIVATE' | 'TAP_READ_FAIL' | 'TAP_ACTIVATE_FAIL'
      room_number,  // e.g. "205"
      card_no,      // e.g. "182947"
      begin_time,   // e.g. "2611042130"
      end_time,     // e.g. "2611051100"
      staff_user,   // e.g. "Front Desk"
      status,       // "SUCCESS" or error description
      timestamp,    // "2026-11-05 01:50:00"
    } = data;

    // Map bridge event type to repository event type
    const isGranted = status === 'SUCCESS' && !event_type?.includes('FAIL');
    const repoEventType = isGranted ? 'access_granted' : 'access_denied';

    const cardUid = card_no && card_no !== '0' ? `BT-57-${card_no}` : `BT-RAW-${room_number || 'UNKNOWN'}`;

    // Log to repository
    const logged = repo.logRFIDEvent({
      card_uid: cardUid,
      device_name: 'Be-Tech-BIS-57-USB-Encoder',
      room_number: room_number || 'N/A',
      event_type: repoEventType,
      source: 'encoder',
      reason: `[${event_type}] Staff: ${staff_user || 'Front Desk'} | Status: ${status}${
        begin_time && end_time ? ` | Valid: ${begin_time} - ${end_time}` : ''
      }`,
    });

    console.log(
      `[RFID HARDWARE TAP] ${timestamp || new Date().toISOString()} | ${event_type} | Room: ${room_number} | Card: ${card_no} | Status: ${status}`
    );

    return NextResponse.json({
      success: true,
      message: 'Hardware tap successfully audited in Sri Tayi Grand database',
      eventId: logged.id,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Audit log ingestion error';
    console.error('RFID audit webhook error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * Fetch recent RFID hardware events for front-desk audit
 */
export async function GET() {
  try {
    const events = repo.getRFIDEvents();
    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to query RFID logs';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
