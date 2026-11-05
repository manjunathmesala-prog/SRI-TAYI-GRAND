import { NextResponse } from 'next/server';

/**
 * Sri Tayi Grand - RFID Tap & Keycard Audit API
 * Endpoint: POST /api/admin/rfid-logs
 * Receives every card tap, key issue, and check-out event from the hardware bridge
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      event_type,   // 'TAP_READ' | 'TAP_ACTIVATE' | 'TAP_DEACTIVATE' | 'TAP_READ_FAIL'
      room_number,  // e.g. "205"
      card_no,      // e.g. 182947
      begin_time,   // e.g. "2611042130"
      end_time,     // e.g. "2611051100"
      staff_user,   // e.g. "reception_admin"
      status,       // "SUCCESS" or error description
      timestamp     // "2026-11-04 21:30:15"
    } = data;

    // 1. Log to console / monitoring
    console.log(`[RFID TAP AUDIT] ${timestamp} | ${event_type} | Room: ${room_number} | Staff: ${staff_user} | Status: ${status}`);

    // 2. Persist to your database (e.g. Prisma / Supabase / MongoDB / SQL):
    /*
    await prisma.rfidAuditLog.create({
      data: {
        eventType: event_type,
        roomNumber: room_number,
        cardNo: String(card_no),
        beginTime: begin_time,
        endTime: end_time,
        staffUser: staff_user,
        status: status,
        createdAt: new Date(timestamp)
      }
    });
    */

    return NextResponse.json({ success: true, message: 'Tap recorded in admin log' });
  } catch (error: any) {
    console.error('RFID audit log error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // Fetch recent logs for the Admin Dashboard table
  /*
  const logs = await prisma.rfidAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  return NextResponse.json(logs);
  */
  return NextResponse.json([]);
}
