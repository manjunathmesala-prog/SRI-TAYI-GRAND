'use client';

import { useEffect, useState, useRef } from 'react';
import { RealtimeEventType, RealtimeMessage } from '@/types';
import { authStorage } from './auth-storage';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

interface UseRealtimeSyncOptions {
  onEvent?: (event: RealtimeMessage) => void;
  onRefresh?: () => void;
  filterTypes?: RealtimeEventType[];
  enabled?: boolean;
}

// ==============================================================================
// GLOBAL BROWSER SINGLETON REALTIME SSE CLIENT
// Maintains exactly ONE EventSource connection shared across the entire app.
// Eliminates HTTP/1.1 socket exhaustion and makes route navigation instantaneous.
// ==============================================================================

type RealtimeListener = {
  id: string;
  onEvent?: (event: RealtimeMessage) => void;
  onRefresh?: () => void;
  filterTypes?: Set<RealtimeEventType>;
};

class RealtimeSingleton {
  private es: EventSource | null = null;
  private status: ConnectionStatus = 'connecting';
  private listeners: Map<string, RealtimeListener> = new Map();
  private statusListeners: Set<(s: ConnectionStatus) => void> = new Set();
  private processedIds: Set<number> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private backoffMs = 1000;
  private lastMessage: RealtimeMessage | null = null;
  private lastEventId = 0;

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getLastMessage(): RealtimeMessage | null {
    return this.lastMessage;
  }

  public getLastEventId(): number {
    return this.lastEventId;
  }

  public subscribeStatus(cb: (s: ConnectionStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.set(listener.id, listener);
    this.ensureConnected();
    return () => {
      this.listeners.delete(listener.id);
    };
  }

  private setStatus(s: ConnectionStatus) {
    if (this.status !== s) {
      this.status = s;
      this.statusListeners.forEach((cb) => {
        try { cb(s); } catch {}
      });
    }
  }

  public ensureConnected() {
    if (typeof window === 'undefined') return;
    if (this.es && (this.es.readyState === EventSource.OPEN || this.es.readyState === EventSource.CONNECTING)) {
      return;
    }

    if (this.es) {
      try { this.es.close(); } catch {}
      this.es = null;
    }

    const storedLastId = parseInt(sessionStorage.getItem('stg_last_event_id') || '0', 10);
    const streamUrl = `/api/realtime/stream?lastEventId=${storedLastId}`;

    this.setStatus(storedLastId > 0 ? 'reconnecting' : 'connecting');

    try {
      const es = new EventSource(streamUrl);
      this.es = es;

      es.onopen = () => {
        this.setStatus('connected');
        this.backoffMs = 1000;
      };

      const handleMsg = (event: MessageEvent, eventType: RealtimeEventType) => {
        try {
          const data: RealtimeMessage = JSON.parse(event.data);
          const evtId = data.eventId || (event.lastEventId ? parseInt(event.lastEventId, 10) : 0);

          if (evtId > 0) {
            if (this.processedIds.has(evtId)) return;
            this.processedIds.add(evtId);
            if (this.processedIds.size > 1000) {
              const first = Array.from(this.processedIds)[0];
              this.processedIds.delete(first);
            }
            this.lastEventId = evtId;
            sessionStorage.setItem('stg_last_event_id', evtId.toString());
          }

          const msgWithAliases: RealtimeMessage = {
            ...data,
            type: data.type || data.eventType || eventType,
            eventType: data.eventType || data.type || eventType,
          };

          this.lastMessage = msgWithAliases;

          // Invalidate client-side full state and cashbook caches on any real-time mutation
          adminOperations.invalidateFullState();
          cashbookClient.invalidate();

          // Notify all registered listeners
          this.listeners.forEach((sub) => {
            if (!sub.filterTypes || sub.filterTypes.has(msgWithAliases.eventType)) {
              if (sub.onEvent) {
                try { sub.onEvent(msgWithAliases); } catch {}
              }
              if (sub.onRefresh) {
                try { sub.onRefresh(); } catch {}
              }
            }
          });
        } catch {}
      };

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
        'cash_shift_opened',
        'cash_shift_closed',
        'cash_transaction_created',
        'maintenance_ticket_created',
        'maintenance_ticket_updated',
        'maintenance_ticket_deleted',
        'folio_charge_added',
        'folio_charge_deleted',
        'full_sync',
      ];

      allEventTypes.forEach((type) => {
        es.addEventListener(type, (e) => handleMsg(e, type));
      });

      es.onerror = () => {
        this.setStatus('reconnecting');
        try { es.close(); } catch {}
        this.es = null;

        const delay = Math.min(this.backoffMs, 10000);
        this.backoffMs *= 1.5;

        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.ensureConnected();
        }, delay);
      };
    } catch {
      this.setStatus('offline');
    }
  }

  public reconnect() {
    this.backoffMs = 1000;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.es) {
      try { this.es.close(); } catch {}
      this.es = null;
    }
    this.ensureConnected();
  }
}

