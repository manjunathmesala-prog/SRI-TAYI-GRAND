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
  const auth = verifyStaffRole(request, ['Super Admin']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, id, markAll } = body;

    if (action === 'mark_read' || !action) {
      notificationEngine.markAsRead(id, Boolean(markAll));
      return NextResponse.json({ success: true, message: 'Notification(s) marked as read' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = verifyStaffRole(request, ['Super Admin']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || undefined;
    const clearAll = url.searchParams.get('clearAll') === 'true';

    notificationEngine.clearNotifications(id, clearAll);
    return NextResponse.json({ success: true, message: 'Notification(s) cleared' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
