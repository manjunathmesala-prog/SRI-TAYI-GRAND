import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

/**
 * Sri Tayi Grand - RFID Hardware Bridge Tap & Audit Ingestion Webhook
 * Endpoint: POST /api/admin/rfid-logs
 * Receives every card tap, key issuance, and checkout event from SriTayiGrandKeycardBridge.exe or lock readers
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      event_type,   // 'TAP_READ' | 'TAP_ACTIVATE' | 'TAP_DEACTIVATE' | 'TAP_READ_FAIL' | 'TAP_ACTIVATE_FAIL' | 'DOOR_UNLOCK'
      room_number,  // e.g. "205"
      card_no,      // e.g. "182947"
      card_uid,     // e.g. "SA-LIFETIME-001" or "CLN-HK-101"
      card_type,    // 'super_admin' | 'cleaner' | 'guest'
      begin_time,   // e.g. "2611042130"
      end_time,     // e.g. "2611051100"
      staff_user,   // e.g. "Front Desk"
      holder_name,  // e.g. "M. S. Reddy"
      status,       // "SUCCESS" or error description
      timestamp,    // "2026-11-05 01:50:00"
    } = data;

    // Map bridge event type to repository event type
    const isGranted = status === 'SUCCESS' && !event_type?.includes('FAIL');
    const repoEventType = isGranted ? 'access_granted' : 'access_denied';

    const effectiveUid = card_uid || (card_no && card_no !== '0' ? `BT-57-${card_no}` : `BT-RAW-${room_number || 'UNKNOWN'}`);

    // If card_type is not provided, detect from card_uid prefix
    let detectedType = card_type;
    if (!detectedType) {
      if (effectiveUid.startsWith('SA-')) detectedType = 'super_admin';
      else if (effectiveUid.startsWith('CLN-')) detectedType = 'cleaner';
      else detectedType = 'guest';
    }

    // Determine action type
    let actionType: 'door_unlock' | 'door_lock' | 'cleaning_started' | 'cleaning_completed' | 'unauthorized_attempt' = 'door_unlock';
    if (!isGranted) {
      actionType = 'unauthorized_attempt';
    } else if (event_type === 'CLEANING_START') {
      actionType = 'cleaning_started';
    } else if (event_type === 'CLEANING_COMPLETE') {
      actionType = 'cleaning_completed';
    }

    // Log to repository
    const logged = repo.logRFIDEvent({
      card_uid: effectiveUid,
      card_type: detectedType,
      card_label: `${detectedType.toUpperCase()} Card`,
      device_name: room_number ? `Lock-Room-${room_number}` : 'Be-Tech-BIS-57-USB-Encoder',
      room_number: room_number || 'N/A',
      event_type: repoEventType,
      action_type: actionType,
      holder_name: holder_name || staff_user || 'Front Desk',
      source: room_number ? 'lock_reader' : 'encoder',
      reason: `[${event_type}] Staff/Holder: ${holder_name || staff_user || 'Front Desk'} | Status: ${status}${
        begin_time && end_time ? ` | Valid: ${begin_time} - ${end_time}` : ''
      }`,
    });

    console.log(
      `[RFID HARDWARE TAP] ${timestamp || new Date().toISOString()} | ${event_type} | Room: ${room_number} | Card: ${effectiveUid} | Type: ${detectedType} | Status: ${status}`
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
 * Fetch recent RFID hardware events for front-desk audit with filtering
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let events = repo.getRFIDEvents();

    if (room && room !== 'all') {
      events = events.filter((e) => e.room_number === room);
    }

    if (type && type !== 'all') {
      events = events.filter((e) => e.card_type === type);
    }

    const mapped = events.slice(0, limit).map((e) => ({
      ...e,
      timestamp: e.occurred_at,
      status: e.event_type === 'access_granted' ? 'SUCCESS' : 'DENIED',
    }));

    return NextResponse.json({
      success: true,
      total: events.length,
      events: mapped,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to query RFID logs';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
