import { supabaseAdmin } from '@/lib/supabase/client';
import { getSupabasePgPool } from '@/lib/db/supabase-sync';
import {
  NotificationEventType,
  NotificationSeverity,
  NotificationEventInput,
  SuperAdminNotification,
  CheckInPayload,
  CheckOutPayload,
  TransactionPayload,
  NewBookingPayload,
  RfidTapPayload,
  NotificationCategoryFilter,
} from './types';

// In-memory ring buffer for low-latency delivery & SSR hydration
const MAX_IN_MEMORY_NOTIFS = 250;
const inMemoryNotifications: SuperAdminNotification[] = [];

// Dedicated Super Admin SSE subscriber set
type NotificationListener = (notification: SuperAdminNotification) => void;
const subscribers = new Set<NotificationListener>();

// RFID 3-second deduplication cache: `${cardUid}:${location}` -> timestamp
const rfidDedupeCache = new Map<string, number>();
const RFID_DEDUPE_WINDOW_MS = 3000;

class NotificationEngine {
  private isHydrated = false;
  private isHydrating = false;
  /**
   * Subscribe an active SSE connection to real-time Super Admin alerts
   */
  public subscribe(listener: NotificationListener): () => void {
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  }

  /**
   * Formats event into standard title, alert message, and severity tier
   */
  private formatNotification(input: NotificationEventInput): {
    title: string;
    message: string;
    severity: NotificationSeverity;
    metadata: Record<string, any>;
  } {
    const { eventType, payload } = input;

    switch (eventType) {
      case 'EVENT_CHECK_IN': {
        const p = payload as CheckInPayload;
        const guest = p.guestName || 'Guest';
        const room = p.roomNumber || 'Room';
        return {
          title: 'Guest Check-In',
          message: `🟢 [Check-In] ${guest} checked into Room ${room}.`,
          severity: input.severity || 'SUCCESS',
          metadata: {
            deepLink: `/admin/bookings`,
            bookingReference: p.bookingReference,
            roomNumber: p.roomNumber,
            staffName: p.staffName,
            ...input.metadata,
          },
        };
      }

      case 'EVENT_CHECK_OUT': {
        const p = payload as CheckOutPayload;
        const guest = p.guestName || 'Guest';
        const duesText =
          p.balanceStatus === 'settled'
            ? 'All dues settled.'
            : `Pending dues: ₹${(p.outstandingAmount || 0).toLocaleString('en-IN')}`;
        return {
          title: 'Guest Check-Out',
          message: `🔵 [Check-Out] ${guest} checked out. ${duesText}`,
          severity: input.severity || 'INFO',
          metadata: {
            deepLink: `/admin/bookings`,
            bookingReference: p.bookingReference,
            roomNumber: p.roomNumber,
            balanceStatus: p.balanceStatus,
            ...input.metadata,
          },
        };
      }

      case 'EVENT_TRANSACTION': {
        const p = payload as TransactionPayload;
        const amountStr = `₹${(p.amount || 0).toLocaleString('en-IN')}`;
        const payer = p.payerName || 'Guest';
        const method = (p.method || 'payment').toUpperCase();
        const refStr = p.bookingReference ? ` (Booking #${p.bookingReference})` : '';

        const isSuccess = p.status === 'captured' || p.status === 'paid' || p.status === 'success';
        const severity = isSuccess ? 'SUCCESS' : 'CRITICAL';
        const title = isSuccess ? 'Payment Received' : 'Transaction Alert';
        const message = isSuccess
          ? `💰 [Payment Received] ${amountStr} received from ${payer} via ${method}${refStr}.`
          : `🚨 [Transaction ${p.status.toUpperCase()}] ${amountStr} from ${payer} via ${method}${refStr}.`;

        return {
          title,
          message,
          severity: input.severity || severity,
          metadata: {
            deepLink: `/admin/payments`,
            transactionId: p.transactionId,
            bookingReference: p.bookingReference,
            amount: p.amount,
            method: p.method,
            status: p.status,
            ...input.metadata,
          },
        };
      }

      case 'EVENT_NEW_BOOKING': {
        const p = payload as NewBookingPayload;
        const category = p.roomCategory || 'Room';
        const customer = p.customerName || 'Customer';
        const ref = p.bookingReference || '';
        return {
          title: 'New Reservation',
          message: `📅 [New Booking] New reservation received for ${category} by ${customer} (#${ref}).`,
          severity: input.severity || 'INFO',
          metadata: {
            deepLink: `/admin/bookings`,
            bookingReference: p.bookingReference,
            roomCategory: p.roomCategory,
            totalAmount: p.totalAmount,
            checkInDate: p.checkInDate,
            checkOutDate: p.checkOutDate,
            ...input.metadata,
          },
        };
      }

      case 'EVENT_RFID_TAP': {
        const p = payload as RfidTapPayload;
        const isGranted = p.result === 'GRANTED';
        const location = p.location || 'Door Reader';
        const holder = p.holderName || (p.cardType ? `Authorized ${p.cardType}` : 'Keycard');

        const title = isGranted ? 'RFID Access Granted' : 'RFID Security Alert';
        const message = isGranted
          ? `💳 [RFID Tap] Access GRANTED: ${holder} at ${location}.`
          : `🚨 [RFID ALERT] Access DENIED: ${p.reason || 'Unregistered card'} at ${location}.`;

        return {
          title,
          message,
          severity: input.severity || (isGranted ? 'INFO' : 'WARNING'),
          metadata: {
            deepLink: `/admin/rfid`,
            cardUid: p.cardUid,
            location: p.location,
            result: p.result,
            reason: p.reason,
            cardType: p.cardType,
            ...input.metadata,
          },
        };
      }

      default: {
        return {
          title: input.title || 'System Notification',
          message: input.message || 'New system event recorded.',
          severity: input.severity || 'INFO',
          metadata: input.metadata || {},
        };
      }
    }
  }