// Global browser instance
const realtimeSingleton = new RealtimeSingleton();

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { onEvent, onRefresh, filterTypes, enabled = true } = options;
  const [status, setStatus] = useState<ConnectionStatus>(realtimeSingleton.getStatus());
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(realtimeSingleton.getLastMessage());
  const [lastEventId, setLastEventId] = useState<number>(realtimeSingleton.getLastEventId());

  const listenerIdRef = useRef<string>(Math.random().toString(36).slice(2));

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const filterTypesKey = filterTypes ? filterTypes.join(',') : '';
  const filterSetRef = useRef<Set<RealtimeEventType> | undefined>(
    filterTypes ? new Set(filterTypes) : undefined
  );
  useEffect(() => {
    filterSetRef.current = filterTypes ? new Set(filterTypes) : undefined;
  }, [filterTypesKey, filterTypes]);

  useEffect(() => {
    if (!enabled) return;

    const unsubStatus = realtimeSingleton.subscribeStatus(setStatus);
    const unsubMessage = realtimeSingleton.subscribe({
      id: listenerIdRef.current,
      onEvent: (msg) => {
        setLastMessage(msg);
        setLastEventId(realtimeSingleton.getLastEventId());
        if (onEventRef.current) onEventRef.current(msg);
      },
      onRefresh: () => {
        if (onRefreshRef.current) onRefreshRef.current();
      },
      filterTypes: filterSetRef.current,
    });

    return () => {
      unsubStatus();
      unsubMessage();
    };
  }, [enabled]);

  return {
    status,
    isConnected: status === 'connected',
    lastEventId,
    lastMessage,
    lastEvent: lastMessage,
    reconnect: () => realtimeSingleton.reconnect(),
  };
}

// ==============================================================================
// AUTHORITATIVE ADMIN OPERATIONS CLIENT HELPER (WITH IN-MEMORY SWR CACHE)
// ==============================================================================

function getAdminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (typeof window !== 'undefined') {
    const token = authStorage.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

let cachedFullState: any = null;
let cachedFullStateTimestamp = 0;
const FULL_STATE_TTL_MS = 25000; // 25s TTL, invalidated instantly on SSE events or mutations
let pendingFullStatePromise: Promise<any> | null = null;

// Deduplicated Cashbook Client
let cachedCashBalance: number | null = null;
let cachedCashBalanceTimestamp = 0;
let pendingCashBalancePromise: Promise<number | null> | null = null;

export const cashbookClient = {
  invalidate() {
    cachedCashBalance = null;
    cachedCashBalanceTimestamp = 0;
  },

  async getBalance(force = false): Promise<number | null> {
    const now = Date.now();
    if (!force && cachedCashBalance !== null && (now - cachedCashBalanceTimestamp < 15000)) {
      return cachedCashBalance;
    }

    if (pendingCashBalancePromise && !force) {
      return pendingCashBalancePromise;
    }

    pendingCashBalancePromise = (async () => {
      try {
        const res = await fetch('/api/admin/cashbook', {
          headers: getAdminHeaders({ 'x-staff-role': 'Super Admin' }),
        });
        const data = await res.json();
        if (data.success && typeof data.balance === 'number') {
          cachedCashBalance = data.balance;
          cachedCashBalanceTimestamp = Date.now();
          return data.balance;
        }
        return cachedCashBalance;
      } catch {
        return cachedCashBalance;
      } finally {
        pendingCashBalancePromise = null;
      }
    })();

    return pendingCashBalancePromise;
  },
};

export const adminOperations = {
  invalidateFullState() {
    cachedFullState = null;
    cachedFullStateTimestamp = 0;
  },

  async fetchFullState(force = false) {
    const now = Date.now();
    if (!force && cachedFullState && (now - cachedFullStateTimestamp < FULL_STATE_TTL_MS)) {
      return cachedFullState;
    }

    if (pendingFullStatePromise && !force) {
      return pendingFullStatePromise;
    }

    pendingFullStatePromise = (async () => {
      try {
        const res = await fetch('/api/admin/operations', {
          headers: getAdminHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch authoritative state`);
        const data = await res.json();
        cachedFullState = data;
        cachedFullStateTimestamp = Date.now();
        return data;
      } finally {
        pendingFullStatePromise = null;
      }
    })();

    return pendingFullStatePromise;
  },

  async checkIn(params: {
    bookingReference: string;
    roomId?: string;
    roomNumber?: string;
    issueRfid?: boolean;
    staffName?: string;
    idProofType?: string;
    idProofNumber?: string;
    nationality?: string;
    cityOfOrigin?: string;
    purposeOfVisit?: string;
    collectPayment?: boolean;
    paymentAmount?: number;
    paymentMethod?: string;
  }) {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'check_in', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Check-in failed');
    adminOperations.invalidateFullState();
    if (params.collectPayment) {
      cashbookClient.invalidate();
    }
    return data;
  },

  async checkOut(params: {
    bookingReference: string;
    additionalCharges?: number;
    chargeDescription?: string;
    settlementMethod?: string;
    staffName?: string;
  }) {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'check_out', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Check-out failed');
    adminOperations.invalidateFullState();
    cashbookClient.invalidate();
    return data;
  },

  async cancelCheckout(params: {
    bookingReference: string;
    staffName?: string;
  }) {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'cancel_checkout', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Cancel checkout failed');
    adminOperations.invalidateFullState();
    return data;
  },

  async changeRoom(params: {
    bookingReference: string;
    toRoomIdOrNumber: string;
    reasonCategory: string;
    reasonNotes: string;
    createMaintenanceTicket?: boolean;
    oldRoomAction?: 'maintenance' | 'cleaning';
    staffName?: string;
  }) {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'change_room', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Room change failed');
    adminOperations.invalidateFullState();
    return data;
  },

  async assignRoom(params: {
    roomId: string;
    bookingReference: string;
    guestName?: string;
    staffName?: string;
  }) {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'assign_room', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Room allocation failed');
    adminOperations.invalidateFullState();
    return data;
  },

  async updateHousekeeping(params: {
    roomId: string;
    housekeepingStatus: string;
    operationalStatus?: string;
    notes?: string;
    staffName?: string;
  }) {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'housekeeping', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Housekeeping update failed');
    adminOperations.invalidateFullState();
    return data;
  },

  async updateBookingStatus(params: {
    bookingReference: string;
    status: string;
    notes?: string;
    staffName?: string;
  }) {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'booking_status', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Booking status update failed');
    adminOperations.invalidateFullState();
    return data;
  },

  async recordPayment(params: {
    bookingReference: string;
    guestName: string;
    amount: number;
    paymentMethod: string;
    staffName?: string;
  }) {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'record_payment', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Payment recording failed');
    adminOperations.invalidateFullState();
    cashbookClient.invalidate();
    return data;
  },

  async fetchFolioCharges(bookingIdOrRef: string) {
    const res = await fetch(`/api/admin/bookings/${encodeURIComponent(bookingIdOrRef)}/charges`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch folio charges');
    return data;
  },

  async addFolioCharge(bookingIdOrRef: string, params: {
    category: string;
    description: string;
    amount: number;
    tax_rate?: number;
    posted_by?: string;
  }) {
    const res = await fetch(`/api/admin/bookings/${encodeURIComponent(bookingIdOrRef)}/charges`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add folio charge');
    adminOperations.invalidateFullState();
    return data;
  },

  async deleteFolioCharge(bookingIdOrRef: string, chargeId: string) {
    const res = await fetch(`/api/admin/bookings/${encodeURIComponent(bookingIdOrRef)}/charges?chargeId=${encodeURIComponent(chargeId)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete folio charge');
    adminOperations.invalidateFullState();
    return data;
  },

  async statutoryWalkIn(params: {
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    nationality?: string;
    cityOfOrigin?: string;
    idProofType: string;
    idProofNumber: string;
    purposeOfVisit: string;
    categoryId: string;
    roomNumber: string;
    checkInDate: string;
    checkOutDate: string;
    adultsCount?: number;
    childrenCount?: number;
    baseTariff?: number;
    isTariffOverridden?: boolean;
    tariffOverrideReason?: string;
    paymentMethod: string;
    amountCollected?: number;
    paymentReference?: string;
    issueKeycard?: boolean;
    cardUid?: string;
    specialRequests?: string;
    staffName?: string;
  }) {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'statutory_walk_in', ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Statutory walk-in registration failed');
    adminOperations.invalidateFullState();
    cashbookClient.invalidate();
    return data;
  },

  async createBooking(bookingData: any, actor = 'Front Desk') {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/operations', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'create_booking', bookingData, actor }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create booking');
    adminOperations.invalidateFullState();
    return data;
  },

  async assignHousekeeper(roomId: string, staffId: string, staffName: string) {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/housekeeping', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'assign_housekeeper', roomId, staffId, staffName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to assign housekeeper');
    adminOperations.invalidateFullState();
    return data;
  },

  async completeHousekeepingTurnaround(params: {
    roomId: string;
    checklist: any;
    inspectedBy?: string;
  }) {
    adminOperations.invalidateFullState();
    const res = await fetch('/api/admin/housekeeping', {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action: 'complete_turnaround',
        roomId: params.roomId,
        checklist: params.checklist,
        inspectedBy: params.inspectedBy,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete turnaround inspection');
    adminOperations.invalidateFullState();
    return data;
  },
};
