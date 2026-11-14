import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffRole } from '@/lib/auth';
import { notificationEngine } from '@/lib/notifications/engine';
import { NotificationCategoryFilter } from '@/lib/notifications/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = verifyStaffRole(request, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
  }

  const url = new URL(request.url);
  const filter = (url.searchParams.get('category') || 'all') as NotificationCategoryFilter;
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));

  const result = notificationEngine.getNotifications(filter, limit);

  return NextResponse.json({
    success: true,
    ...result,
  });
}

export async function POST(request: NextRequest) {
  const auth = verifyStaffRole(request, ['Super Admin', 'Hotel Manager']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, id, markAll } = body;

    if (action === 'mark_read' || !action) {
      await notificationEngine.markAsRead(id, Boolean(markAll));
      return NextResponse.json({ success: true, message: 'Notification(s) marked as read' });
    }

    if (action === 'simulate_event' || action === 'test_alert') {
      const testTypes = [
        'EVENT_CHECK_IN',
        'EVENT_TRANSACTION',
        'EVENT_RFID_TAP',
        'EVENT_NEW_BOOKING',
        'EVENT_CHECK_OUT',
      ] as const;
      const chosenType = (body.eventType ||
        testTypes[Math.floor(Math.random() * testTypes.length)]) as typeof testTypes[number];

      let payload: any = {};
      if (chosenType === 'EVENT_CHECK_IN') {
        payload = {
          guestName: body.guestName || 'Srikanth Reddy',
          roomNumber: body.roomNumber || '204',
          bookingReference: `STG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-204`,
          staffName: 'Reception Desk',
        };
      } else if (chosenType === 'EVENT_TRANSACTION') {
        payload = {
          transactionId: `pay_demo_${Date.now()}`,
          amount: body.amount || 4500,
          currency: 'INR',
          method: 'upi',
          payerName: body.payerName || 'Chinna Sai',
          bookingReference: 'STG-DEMO-PAY',
          status: 'captured',
        };
      } else if (chosenType === 'EVENT_RFID_TAP') {
        payload = {
          deviceId: 'reader-102',
          location: body.location || 'Room 102',
          cardUid: '04A1B2C3D4',
          holderName: body.holderName || 'Venkata Rao',
          cardType: 'guest',
          result: 'GRANTED',
          reason: 'Authorized keycard tap',
        };
      } else if (chosenType === 'EVENT_NEW_BOOKING') {
        payload = {
          bookingReference: `STG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-771`,
          customerName: body.customerName || 'Kavitha Devi',
          roomCategory: 'Executive Suite',
          roomsCount: 1,
          checkInDate: new Date().toISOString().slice(0, 10),
          checkOutDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          totalAmount: 3200,
          source: 'online',
        };
      } else {
        payload = {
          guestName: body.guestName || 'Ramesh Babu',
          roomNumber: body.roomNumber || '105',
          bookingReference: 'STG-DEMO-OUT',
          balanceStatus: 'settled',
        };
      }

      const notification = await notificationEngine.dispatch({
        eventType: chosenType,
        payload,
      });

      return NextResponse.json({
        success: true,
        message: 'Telemetry test alert dispatched successfully',
        notification,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = verifyStaffRole(request, ['Super Admin', 'Hotel Manager']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || undefined;
    const clearAll = url.searchParams.get('clearAll') === 'true';

    await notificationEngine.clearNotifications(id, clearAll);
    return NextResponse.json({ success: true, message: 'Notification(s) cleared' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