  /**
   * Internal non-blocking dispatch handler
   */
  public async dispatch(input: NotificationEventInput): Promise<SuperAdminNotification | null> {
    const { eventType, payload } = input;

    // 1. RFID Batching & Deduplication (3-second throttle on identical card taps)
    if (eventType === 'EVENT_RFID_TAP') {
      const p = payload as RfidTapPayload;
      const dedupeKey = `${p.cardUid || 'unknown'}:${p.location || 'reader'}:${p.result}`;
      const now = Date.now();
      const lastSeen = rfidDedupeCache.get(dedupeKey);

      if (lastSeen && now - lastSeen < RFID_DEDUPE_WINDOW_MS) {
        // Silently skip duplicate rapid tap notification
        return null;
      }
      rfidDedupeCache.set(dedupeKey, now);

      // Clean old cache entries occasionally
      if (rfidDedupeCache.size > 200) {
        for (const [k, time] of rfidDedupeCache.entries()) {
          if (now - time > 10000) rfidDedupeCache.delete(k);
        }
      }
    }

    // 2. Format authoritative notification payload
    const formatted = this.formatNotification(input);

    const notification: SuperAdminNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      recipientId: 'super-admin',
      type: eventType,
      severity: formatted.severity,
      title: input.title || formatted.title,
      message: input.message || formatted.message,
      metadata: formatted.metadata,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // 3. Store in in-memory ring buffer for sub-millisecond retrieval
    inMemoryNotifications.unshift(notification);
    if (inMemoryNotifications.length > MAX_IN_MEMORY_NOTIFS) {
      inMemoryNotifications.pop();
    }

    // 4. Sub-second delivery: Broadcast to all active Super Admin SSE subscribers
    subscribers.forEach((listener) => {
      try {
        listener(notification);
      } catch {
        // Safe catch if client connection severed
      }
    });

    // 5. Asynchronous dual persistence to PostgreSQL and Supabase
    this.persistToDatabase(notification).catch((err) => {
      console.warn('[DATABASE NOTIF PERSIST WARN]', err.message);
    });

    return notification;
  }

