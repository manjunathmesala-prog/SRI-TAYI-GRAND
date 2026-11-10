import { RFIDCard, RFIDAccessEvent } from '@/types';

// Browser-safe server detection
function isServerEnvironment(): boolean {
  return typeof window === 'undefined' && typeof process !== 'undefined';
}

// Lazy-initialized PostgreSQL pool for direct Supabase cloud persistence
let pgPoolInstance: any = null;

function getPgPool() {
  if (!isServerEnvironment()) return null;
  if (pgPoolInstance) return pgPoolInstance;

  try {
    // Dynamic require so Webpack client bundles never attempt to package pg
    const { Pool } = require('pg');
    pgPoolInstance = new Pool({
      host: process.env.SUPABASE_DB_HOST || 'aws-0-ap-northeast-1.pooler.supabase.com',
      port: Number(process.env.SUPABASE_DB_PORT) || 5432,
      database: process.env.SUPABASE_DB_NAME || 'postgres',
      user: process.env.SUPABASE_DB_USER || 'postgres.wercvaimozbbkbwmuoct',
      password: process.env.SUPABASE_DB_PASSWORD || 'Vaynex@2026',
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });

    pgPoolInstance.on('error', (err: any) => {
      console.warn('[SUPABASE PG POOL WARN]', err.message);
    });

    return pgPoolInstance;
  } catch (err: any) {
    console.warn('[SUPABASE PG POOL INIT WARN]', err.message);
    return null;
  }
}

/**
 * Production Live Supabase Sync for RFID Cards
 * Persists cards directly to Supabase rfid_cards table in PostgreSQL
 */
export async function syncCardToSupabase(card: RFIDCard): Promise<void> {
  if (!isServerEnvironment() || !card) return;

  const pool = getPgPool();
  if (!pool) return;

  try {
    const query = `
      INSERT INTO rfid_cards (
        card_uid, card_label, card_type, is_lifetime, holder_name, holder_role, status, activated_at, expires_at, deactivated_at, last_tap_room, last_tap_at, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (card_uid) DO UPDATE SET
        card_label = EXCLUDED.card_label,
        card_type = EXCLUDED.card_type,
        is_lifetime = EXCLUDED.is_lifetime,
        holder_name = EXCLUDED.holder_name,
        holder_role = EXCLUDED.holder_role,
        status = EXCLUDED.status,
        activated_at = EXCLUDED.activated_at,
        expires_at = EXCLUDED.expires_at,
        deactivated_at = EXCLUDED.deactivated_at,
        last_tap_room = EXCLUDED.last_tap_room,
        last_tap_at = EXCLUDED.last_tap_at,
        notes = EXCLUDED.notes,
        updated_at = NOW();
    `;

    const values = [
      card.card_uid,
      card.card_label || `Card (${card.card_uid})`,
      card.card_type || 'guest',
      Boolean(card.is_lifetime),
      card.holder_name || card.guest_name || 'Guest',
      card.holder_role || (card.card_type === 'super_admin' ? 'Super Admin' : card.card_type === 'cleaner' ? 'Housekeeping' : 'Guest'),
      card.status || 'active',
      card.activated_at ? new Date(card.activated_at) : null,
      card.expires_at ? new Date(card.expires_at) : null,
      card.deactivated_at ? new Date(card.deactivated_at) : null,
      card.last_tap_room || card.assigned_room_number || card.room_number || null,
      card.last_tap_at ? new Date(card.last_tap_at) : null,
      card.notes || null,
    ];

    await pool.query(query, values);
    console.log(`[SUPABASE CLOUD SYNC] Card ${card.card_uid} (${card.status}) recorded in Supabase`);
  } catch (err: any) {
    console.warn('[SUPABASE RFID CARD SYNC WARN]', err.message);
  }
}

/**
 * Production Live Supabase Sync for RFID Access Tap Events
 * Persists tap audits directly to Supabase rfid_access_events table
 */
export async function syncEventToSupabase(event: RFIDAccessEvent): Promise<void> {
  if (!isServerEnvironment() || !event) return;

  const pool = getPgPool();
  if (!pool) return;

  try {
    const query = `
      INSERT INTO rfid_access_events (
        room_number, device_name, event_type, action_type, card_type, holder_name, booking_reference, reason, source, occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
    `;

    const values = [
      event.room_number || 'N/A',
      event.device_name || 'Be-Tech-BIS-57-USB-Encoder',
      event.event_type || 'access_granted',
      event.action_type || 'door_unlock',
      event.card_type || 'guest',
      event.holder_name || 'Front Desk',
      event.booking_reference || null,
      event.reason || null,
      event.source || 'encoder',
      event.occurred_at ? new Date(event.occurred_at) : new Date(),
    ];

    await pool.query(query, values);
    console.log(`[SUPABASE CLOUD SYNC] Tap event for Room ${event.room_number} (${event.event_type}) recorded in Supabase`);
  } catch (err: any) {
    console.warn('[SUPABASE RFID EVENT SYNC WARN]', err.message);
  }
}

/**
 * Production Live Supabase Sync for Deleting Cards
 */
export async function deleteCardFromSupabase(cardIdentifier: string): Promise<boolean> {
  if (!isServerEnvironment() || !cardIdentifier) return false;

  const pool = getPgPool();
  if (!pool) return false;

  try {
    const res = await pool.query(
      'DELETE FROM rfid_cards WHERE card_uid = $1 OR id::text = $1;',
      [cardIdentifier]
    );
    console.log(`[SUPABASE CLOUD SYNC] Card ${cardIdentifier} deleted from Supabase (${res.rowCount} row(s) removed)`);
    return true;
  } catch (err: any) {
    console.warn('[SUPABASE RFID DELETE WARN]', err.message);
    return false;
  }
}

/**
 * Production Live Supabase Sync for RFID Tap History (Door sensor / lock taps)
 * Persists directly to Supabase rfid_tap_history table
 */
export async function syncTapHistoryToSupabase(record: {
  id: string;
  card_uid: string;
  card_type: string;
  room_number: string;
  booking_id?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  access_result: string;
  door_status: string;
  reason?: string | null;
  metadata?: any;
  tapped_at?: string | Date;
}): Promise<void> {
  if (!isServerEnvironment() || !record) return;

  const pool = getPgPool();
  if (!pool) return;

  try {
    const query = `
      INSERT INTO rfid_tap_history (
        id, card_uid, card_type, room_number, booking_id, customer_id, customer_name,
        access_result, door_status, reason, metadata, tapped_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        access_result = EXCLUDED.access_result,
        door_status = EXCLUDED.door_status,
        reason = EXCLUDED.reason;
    `;

    const values = [
      record.id,
      record.card_uid,
      record.card_type,
      record.room_number,
      record.booking_id || null,
      record.customer_id || null,
      record.customer_name || null,
      record.access_result,
      record.door_status,
      record.reason || null,
      JSON.stringify(record.metadata || {}),
      record.tapped_at ? new Date(record.tapped_at) : new Date(),
    ];

    await pool.query(query, values);
    console.log(`[SUPABASE CLOUD SYNC] Tap history ${record.id} for Room ${record.room_number} recorded in Supabase`);
  } catch (err: any) {
    console.warn('[SUPABASE TAP HISTORY SYNC WARN]', err.message);
  }
}

