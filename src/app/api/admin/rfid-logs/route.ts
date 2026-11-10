import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { recordRfidTapAsync } from '@/lib/rfid/tap-logger';

// Sliding-window in-memory deduplication cache for bridge webhook calls (1500ms)
const recentWebhookSignatures = new Map<string, number>();

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

    // Deduplication check for high-frequency bridge retries
    const now = Date.now();
    const sig = `${card_uid || card_no || ''}_${room_number || ''}_${event_type || ''}_${status || ''}`;
    const lastTap = recentWebhookSignatures.get(sig);
    if (lastTap && now - lastTap < 1500) {
      return NextResponse.json({
        success: true,
        message: 'Duplicate bridge webhook event acknowledged without double-recording',
        deduplicated: true,
      });
    }
    recentWebhookSignatures.set(sig, now);
    if (recentWebhookSignatures.size > 200) {
      for (const [k, t] of recentWebhookSignatures.entries()) {
        if (now - t > 10000) recentWebhookSignatures.delete(k);
      }
    }

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

    // Also persist into asynchronous safe tap logger & Supabase tap table
    if (room_number && room_number !== 'N/A') {
      recordRfidTapAsync({
        cardUid: effectiveUid,
        roomNumber: room_number,
        result: {
          success: isGranted,
          message: status,
          reason: !isGranted ? `[${event_type}] ${status}` : undefined,
        },
        cardType: detectedType,
        customTimestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      }).catch((err) => {
        console.error('[TAP LOGGER ASYNC NON-BLOCKING ERROR]', err);
      });
    }

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
 * Fetch recent RFID hardware events for front-desk audit with multi-dimensional filtering, KPI metrics & pagination
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim();
    const room = searchParams.get('room');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const action = searchParams.get('action');
    const booking = searchParams.get('booking');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '100', 10)));

    let events = repo.getRFIDEvents();

    // Universal free-text search (Room, Guest, Card UID, Booking Ref, Device)
    if (search) {
      events = events.filter((e) =>
        (e.room_number && e.room_number.toLowerCase().includes(search)) ||
        (e.card_uid && e.card_uid.toLowerCase().includes(search)) ||
        (e.holder_name && e.holder_name.toLowerCase().includes(search)) ||
        (e.booking_reference && e.booking_reference.toLowerCase().includes(search)) ||
        (e.device_name && e.device_name.toLowerCase().includes(search))
      );
    }

    if (room && room !== 'all') {
      events = events.filter((e) => e.room_number === room);
    }

    if (type && type !== 'all') {
      events = events.filter((e) => e.card_type === type);
    }

    if (status && status !== 'all') {
      if (status === 'access_granted' || status === 'granted' || status === 'SUCCESS') {
        events = events.filter((e) => e.event_type === 'access_granted');
      } else if (status === 'access_denied' || status === 'denied' || status === 'DENIED') {
        events = events.filter((e) => e.event_type === 'access_denied');
      }
    }

    if (action && action !== 'all') {
      events = events.filter((e) => e.action_type === action);
    }

    if (booking && booking !== 'all') {
      events = events.filter((e) => e.booking_reference === booking);
    }

    if (startDate) {
      const startMs = new Date(startDate).getTime();
      events = events.filter((e) => new Date(e.occurred_at).getTime() >= startMs);
    }

    if (endDate) {
      const endMs = new Date(endDate).getTime();
      events = events.filter((e) => new Date(e.occurred_at).getTime() <= endMs);
    }

    // Calculate live telemetry metrics
    const totalCount = events.length;
    const grantedCount = events.filter((e) => e.event_type === 'access_granted').length;
    const deniedCount = events.filter((e) => e.event_type === 'access_denied').length;
    const uniqueCards = new Set(events.map((e) => e.card_uid).filter(Boolean)).size;
    const firstAccess = events.length > 0 ? events[events.length - 1].occurred_at : null;
    const latestTap = events.length > 0 ? events[0].occurred_at : null;

    // Slice for page
    const offset = (page - 1) * limit;
    const paginatedEvents = events.slice(offset, offset + limit);

    const mapped = paginatedEvents.map((e) => ({
      ...e,
      timestamp: e.occurred_at,
      status: e.event_type === 'access_granted' ? 'SUCCESS' : 'DENIED',
    }));

    return NextResponse.json({
      success: true,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      metrics: {
        total: totalCount,
        granted: grantedCount,
        denied: deniedCount,
        uniqueCards,
        firstAccess,
        latestTap,
      },
      events: mapped,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to query RFID logs';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
