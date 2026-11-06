'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { RealtimeEventType, RealtimeMessage } from '@/types';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

interface UseRealtimeSyncOptions {
  onEvent?: (event: RealtimeMessage) => void;
  onRefresh?: () => void;
  filterTypes?: RealtimeEventType[];
  enabled?: boolean;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { onEvent, onRefresh, filterTypes, enabled = true } = options;
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastEventId, setLastEventId] = useState<number>(0);
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const processedIdsRef = useRef<Set<number>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef<number>(1000);
  const isMountedRef = useRef<boolean>(true);

  // Keep latest callbacks in ref to prevent reconnect loops on re-render
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const storedLastId = parseInt(sessionStorage.getItem('stg_last_event_id') || '0', 10);
    const streamUrl = `/api/realtime/stream?lastEventId=${storedLastId}`;

    setStatus(storedLastId > 0 ? 'reconnecting' : 'connecting');

    try {
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!isMountedRef.current) return;
        setStatus('connected');
        backoffRef.current = 1000; // Reset backoff
      };

      const handleIncomingMessage = (event: MessageEvent, eventType: RealtimeEventType) => {
        if (!isMountedRef.current) return;
        try {
          const data: RealtimeMessage = JSON.parse(event.data);
          const evtId = data.eventId || (event.lastEventId ? parseInt(event.lastEventId, 10) : 0);

          // Deduplication Guard: Ignore if already processed (idempotency)
          if (evtId > 0) {
            if (processedIdsRef.current.has(evtId)) {
              return;
            }
            processedIdsRef.current.add(evtId);
            if (processedIdsRef.current.size > 1000) {
              // Keep memory bounded
              const first = Array.from(processedIdsRef.current)[0];
              processedIdsRef.current.delete(first);
            }
            setLastEventId(evtId);
            sessionStorage.setItem('stg_last_event_id', evtId.toString());
          }

          setLastMessage(data);

          // Filtering check
          if (!filterTypes || filterTypes.includes(data.eventType)) {
            if (onEventRef.current) {
              onEventRef.current(data);
            }
            if (onRefreshRef.current) {
              onRefreshRef.current();
            }
          }
        } catch {
          // Parsing error or handshake comment
        }
      };

      // Listen for all hotel domain event types
      const allEventTypes: RealtimeEventType[] = [
        'booking_created',
        'booking_updated',
        'walk_in_created',
        'room_assigned',
        'check_in',
        'check_out',
        'payment_recorded',
        'expense_created',
        'expense_deleted',
        'daily_closing',
        'housekeeping_updated',
        'rfid_event',
        'full_sync',
      ];

      allEventTypes.forEach((type) => {
        es.addEventListener(type, (e) => handleIncomingMessage(e, type));
      });

      es.onerror = () => {
        if (!isMountedRef.current) return;
        setStatus('reconnecting');
        es.close();
        eventSourceRef.current = null;

        // Exponential backoff reconnect
        const delay = Math.min(backoffRef.current, 10000);
        backoffRef.current *= 1.5;

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, delay);
      };
    } catch {
      setStatus('offline');
    }
  }, [enabled, filterTypes]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return {
    status,
    isConnected: status === 'connected',
    lastEventId,
    lastMessage,
    reconnect: connect,
  };
}

// ==============================================================================
// AUTHORITATIVE ADMIN OPERATIONS CLIENT HELPER
// ==============================================================================

export const adminOperations = {
  async fetchFullState() {
    const res = await fetch('/api/admin/operations', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch authoritative state`);
    return res.json();
  },

  async checkIn(params: {
    bookingReference: string;
    roomId?: string;
    roomNumber?: string;
    issueRfid?: boolean;
    staffName?: string;
  }) {
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_in', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Check-in failed');
    return data;
  },

  async checkOut(params: {
    bookingReference: string;
    additionalCharges?: number;
    chargeDescription?: string;
    settlementMethod?: string;
    staffName?: string;
  }) {
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_out', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Check-out failed');
    return data;
  },

  async assignRoom(params: {
    roomId: string;
    bookingReference: string;
    guestName?: string;
    staffName?: string;
  }) {
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assign_room', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Room allocation failed');
    return data;
  },

  async updateHousekeeping(params: {
    roomId: string;
    housekeepingStatus: string;
    operationalStatus?: string;
    notes?: string;
    staffName?: string;
  }) {
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'housekeeping', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Housekeeping update failed');
    return data;
  },

  async updateBookingStatus(params: {
    bookingReference: string;
    status: string;
    notes?: string;
    staffName?: string;
  }) {
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'booking_status', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Booking status update failed');
    return data;
  },

  async recordPayment(params: {
    bookingReference: string;
    guestName: string;
    amount: number;
    paymentMethod: string;
    staffName?: string;
  }) {
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'record_payment', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Payment recording failed');
    return data;
  },
};
