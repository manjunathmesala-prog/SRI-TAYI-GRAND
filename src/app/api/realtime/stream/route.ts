import { NextRequest } from 'next/server';
import { repo } from '@/lib/db/repository';
import { RealtimeMessage } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const headerLastId = request.headers.get('last-event-id');
  const queryLastId = url.searchParams.get('lastEventId');
  const lastEventId = parseInt(headerLastId || queryLastId || '0', 10);

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendFrame = (id: number, event: string, data: any) => {
        try {
          const payload = `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream closed
        }
      };

      const sendComment = (comment: string) => {
        try {
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        } catch {
          // Stream closed
        }
      };

      // 1. Replay missed events if client reconnected with Last-Event-ID
      if (lastEventId > 0) {
        const missedEvents = repo.getEventsSince(lastEventId);
        for (const msg of missedEvents) {
          sendFrame(msg.eventId, msg.eventType, msg);
        }
      }

      // 2. Initial connection handshake
      const initialCurrentId = repo.getCurrentEventId();
      sendFrame(initialCurrentId, 'connection_established', {
        status: 'connected',
        currentEventId: initialCurrentId,
        hotel: 'Sri Tayi Grand, Kadiri',
        timestamp: new Date().toISOString(),
      });

      // 3. Subscribe to domain broadcast bus
      unsubscribe = repo.subscribeEvents((msg: RealtimeMessage) => {
        sendFrame(msg.eventId, msg.eventType, msg);
      });

      // 4. Heartbeat keep-alive every 15s
      heartbeatInterval = setInterval(() => {
        sendComment('heartbeat');
      }, 15000);
    },
    cancel() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (unsubscribe) unsubscribe();
    },
  });

  request.signal.addEventListener('abort', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
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
