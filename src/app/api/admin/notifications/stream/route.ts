import { NextRequest } from 'next/server';
import { verifyStaffRole } from '@/lib/auth';
import { notificationEngine } from '@/lib/notifications/engine';
import { SuperAdminNotification } from '@/lib/notifications/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Strict Security Enforcement: Only authenticated Super Admin can join private alert channel
  const auth = verifyStaffRole(request, ['Super Admin']);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({
        success: false,
        error: auth.error || 'Access denied. Super Admin role required for real-time notification stream.',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendFrame = (event: string, data: any) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Client disconnected
        }
      };

      const sendComment = (text: string) => {
        try {
          controller.enqueue(encoder.encode(`: ${text}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      // 1. Initial Handshake Frame
      const current = notificationEngine.getNotifications('all', 10);
      sendFrame('connected', {
        status: 'authenticated',
        channel: 'admin-notifications',
        recipient: 'Super Admin',
        unreadCount: current.unreadCount,
        timestamp: new Date().toISOString(),
      });

      // 2. Subscribe to real-time notification engine
      unsubscribe = notificationEngine.subscribe((notif: SuperAdminNotification) => {
        sendFrame('notification', notif);
      });

      // 3. Heartbeat keep-alive every 15s
      heartbeatTimer = setInterval(() => {
        sendComment('heartbeat');
      }, 15000);
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (unsubscribe) unsubscribe();
    },
  });

  request.signal.addEventListener('abort', () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (unsubscribe) unsubscribe();
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