  /**
   * Hydrates in-memory cache with persisted notifications from PostgreSQL
   */
  public async hydrateFromDatabase(): Promise<void> {
    if (this.isHydrated || this.isHydrating) return;
    this.isHydrating = true;

    try {
      const db = getSupabasePgPool();
      if (!db) return;

      const client = await db.connect();
      try {
        const res = await client.query(
          `SELECT id, recipient_id, type, severity, title, message, metadata, is_read, read_at, created_at 
           FROM super_admin_notifications 
           ORDER BY created_at DESC 
           LIMIT 100`
        );

        if (res.rows && res.rows.length > 0) {
          const existingIds = new Set(inMemoryNotifications.map((n) => n.id));
          for (const row of res.rows) {
            if (!existingIds.has(row.id)) {
              inMemoryNotifications.push({
                id: row.id,
                recipientId: row.recipient_id || 'super-admin',
                type: row.type as NotificationEventType,
                severity: row.severity as NotificationSeverity,
                title: row.title,
                message: row.message,
                metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
                isRead: Boolean(row.is_read),
                readAt: row.read_at ? new Date(row.read_at).toISOString() : undefined,
                createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
              });
            }
          }
        }
        this.isHydrated = true;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('[NOTIF HYDRATION WARN]', err.message);
    } finally {
      this.isHydrating = false;
    }
  }

  /**
   * Asynchronous database persistence (detached from transaction loop)
   */
  private async persistToDatabase(notif: SuperAdminNotification): Promise<void> {
    // 1. Primary: Direct PostgreSQL pool persistence
    try {
      const db = getSupabasePgPool();
      if (db) {
        const client = await db.connect();
        try {
          await client.query(
            `INSERT INTO super_admin_notifications (
              id, recipient_id, type, severity, title, message, metadata, is_read, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              is_read = EXCLUDED.is_read,
              read_at = EXCLUDED.read_at,
              metadata = EXCLUDED.metadata`,
            [
              notif.id,
              notif.recipientId,
              notif.type,
              notif.severity,
              notif.title,
              notif.message,
              JSON.stringify(notif.metadata || {}),
              notif.isRead,
              notif.createdAt,
            ]
          );
        } finally {
          client.release();
        }
      }
    } catch (err: any) {
      console.warn('[NOTIF PG PERSIST ERROR]', err.message);
    }

    // 2. Secondary: Mirror to Supabase JS if client configured
    try {
      if (supabaseAdmin) {
        await supabaseAdmin.from('super_admin_notifications').upsert({
          id: notif.id,
          recipient_id: notif.recipientId,
          type: notif.type,
          severity: notif.severity,
          title: notif.title,
          message: notif.message,
          metadata: notif.metadata,
          is_read: notif.isRead,
          created_at: notif.createdAt,
        });
      }
    } catch {
      // Non-fatal
    }
  }

  /**
   * Query notifications with category filtering and unread count
   */
  public getNotifications(filter: NotificationCategoryFilter = 'all', limit = 50) {
    if (!this.isHydrated && !this.isHydrating) {
      // Trigger background hydration
      this.hydrateFromDatabase().catch(() => {});
    }

    let list = inMemoryNotifications;

    if (filter === 'financials') {
      list = list.filter((n) => n.type === 'EVENT_TRANSACTION');
    } else if (filter === 'check_in_out') {
      list = list.filter((n) => n.type === 'EVENT_CHECK_IN' || n.type === 'EVENT_CHECK_OUT');
    } else if (filter === 'rfid_taps') {
      list = list.filter((n) => n.type === 'EVENT_RFID_TAP');
    } else if (filter === 'bookings') {
      list = list.filter((n) => n.type === 'EVENT_NEW_BOOKING');
    }

    const unreadCount = inMemoryNotifications.filter((n) => !n.isRead).length;

    return {
      notifications: list.slice(0, limit),
      unreadCount,
      totalCount: inMemoryNotifications.length,
    };
  }

  /**
   * Mark notification(s) as read in memory and PostgreSQL
   */
  public async markAsRead(id?: string, markAll = false): Promise<void> {
    const now = new Date().toISOString();
    if (markAll) {
      inMemoryNotifications.forEach((n) => {
        n.isRead = true;
        n.readAt = now;
      });

      // Update in PostgreSQL
      try {
        const db = getSupabasePgPool();
        if (db) {
          const client = await db.connect();
          try {
            await client.query(
              `UPDATE super_admin_notifications SET is_read = TRUE, read_at = $1 WHERE recipient_id = $2 AND is_read = FALSE`,
              [now, 'super-admin']
            );
          } finally {
            client.release();
          }
        }
      } catch (err: any) {
        console.warn('[NOTIF MARK READ ALL DB ERROR]', err.message);
      }

      // Secondary mirror
      try {
        if (supabaseAdmin) {
          await supabaseAdmin
            .from('super_admin_notifications')
            .update({ is_read: true, read_at: now })
            .eq('recipient_id', 'super-admin')
            .eq('is_read', false);
        }
      } catch {}
    } else if (id) {
      const item = inMemoryNotifications.find((n) => n.id === id);
      if (item) {
        item.isRead = true;
        item.readAt = now;
      }

      // Update in PostgreSQL
      try {
        const db = getSupabasePgPool();
        if (db) {
          const client = await db.connect();
          try {
            await client.query(
              `UPDATE super_admin_notifications SET is_read = TRUE, read_at = $1 WHERE id = $2`,
              [now, id]
            );
          } finally {
            client.release();
          }
        }
      } catch (err: any) {
        console.warn('[NOTIF MARK READ DB ERROR]', err.message);
      }

      // Secondary mirror
      try {
        if (supabaseAdmin) {
          await supabaseAdmin
            .from('super_admin_notifications')
            .update({ is_read: true, read_at: now })
            .eq('id', id);
        }
      } catch {}
    }
  }

  /**
   * Clear notification history in memory and PostgreSQL
   */
  public async clearNotifications(id?: string, clearAll = false): Promise<void> {
    if (clearAll) {
      inMemoryNotifications.length = 0;

      try {
        const db = getSupabasePgPool();
        if (db) {
          const client = await db.connect();
          try {
            await client.query(
              `DELETE FROM super_admin_notifications WHERE recipient_id = $1`,
              ['super-admin']
            );
          } finally {
            client.release();
          }
        }
      } catch (err: any) {
        console.warn('[NOTIF CLEAR ALL DB ERROR]', err.message);
      }

      try {
        if (supabaseAdmin) {
          await supabaseAdmin
            .from('super_admin_notifications')
            .delete()
            .eq('recipient_id', 'super-admin');
        }
      } catch {}
    } else if (id) {
      const idx = inMemoryNotifications.findIndex((n) => n.id === id);
      if (idx !== -1) inMemoryNotifications.splice(idx, 1);

      try {
        const db = getSupabasePgPool();
        if (db) {
          const client = await db.connect();
          try {
            await client.query(
              `DELETE FROM super_admin_notifications WHERE id = $1`,
              [id]
            );
          } finally {
            client.release();
          }
        }
      } catch (err: any) {
        console.warn('[NOTIF CLEAR DB ERROR]', err.message);
      }

      try {
        if (supabaseAdmin) {
          await supabaseAdmin
            .from('super_admin_notifications')
            .delete()
            .eq('id', id);
        }
      } catch {}
    }
  }
}

export const notificationEngine = new NotificationEngine();

/**
 * Global non-blocking dispatcher helper for Super Admin alerts.
 * Decoupled using microtask scheduling so transactional business logic never waits on notifications.
 */
export function notifySuperAdmin(event: NotificationEventInput): void {
  // Non-blocking asynchronous dispatch
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      notificationEngine.dispatch(event).catch((err) => {
        console.warn('[NOTIFY SUPER ADMIN ERROR]', err.message);
      });
    });
  } else {
    setTimeout(() => {
      notificationEngine.dispatch(event).catch((err) => {
        console.warn('[NOTIFY SUPER ADMIN ERROR]', err.message);
      });
    }, 0);
  }
}
