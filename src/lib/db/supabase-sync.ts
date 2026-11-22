import {
  Guest,
  Booking,
  PaymentRecord,
  PhysicalRoom,
  RoomCategory,
  HotelSettings,
  OperationalStatus,
  HousekeepingStatus,
  Expense,
  HallEnquiry,
  ConventionQuote,
  MaintenanceTicket,
  CashShift,
  CashTransaction,
  DailyClosing,
  StaffAttendance,
  ContactEnquiry,
  FolioCharge,
  AuditLogEntry,
  GoogleReview,
  RoomTransferRecord,
  StayExtensionRecord,
  JournalEntry,
  JournalLine,
  NightAuditConfig,
  NightAuditRecipient,
  StaffMember,
  StaffRole,
} from '@/types';
import { normalizeCategoryId } from '@/lib/pricing';

/**
 * ==============================================================================
 * SRI TAYI GRAND - ENTERPRISE SUPABASE CLOUD POSTGRESQL SYNCHRONIZER
 * Provides direct, persistent, bi-directional synchronization between the local
 * repository and live Supabase PostgreSQL tables.
 *
 * Guaranteed non-blocking: network drops or latency spikes will never crash or halt
 * front-desk operations.
 * ==============================================================================
 */

let poolInstance: any = null;

export function getSupabasePgPool(): any {
  if (typeof window !== 'undefined') return null;
  const isBuild =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    Boolean(process.env.NEXT_IS_BUILD);
  if (isBuild) return null;
  if (poolInstance) return poolInstance;

  try {
    const req = typeof eval !== 'undefined' ? eval('require') : null;
    if (!req) return null;
    const { Pool } = req('pg');

    const host = process.env.SUPABASE_DB_HOST || process.env.PGHOST;
    const port = Number(process.env.SUPABASE_DB_PORT || process.env.PGPORT) || 5432;
    const database = process.env.SUPABASE_DB_NAME || process.env.PGDATABASE || 'postgres';
    const user = process.env.SUPABASE_DB_USER || process.env.PGUSER;
    const password = process.env.SUPABASE_DB_PASSWORD || process.env.PGPASSWORD;

    let connectionString =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DATABASE_URL ||
      (host && user && password ? `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}` : '');

    if (!connectionString) return null;

    // Automatic IPv4 remapping: If connection string points to IPv6-only direct host, route via active IPv4 pooler
    if (connectionString.includes('db.wercvaimozbbkbwmuoct.supabase.co')) {
      connectionString = `postgresql://${encodeURIComponent(user || '')}:${encodeURIComponent(password || '')}@aws-0-ap-northeast-1.pooler.supabase.com:6543/${database}`;
    } else if (connectionString.includes('db.goxgiohyshxzqzesernz.supabase.co')) {
      connectionString = `postgresql://${encodeURIComponent(user || '')}:${encodeURIComponent(password || '')}@aws-1-ap-northeast-2.pooler.supabase.com:6543/${database}`;
    }

    poolInstance = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 15000,
    });

    poolInstance.on('error', (err: any) => {
      console.warn('[SUPABASE PG POOL ERROR]', err.message);
    });

    return poolInstance;
  } catch (err: unknown) {
    console.warn('[SUPABASE PG POOL INIT WARN]', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ==============================================================================
// 1. BOOKINGS SYNCHRONIZATION
// ==============================================================================

export async function syncBookingToSupabase(booking: Booking): Promise<void> {
  if (typeof window !== 'undefined' || !booking) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      // 1. Upsert Guest record
      let guestId: string | null = null;
      const guestPhone = booking.guest_phone || '';
      const guestEmail = booking.guest_email || null;
      const guestName = booking.guest_name || 'Guest';

      if (guestPhone || guestEmail) {
        const existingGuest = await client.query(
          `SELECT id FROM guests WHERE phone = $1 OR (email IS NOT NULL AND email = $2) LIMIT 1;`,
          [guestPhone, guestEmail]
        );

        if (existingGuest.rows.length > 0) {
          guestId = existingGuest.rows[0].id;
          await client.query(
            `UPDATE guests 
             SET full_name = COALESCE($1, full_name),
                 total_stays = total_stays + 1,
                 id_type = COALESCE($2, id_type),
                 id_number = COALESCE($3, id_number),
                 updated_at = NOW()
             WHERE id = $4;`,
            [guestName, booking.id_proof_type || null, booking.id_proof_number || null, guestId]
          );
        } else {
          const newGuest = await client.query(
            `INSERT INTO guests (full_name, phone, email, id_type, id_number, country, total_stays)
             VALUES ($1, $2, $3, $4, $5, 'India', 1)
             RETURNING id;`,
            [
              guestName,
              guestPhone,
              guestEmail,
              booking.id_proof_type || null,
              booking.id_proof_number || null,
            ]
          );
          if (newGuest.rows.length > 0) {
            guestId = newGuest.rows[0].id;
          }
        }
      }

      // 2. Normalize dates
      const checkInDate = booking.check_in_date || new Date().toISOString().split('T')[0];
      let checkOutDate = booking.check_out_date;
      if (!checkOutDate || checkOutDate <= checkInDate) {
        const nextDay = new Date(checkInDate);
        nextDay.setDate(nextDay.getDate() + 1);
        checkOutDate = nextDay.toISOString().split('T')[0];
      }

      // 3. Upsert into Supabase bookings table
      const bRes = await client.query(
        `INSERT INTO bookings (
          booking_reference,
          guest_id,
          check_in_date,
          check_out_date,
          adults_count,
          children_count,
          rooms_count,
          status,
          payment_status,
          payment_method,
          subtotal_amount,
          tax_amount,
          total_amount,
          paid_amount,
          booking_source,
          walk_in_token,
          pickup_code,
          room_assigned_by,
          id_proof_type,
          id_proof_number,
          special_requests,
          checked_in_at,
          checked_out_at,
          assigned_room_id,
          assigned_room_number,
          assigned_room_numbers,
          category_id,
          category_name,
          keycard_uid,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, COALESCE($30, NOW()),
          NOW()
        )
        ON CONFLICT (booking_reference) DO UPDATE SET
          check_in_date = EXCLUDED.check_in_date,
          check_out_date = EXCLUDED.check_out_date,
          status = EXCLUDED.status,
          payment_status = EXCLUDED.payment_status,
          rooms_count = EXCLUDED.rooms_count,
          subtotal_amount = EXCLUDED.subtotal_amount,
          tax_amount = EXCLUDED.tax_amount,
          total_amount = EXCLUDED.total_amount,
          paid_amount = EXCLUDED.paid_amount,
          pickup_code = COALESCE(EXCLUDED.pickup_code, bookings.pickup_code),
          walk_in_token = COALESCE(EXCLUDED.walk_in_token, bookings.walk_in_token),
          room_assigned_by = COALESCE(EXCLUDED.room_assigned_by, bookings.room_assigned_by),
          id_proof_type = COALESCE(EXCLUDED.id_proof_type, bookings.id_proof_type),
          id_proof_number = COALESCE(EXCLUDED.id_proof_number, bookings.id_proof_number),
          checked_in_at = COALESCE(EXCLUDED.checked_in_at, bookings.checked_in_at),
          checked_out_at = COALESCE(EXCLUDED.checked_out_at, bookings.checked_out_at),
          assigned_room_id = COALESCE(EXCLUDED.assigned_room_id, bookings.assigned_room_id),
          assigned_room_number = COALESCE(EXCLUDED.assigned_room_number, bookings.assigned_room_number),
          assigned_room_numbers = COALESCE(EXCLUDED.assigned_room_numbers, bookings.assigned_room_numbers),
          category_id = COALESCE(EXCLUDED.category_id, bookings.category_id),
          category_name = COALESCE(EXCLUDED.category_name, bookings.category_name),
          keycard_uid = COALESCE(EXCLUDED.keycard_uid, bookings.keycard_uid),
          updated_at = NOW()
        RETURNING id;`,
        [
          booking.booking_reference,
          guestId,
          checkInDate,
          checkOutDate,
          Number(booking.adults_count || 1),
          Number(booking.children_count || 0),
          Number(booking.rooms_count || 1),
          (() => {
            const st = booking.status || 'confirmed';
            return ['pending', 'confirmed', 'checked_in', 'partially_checked_in', 'partially_checked_out', 'checked_out', 'cancelled', 'no_show'].includes(st) ? st : 'confirmed';
          })(),
          (() => {
            const ps = (booking.payment_status as any) || 'pending';
            if (ps === 'paid' || ps === 'completed') return 'successful';
            return ['pending', 'successful', 'failed', 'refunded', 'partially_refunded', 'pay_at_hotel'].includes(ps) ? ps : 'pending';
          })(),
          booking.payment_method || 'online',
          Number(booking.subtotal_amount || booking.total_amount || 0),
          Number(booking.tax_amount || 0),
          Number(booking.total_amount || 0),
          Number(booking.paid_amount || 0),
          booking.booking_source || (booking.walk_in_token ? 'walk_in' : 'online'),
          booking.walk_in_token || null,
          booking.pickup_code || null,
          booking.room_assigned_by || null,
          booking.id_proof_type || null,
          booking.id_proof_number || null,
          booking.special_requests || null,
          booking.checked_in_at || (booking.status === 'checked_in' ? new Date().toISOString() : null),
          booking.checked_out_at || (booking.status === 'checked_out' ? new Date().toISOString() : null),
          booking.assigned_room_id || null,
          booking.assigned_room_number || null,
          Array.isArray(booking.assigned_room_numbers) && booking.assigned_room_numbers.length > 0
            ? booking.assigned_room_numbers
            : (booking.assigned_room_number ? [booking.assigned_room_number] : null),
          booking.category_id || null,
          booking.category_name || null,
          booking.keycard_uid || null,
          booking.created_at || null,
        ]
      );

      const bookingUuid = bRes?.rows?.[0]?.id;

      if (bookingUuid) {
        // 4. Upsert Primary Guest in booking_guests
        const bgCheck = await client.query(
          `SELECT id FROM booking_guests WHERE booking_id = $1 AND is_primary = true LIMIT 1;`,
          [bookingUuid]
        );
        if (bgCheck.rows.length === 0) {
          await client.query(
            `INSERT INTO booking_guests (booking_id, guest_name, age, gender, is_primary)
             VALUES ($1, $2, $3, $4, true);`,
            [bookingUuid, guestName, 32, 'Not Specified']
          );
        } else {
          await client.query(
            `UPDATE booking_guests SET guest_name = $1 WHERE id = $2;`,
            [guestName, bgCheck.rows[0].id]
          );
        }

        // 5. Upsert booking_rooms
        let catUuid: string | null = null;
        if (booking.category_name || booking.category_id) {
          const catRes = await client.query(
            `SELECT id FROM room_categories WHERE name ILIKE $1 OR slug ILIKE $1 OR id::text = $2 LIMIT 1;`,
            [booking.category_name || '', booking.category_id || '']
          );
          if (catRes.rows.length > 0) catUuid = catRes.rows[0].id;
        }
        if (!catUuid) {
          const defaultCat = await client.query(`SELECT id FROM room_categories LIMIT 1;`);
          if (defaultCat.rows.length > 0) catUuid = defaultCat.rows[0].id;
        }

        let roomUuid: string | null = null;
        if (booking.assigned_room_number || booking.assigned_room_id) {
          const rmRes = await client.query(
            `SELECT id FROM rooms WHERE room_number = $1 OR id::text = $2 LIMIT 1;`,
            [booking.assigned_room_number || '', booking.assigned_room_id || '']
          );
          if (rmRes.rows.length > 0) roomUuid = rmRes.rows[0].id;
        }

        const totalRooms = Math.max(1, Number(booking.rooms_count) || (booking.booking_rooms ? booking.booking_rooms.length : 1));
        const nights = Math.max(
          1,
          Math.round(
            (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) /
              (1000 * 60 * 60 * 24)
          ) || 1
        );
        const derivedPricePerNight = Math.round(Number(booking.subtotal_amount || booking.total_amount || 1800) / (totalRooms * nights));

        // Authoritative booking_rooms synchronization without ghost duplicates
        const existingBrRes = await client.query(
          `SELECT id, room_number, assigned_room_id FROM booking_rooms WHERE booking_id = $1 ORDER BY created_at ASC;`,
          [bookingUuid]
        );
        const existingRows = existingBrRes.rows;

        if (Array.isArray(booking.booking_rooms) && booking.booking_rooms.length > 0) {
          const syncedIds: string[] = [];
          for (let i = 0; i < booking.booking_rooms.length; i++) {
            const brItem = booking.booking_rooms[i];
            let itemRoomUuid: string | null = null;
            let itemRoomNumber = brItem.room_number || '';
            if (brItem.room_number || brItem.room_id) {
              const rRes = await client.query(
                `SELECT id, room_number FROM rooms WHERE room_number = $1 OR id::text = $2 LIMIT 1;`,
                [brItem.room_number || '', brItem.room_id || '']
              );
              if (rRes.rows.length > 0) {
                itemRoomUuid = rRes.rows[0].id;
                itemRoomNumber = rRes.rows[0].room_number;
              }
            } else if (booking.assigned_room_number && booking.rooms_count === 1) {
              itemRoomUuid = roomUuid;
              itemRoomNumber = booking.assigned_room_number;
            }

            let itemCatUuid = catUuid;
            if (brItem.category_id || brItem.category_name) {
              const cRes = await client.query(
                `SELECT id FROM room_categories WHERE name ILIKE $1 OR slug ILIKE $1 OR id::text = $2 LIMIT 1;`,
                [brItem.category_name || '', brItem.category_id || '']
              );
              if (cRes.rows.length > 0) itemCatUuid = cRes.rows[0].id;
            }
            const itemPrice = Number(brItem.price_per_night || derivedPricePerNight);
            const itemStatus = brItem.status || (booking.status === 'checked_in' ? 'checked_in' : (booking.status === 'checked_out' ? 'checked_out' : 'confirmed'));
            const itemCheckedIn = brItem.checked_in_at || (itemStatus === 'checked_in' ? (booking.checked_in_at || new Date().toISOString()) : null);
            const itemCheckedOut = brItem.checked_out_at || (itemStatus === 'checked_out' ? (booking.checked_out_at || new Date().toISOString()) : null);
            const itemGuestName = brItem.assigned_guest_name || guestName;
            const itemKeycardUid = brItem.keycard_uid || (booking.assigned_room_number === itemRoomNumber ? booking.keycard_uid : null);

            if (i < existingRows.length) {
              const rowId = existingRows[i].id;
              syncedIds.push(rowId);
              await client.query(
                `UPDATE booking_rooms 
                 SET category_id = COALESCE($1, category_id),
                     assigned_room_id = $2,
                     price_per_night = $3,
                     room_number = $4,
                     status = $5,
                     checked_in_at = $6,
                     checked_out_at = $7,
                     assigned_guest_name = $8,
                     keycard_uid = $9
                 WHERE id = $10;`,
                [itemCatUuid, itemRoomUuid, itemPrice, itemRoomNumber, itemStatus, itemCheckedIn, itemCheckedOut, itemGuestName, itemKeycardUid, rowId]
              );
            } else {
              const insRes = await client.query(
                `INSERT INTO booking_rooms (
                   booking_id, category_id, assigned_room_id, price_per_night,
                   room_number, status, checked_in_at, checked_out_at, assigned_guest_name, keycard_uid, created_at
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                 RETURNING id;`,
                [bookingUuid, itemCatUuid, itemRoomUuid, itemPrice, itemRoomNumber, itemStatus, itemCheckedIn, itemCheckedOut, itemGuestName, itemKeycardUid]
              );
              if (insRes.rows.length > 0) syncedIds.push(insRes.rows[0].id);
            }
          }

          // Delete ghost/duplicate rows beyond valid allocations
          if (syncedIds.length > 0) {
            await client.query(
              `DELETE FROM booking_rooms WHERE booking_id = $1 AND NOT (id = ANY($2::uuid[]));`,
              [bookingUuid, syncedIds]
            );
          }
        } else {
          const roomStatus = booking.status === 'checked_in' ? 'checked_in' : (booking.status === 'checked_out' ? 'checked_out' : 'confirmed');
          if (existingRows.length === 0 && catUuid) {
            await client.query(
              `INSERT INTO booking_rooms (
                 booking_id, category_id, assigned_room_id, price_per_night,
                 room_number, status, checked_in_at, checked_out_at, assigned_guest_name, keycard_uid, created_at
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW());`,
              [
                bookingUuid,
                catUuid,
                roomUuid,
                derivedPricePerNight,
                booking.assigned_room_number || null,
                roomStatus,
                booking.checked_in_at || null,
                booking.checked_out_at || null,
                guestName,
                booking.keycard_uid || null,
              ]
            );
          } else if (existingRows.length > 0) {
            await client.query(
              `UPDATE booking_rooms 
               SET assigned_room_id = $1,
                   category_id = COALESCE($2, category_id),
                   price_per_night = $3,
                   room_number = $4,
                   status = $5,
                   checked_in_at = $6,
                   checked_out_at = $7,
                   assigned_guest_name = $8,
                   keycard_uid = $9
               WHERE id = $10;`,
              [
                roomUuid,
                catUuid,
                derivedPricePerNight,
                booking.assigned_room_number || null,
                roomStatus,
                booking.checked_in_at || null,
                booking.checked_out_at || null,
                guestName,
                booking.keycard_uid || null,
                existingRows[0].id,
              ]
            );
            // Prune duplicate ghost allocations if any
            if (existingRows.length > 1) {
              await client.query(
                `DELETE FROM booking_rooms WHERE booking_id = $1 AND id != $2;`,
                [bookingUuid, existingRows[0].id]
              );
            }
          }
        }

        // 6. Append to booking_status_history
        const bshCheck = await client.query(
          `SELECT to_status FROM booking_status_history WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1;`,
          [bookingUuid]
        );
        if (bshCheck.rows.length === 0) {
          await client.query(
            `INSERT INTO booking_status_history (booking_id, from_status, to_status, notes, created_at)
             VALUES ($1, null, $2, 'Initial booking created', NOW());`,
            [bookingUuid, booking.status || 'confirmed']
          );
        } else if (bshCheck.rows[0].to_status !== booking.status) {
          await client.query(
            `INSERT INTO booking_status_history (booking_id, from_status, to_status, notes, created_at)
             VALUES ($1, $2, $3, $4, NOW());`,
            [bookingUuid, bshCheck.rows[0].to_status, booking.status, `Status changed to ${booking.status}`]
          );
        }

        // 7. Upsert Invoices
        const invCheck = await client.query(
          `SELECT id FROM invoices WHERE booking_id = $1 LIMIT 1;`,
          [bookingUuid]
        );
        if (invCheck.rows.length === 0) {
          const rawRef = (booking.booking_reference || '').replace(/[^0-9]/g, '');
          const invNum = `INV-STG-2026-${rawRef.slice(-4) || Math.floor(1000 + Math.random() * 9000)}`;
          await client.query(
            `INSERT INTO invoices (invoice_number, booking_id, subtotal, tax_amount, additional_charges, total_amount, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (invoice_number) DO NOTHING;`,
            [
              invNum,
              bookingUuid,
              Number(booking.subtotal_amount || booking.total_amount || 0),
              Number(booking.tax_amount || 0),
              Number(booking.additional_charges_amount || 0),
              Number(booking.total_amount || 0),
            ]
          );
        }
      }
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(
      `[SUPABASE BOOKING SYNC WARN] (${booking.booking_reference}):`,
      err instanceof Error ? err.message : String(err)
    );
    const code = (err as any)?.code;
    const msg = String((err as any)?.message || '').toLowerCase();
    if (code === '23P01' || code === '23505' || msg.includes('exclusion constraint') || msg.includes('violates exclusion') || msg.includes('conflict')) {
      throw err;
    }
  }
}

export async function loadBookingsFromSupabase(): Promise<Booking[] | null> {
  if (typeof window !== 'undefined') return null;

  const db = getSupabasePgPool();
  if (!db) return null;

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          b.id::text as id,
          b.booking_reference,
          b.guest_id::text as guest_id,
          COALESCE(g.full_name, 'Valued Guest') as guest_name,
          COALESCE(g.phone, '') as guest_phone,
          COALESCE(g.email, '') as guest_email,
          b.check_in_date::text as check_in_date,
          b.check_out_date::text as check_out_date,
          COALESCE(b.adults_count, 1) as adults_count,
          COALESCE(b.children_count, 0) as children_count,
          COALESCE(b.rooms_count, 1) as rooms_count,
          b.status,
          CASE
            WHEN COALESCE(
              (SELECT SUM(amount) FROM payments WHERE (booking_id = b.id OR booking_reference = b.booking_reference) AND (status = 'successful' OR status IS NULL)),
              b.paid_amount,
              0
            ) >= b.total_amount AND b.total_amount > 0 THEN 'successful'
            WHEN COALESCE(
              (SELECT SUM(amount) FROM payments WHERE (booking_id = b.id OR booking_reference = b.booking_reference) AND (status = 'successful' OR status IS NULL)),
              b.paid_amount,
              0
            ) > 0 THEN 'partial'
            ELSE b.payment_status
          END as payment_status,
          COALESCE(b.payment_method, 'online') as payment_method,
          COALESCE(b.subtotal_amount, 0)::float as subtotal_amount,
          COALESCE(b.tax_amount, 0)::float as tax_amount,
          COALESCE(b.total_amount, 0)::float as total_amount,
          COALESCE(
            (SELECT SUM(amount) FROM payments WHERE (booking_id = b.id OR booking_reference = b.booking_reference) AND (status = 'successful' OR status IS NULL)),
            b.paid_amount,
            0
          )::float as paid_amount,
          COALESCE(b.booking_source, 'online') as booking_source,
          b.walk_in_token,
          b.pickup_code,
          b.room_assigned_by,
          b.id_proof_type,
          b.id_proof_number,
          b.special_requests,
          b.checked_in_at,
          b.checked_out_at,
          b.assigned_room_id,
          b.assigned_room_number,
          COALESCE(b.category_id, 'cat-double-03') as category_id,
          COALESCE(b.category_name, 'Double Bed Room') as category_name,
          b.keycard_uid,
          b.created_at,
          COALESCE(
            b.assigned_room_numbers,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(NULLIF(br.room_number, ''), r.room_number, b.assigned_room_number)), NULL)
          ) as assigned_room_numbers,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', br.id::text,
                'room_id', COALESCE(br.assigned_room_id::text, r.id::text),
                'room_number', COALESCE(NULLIF(br.room_number, ''), r.room_number, b.assigned_room_number),
                'category_id', COALESCE(br.category_id::text, b.category_id),
                'category_name', b.category_name,
                'price_per_night', COALESCE(br.price_per_night, (b.subtotal_amount / GREATEST(1, b.rooms_count)), 1800)::float,
                'status', COALESCE(br.status, b.status, 'confirmed'),
                'checked_in_at', br.checked_in_at,
                'checked_out_at', br.checked_out_at,
                'assigned_guest_name', COALESCE(br.assigned_guest_name, g.full_name),
                'keycard_uid', br.keycard_uid
              )
            ) FILTER (WHERE br.id IS NOT NULL),
            '[]'::json
          ) as booking_rooms
        FROM bookings b
        LEFT JOIN guests g ON b.guest_id = g.id
        LEFT JOIN booking_rooms br ON br.booking_id = b.id
        LEFT JOIN rooms r ON br.assigned_room_id = r.id
        GROUP BY b.id, g.full_name, g.phone, g.email
        ORDER BY b.created_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: `bk-pg-${row.id}`,
        booking_reference: row.booking_reference,
        guest_id: row.guest_id || 'gst-remote',
        guest_name: row.guest_name,
        guest_phone: row.guest_phone,
        guest_email: row.guest_email,
        check_in_date: row.check_in_date,
        check_out_date: row.check_out_date,
        category_id: row.category_id,
        category_name: row.category_name,
        assigned_room_id: row.assigned_room_id || undefined,
        assigned_room_number: row.assigned_room_number || (row.assigned_room_numbers?.[0]) || undefined,
        assigned_room_numbers: Array.isArray(row.assigned_room_numbers) && row.assigned_room_numbers.length > 0
          ? row.assigned_room_numbers
          : (row.assigned_room_number ? [row.assigned_room_number] : undefined),
        booking_rooms: Array.isArray(row.booking_rooms) ? row.booking_rooms : [],
        adults_count: Number(row.adults_count) || 1,
        children_count: Number(row.children_count) || 0,
        rooms_count: Array.isArray(row.booking_rooms) && row.booking_rooms.length > 0
          ? row.booking_rooms.length
          : (Number(row.rooms_count) || 1),
        status: row.status,
        payment_status: row.payment_status,
        payment_method: row.payment_method,
        subtotal_amount: row.subtotal_amount,
        room_charges_amount: row.subtotal_amount,
        tax_amount: row.tax_amount,
        additional_charges_amount: 0,
        total_amount: row.total_amount,
        paid_amount: row.paid_amount,
        booking_source: row.booking_source,
        walk_in_token: row.walk_in_token,
        pickup_code: row.pickup_code,
        room_assigned_by: row.room_assigned_by,
        keycard_uid: row.keycard_uid,
        id_proof_type: row.id_proof_type,
        id_proof_number: row.id_proof_number,
        special_requests: row.special_requests,
        checked_in_at: row.checked_in_at,
        checked_out_at: row.checked_out_at,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD BOOKINGS WARN]', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function getBookingFromSupabase(code?: string, ref?: string): Promise<Booking | null> {
  if (typeof window !== 'undefined') return null;
  const cleanCode = (code || '').trim();
  const cleanRef = (ref || '').trim();
  if (!cleanCode && !cleanRef) return null;

  const db = getSupabasePgPool();
  if (!db) return null;

  try {
    const client = await db.connect();
    try {
      const res = await client.query(
        `SELECT 
          b.id::text as id,
          b.booking_reference,
          b.guest_id::text as guest_id,
          COALESCE(g.full_name, 'Valued Guest') as guest_name,
          COALESCE(g.phone, '') as guest_phone,
          COALESCE(g.email, '') as guest_email,
          b.check_in_date,
          b.check_out_date,
          COALESCE(b.adults_count, 1) as adults_count,
          COALESCE(b.children_count, 0) as children_count,
          COALESCE(b.rooms_count, 1) as rooms_count,
          b.status,
          CASE
            WHEN COALESCE(
              (SELECT SUM(amount) FROM payments WHERE (booking_id = b.id OR booking_reference = b.booking_reference) AND (status = 'successful' OR status IS NULL)),
              b.paid_amount,
              0
            ) >= b.total_amount AND b.total_amount > 0 THEN 'successful'
            WHEN COALESCE(
              (SELECT SUM(amount) FROM payments WHERE (booking_id = b.id OR booking_reference = b.booking_reference) AND (status = 'successful' OR status IS NULL)),
              b.paid_amount,
              0
            ) > 0 THEN 'partial'
            ELSE b.payment_status
          END as payment_status,
          COALESCE(b.payment_method, 'cash') as payment_method,
          COALESCE(b.subtotal_amount, 0)::float as subtotal_amount,
          COALESCE(b.tax_amount, 0)::float as tax_amount,
          COALESCE(b.total_amount, 0)::float as total_amount,
          COALESCE(
            (SELECT SUM(amount) FROM payments WHERE (booking_id = b.id OR booking_reference = b.booking_reference) AND (status = 'successful' OR status IS NULL)),
            b.paid_amount,
            0
          )::float as paid_amount,
          COALESCE(b.booking_source, 'walk_in_qr') as booking_source,
          b.walk_in_token,
          b.pickup_code,
          b.room_assigned_by,
          b.keycard_uid,
          b.keycard_issued_at,
          b.id_proof_type,
          b.id_proof_number,
          b.special_requests,
          b.checked_in_at,
          b.checked_out_at,
          b.assigned_room_id,
          b.assigned_room_number,
          b.assigned_room_numbers,
          COALESCE(b.category_id, 'cat-double-03') as category_id,
          COALESCE(b.category_name, 'Double Room') as category_name,
          b.created_at
        FROM bookings b
        LEFT JOIN guests g ON b.guest_id = g.id
        WHERE ($1 != '' AND b.pickup_code ILIKE $1)
           OR ($2 != '' AND b.booking_reference ILIKE $2)
        LIMIT 1;`,
        [cleanCode, cleanRef]
      );

      if (res.rows.length === 0) return null;

      const row = res.rows[0];
      const formatDate = (val: any) => {
        if (!val) return '';
        if (val instanceof Date) return val.toISOString().split('T')[0];
        const s = String(val);
        return s.includes('T') ? s.split('T')[0] : s;
      };

      // Load associated booking_rooms if any
      const brRes = await client.query(
        `SELECT 
          id::text as id,
          assigned_room_id::text as room_id,
          room_number,
          category_id::text as category_id,
          price_per_night::float as price_per_night,
          status,
          checked_in_at,
          checked_out_at,
          assigned_guest_name,
          keycard_uid
         FROM booking_rooms 
         WHERE booking_id = $1;`,
        [row.id]
      );

      const assignedRoomsArr = Array.isArray(row.assigned_room_numbers) && row.assigned_room_numbers.length > 0
        ? row.assigned_room_numbers
        : (row.assigned_room_number ? [row.assigned_room_number] : undefined);

      const bookingRooms = (brRes.rows || []).map((br: any) => ({
        ...br,
        room_number: br.room_number || row.assigned_room_number || assignedRoomsArr?.[0] || '',
      }));

      return {
        id: `bk-pg-${row.id}`,
        booking_reference: row.booking_reference,
        guest_id: row.guest_id || 'gst-remote',
        guest_name: row.guest_name,
        guest_phone: row.guest_phone,
        guest_email: row.guest_email,
        check_in_date: formatDate(row.check_in_date),
        check_out_date: formatDate(row.check_out_date),
        category_id: row.category_id,
        category_name: row.category_name,
        assigned_room_id: row.assigned_room_id || undefined,
        assigned_room_number: row.assigned_room_number || (assignedRoomsArr?.[0]) || undefined,
        assigned_room_numbers: assignedRoomsArr,
        booking_rooms: bookingRooms,
        adults_count: Number(row.adults_count) || 1,
        children_count: Number(row.children_count) || 0,
        rooms_count: bookingRooms.length > 0 ? bookingRooms.length : (Number(row.rooms_count) || 1),
        status: row.status,
        payment_status: row.payment_status,
        payment_method: row.payment_method,
        subtotal_amount: Number(row.subtotal_amount) || 0,
        room_charges_amount: Number(row.subtotal_amount) || 0,
        tax_amount: Number(row.tax_amount) || 0,
        additional_charges_amount: 0,
        total_amount: Number(row.total_amount) || 0,
        paid_amount: Number(row.paid_amount) || 0,
        booking_source: row.booking_source,
        walk_in_token: row.walk_in_token,
        pickup_code: row.pickup_code,
        room_assigned_by: row.room_assigned_by,
        keycard_uid: row.keycard_uid,
        keycard_issued_at: row.keycard_issued_at ? new Date(row.keycard_issued_at).toISOString() : undefined,
        id_proof_type: row.id_proof_type,
        id_proof_number: row.id_proof_number,
        special_requests: row.special_requests,
        checked_in_at: row.checked_in_at,
        checked_out_at: row.checked_out_at,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE GET BOOKING WARN]', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ==============================================================================
// 2. PAYMENTS SYNCHRONIZATION
// ==============================================================================

export async function syncPaymentToSupabase(payment: PaymentRecord): Promise<void> {
  if (typeof window !== 'undefined' || !payment) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      let bookingUuid: string | null = null;
      if (payment.booking_reference) {
        const bRes = await client.query(
          `SELECT id FROM bookings WHERE booking_reference = $1 LIMIT 1;`,
          [payment.booking_reference]
        );
        if (bRes.rows.length > 0) bookingUuid = bRes.rows[0].id;
      }

      await client.query(
        `INSERT INTO payments (
          payment_reference,
          booking_reference,
          booking_id,
          guest_name,
          amount,
          currency,
          payment_method,
          gateway_order_id,
          gateway_payment_id,
          gateway_signature,
          status,
          notes,
          paid_at,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
        )
        ON CONFLICT (payment_reference) DO UPDATE SET
          booking_id = COALESCE(EXCLUDED.booking_id, payments.booking_id),
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          payment_method = EXCLUDED.payment_method,
          notes = EXCLUDED.notes,
          updated_at = NOW();`,
        [
          payment.payment_reference,
          payment.booking_reference,
          bookingUuid,
          (payment as any).guest_name || null,
          Number(payment.amount || 0),
          payment.currency || 'INR',
          payment.payment_method || 'cash',
          payment.gateway_order_id || null,
          payment.gateway_payment_id || null,
          (payment as any).gateway_signature || null,
          (() => {
            const st = (payment.status as any) || 'successful';
            if (st === 'paid' || st === 'completed' || st === 'success') return 'successful';
            return ['pending', 'successful', 'failed', 'refunded'].includes(st) ? st : 'successful';
          })(),
          (payment as any).notes || payment.payment_reference || null,
          payment.paid_at || new Date().toISOString(),
        ]
      );

      // Reconcile booking paid_amount and payment_status directly in Supabase
      if (bookingUuid) {
        await client.query(
          `UPDATE bookings b
           SET paid_amount = (
             SELECT COALESCE(SUM(amount), 0)
             FROM payments p
             WHERE (p.booking_id = b.id OR p.booking_reference = b.booking_reference)
               AND (p.status = 'successful' OR p.status IS NULL)
           ),
           payment_status = CASE
             WHEN (
               SELECT COALESCE(SUM(amount), 0)
               FROM payments p
               WHERE (p.booking_id = b.id OR p.booking_reference = b.booking_reference)
                 AND (p.status = 'successful' OR p.status IS NULL)
             ) >= b.total_amount AND b.total_amount > 0 THEN 'successful'
             WHEN (
               SELECT COALESCE(SUM(amount), 0)
               FROM payments p
               WHERE (p.booking_id = b.id OR p.booking_reference = b.booking_reference)
                 AND (p.status = 'successful' OR p.status IS NULL)
             ) > 0 THEN 'partial'
             ELSE b.payment_status
           END,
           updated_at = NOW()
           WHERE id = $1;`,
          [bookingUuid]
        );
      }
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(
      `[SUPABASE PAYMENT SYNC WARN] (${payment.payment_reference}):`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function loadPaymentsFromSupabase(): Promise<PaymentRecord[] | null> {
  if (typeof window !== 'undefined') return null;

  const db = getSupabasePgPool();
  if (!db) return null;

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id::text,
          payment_reference,
          COALESCE(booking_reference, '') as booking_reference,
          amount::float as amount,
          currency,
          payment_method,
          gateway_order_id,
          gateway_payment_id,
          gateway_signature,
          status,
          notes,
          paid_at,
          created_at
        FROM payments
        ORDER BY created_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: `pay-pg-${row.id}`,
        payment_reference: row.payment_reference,
        booking_reference: row.booking_reference,
        amount: Number(row.amount) || 0,
        currency: row.currency || 'INR',
        payment_method: row.payment_method || 'cash',
        gateway_order_id: row.gateway_order_id,
        gateway_payment_id: row.gateway_payment_id,
        gateway_signature: row.gateway_signature,
        status: row.status,
        notes: row.notes,
        paid_at: row.paid_at ? new Date(row.paid_at).toISOString() : new Date().toISOString(),
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD PAYMENTS WARN]', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function deleteBookingFromSupabase(idOrRef: string): Promise<void> {
  if (typeof window !== 'undefined' || !idOrRef) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM folio_charges WHERE booking_reference = $1 OR booking_id = $1;`, [idOrRef]);
      await client.query(`DELETE FROM additional_charges WHERE booking_reference = $1;`, [idOrRef]);
      await client.query(
        `DELETE FROM booking_rooms WHERE booking_id IN (SELECT id FROM bookings WHERE id::text = $1 OR booking_reference = $1);`,
        [idOrRef]
      );
      await client.query(
        `DELETE FROM booking_guests WHERE booking_id IN (SELECT id FROM bookings WHERE id::text = $1 OR booking_reference = $1);`,
        [idOrRef]
      );
      await client.query(`DELETE FROM bookings WHERE id::text = $1 OR booking_reference = $1;`, [idOrRef]);
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE DELETE BOOKING WARN] (${idOrRef}):`, err instanceof Error ? err.message : String(err));
  }
}

// ==============================================================================
// 3. ROOMS & HOUSEKEEPING STATUS SYNCHRONIZATION
// ==============================================================================

export async function syncRoomStatusToSupabase(params: {
  roomNumber: string;
  operationalStatus: OperationalStatus;
  housekeepingStatus?: HousekeepingStatus;
  notes?: string;
}): Promise<void> {
  if (typeof window !== 'undefined' || !params.roomNumber) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `UPDATE rooms 
         SET operational_status = $1,
             housekeeping_status = COALESCE($2, housekeeping_status),
             notes = COALESCE($3, notes),
             updated_at = NOW()
         WHERE room_number = $4;`,
        [
          params.operationalStatus,
          params.housekeepingStatus || null,
          params.notes !== undefined ? params.notes : null,
          params.roomNumber,
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(
      `[SUPABASE ROOM STATUS SYNC WARN] (Room ${params.roomNumber}):`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function loadRoomsFromSupabase(): Promise<{
  id: string;
  room_number: string;
  floor_number: number;
  category_id: string;
  operational_status: OperationalStatus;
  housekeeping_status: HousekeepingStatus;
  notes?: string;
}[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT id, room_number, floor_number, category_id, operational_status, housekeeping_status, notes
        FROM rooms
        ORDER BY floor_number ASC, room_number ASC;
      `);
      return res.rows.map((r: any) => ({
        id: String(r.id),
        room_number: String(r.room_number),
        floor_number: Number(r.floor_number) || 1,
        category_id: String(r.category_id),
        operational_status: r.operational_status as OperationalStatus,
        housekeeping_status: r.housekeeping_status as HousekeepingStatus,
        notes: r.notes || undefined,
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD ROOMS WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ==============================================================================
// 4. HOTEL SETTINGS SYNCHRONIZATION
// ==============================================================================

export async function syncSettingsToSupabase(settings: HotelSettings): Promise<void> {
  if (typeof window !== 'undefined' || !settings) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `UPDATE hotel_settings 
         SET hotel_name = $1,
             tagline = $2,
             address = $3,
             road = $4,
             phone = $5,
             whatsapp = $6,
             email = $7,
             check_in_time = $8,
             check_out_time = $9,
             tax_percentage = $10,
             allow_pay_at_hotel = $11,
             hold_timeout_minutes = $12,
             updated_at = NOW()
         WHERE id = 'a0000000-0000-0000-0000-000000000001' OR TRUE
         RETURNING id;`,
        [
          settings.hotel_name || 'SRI TAYI GRAND',
          settings.tagline || 'Stay · Host · Celebrate',
          settings.address || '',
          settings.road || '',
          settings.phone || '',
          settings.whatsapp || '',
          settings.email || '',
          settings.check_in_time || '14:00',
          settings.check_out_time || '11:00',
          Number(typeof settings.tax_percentage === 'number' ? settings.tax_percentage : 5),
          Boolean(settings.allow_pay_at_hotel),
          Number(settings.hold_timeout_minutes || 15),
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE SETTINGS SYNC WARN]', err instanceof Error ? err.message : String(err));
  }
}

export async function loadSettingsFromSupabase(): Promise<Partial<HotelSettings> | null> {
  if (typeof window !== 'undefined') return null;

  const db = getSupabasePgPool();
  if (!db) return null;

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          hotel_name, tagline, address, road, phone, whatsapp, email,
          check_in_time::text, check_out_time::text, tax_percentage::float,
          allow_pay_at_hotel, hold_timeout_minutes
        FROM hotel_settings
        LIMIT 1;
      `);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        hotel_name: row.hotel_name,
        tagline: row.tagline,
        address: row.address,
        road: row.road,
        phone: row.phone,
        whatsapp: row.whatsapp,
        email: row.email,
        check_in_time: row.check_in_time ? row.check_in_time.slice(0, 5) : '14:00',
        check_out_time: row.check_out_time ? row.check_out_time.slice(0, 5) : '11:00',
        tax_percentage: typeof row.tax_percentage === 'number' ? row.tax_percentage : 5,
        allow_pay_at_hotel: row.allow_pay_at_hotel,
        hold_timeout_minutes: row.hold_timeout_minutes,
      };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD SETTINGS WARN]', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ==============================================================================
// 5. EXPENSES SYNCHRONIZATION
// ==============================================================================

export async function syncExpenseToSupabase(expense: Expense): Promise<void> {
  if (typeof window !== 'undefined' || !expense) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `INSERT INTO expenses (
          id, category, title, description, amount, payment_method,
          recorded_by, expense_date, receipt_ref, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (id) DO UPDATE SET
          category = EXCLUDED.category,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          amount = EXCLUDED.amount,
          payment_method = EXCLUDED.payment_method,
          recorded_by = EXCLUDED.recorded_by,
          expense_date = EXCLUDED.expense_date,
          receipt_ref = EXCLUDED.receipt_ref,
          status = EXCLUDED.status,
          updated_at = NOW();`,
        [
          expense.id,
          expense.category,
          expense.title,
          expense.description || '',
          Number(expense.amount || 0),
          expense.payment_method || 'cash',
          expense.recorded_by || 'Admin',
          expense.expense_date || new Date().toISOString().split('T')[0],
          expense.receipt_ref || null,
          expense.status || 'approved',
          expense.created_at || new Date().toISOString(),
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE EXPENSE SYNC WARN] (${expense.id}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadExpensesFromSupabase(): Promise<Expense[] | null> {
  if (typeof window !== 'undefined') return null;

  const db = getSupabasePgPool();
  if (!db) return null;

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id, category, title, description, amount::float as amount,
          payment_method, recorded_by, expense_date::text as expense_date,
          receipt_ref, status, created_at
        FROM expenses
        ORDER BY expense_date DESC, created_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        category: row.category,
        title: row.title,
        description: row.description || '',
        amount: Number(row.amount) || 0,
        payment_method: row.payment_method,
        recorded_by: row.recorded_by,
        expense_date: row.expense_date,
        receipt_ref: row.receipt_ref || undefined,
        status: row.status,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD EXPENSES WARN]', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function deleteExpenseFromSupabase(id: string): Promise<void> {
  if (typeof window !== 'undefined' || !id) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(`DELETE FROM expenses WHERE id = $1;`, [id]);
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE DELETE EXPENSE WARN] (${id}):`, err instanceof Error ? err.message : String(err));
  }
}

// ==============================================================================
// 6. CONVENTION HALL ENQUIRIES & QUOTES SYNCHRONIZATION
// ==============================================================================

function mapHallEnquiryStatusToDb(st?: string): string {
  switch (st) {
    case 'quote_sent': return 'quotation_sent';
    case 'pending': return 'new';
    case 'advance_paid': return 'confirmed';
    case 'confirmed': return 'confirmed';
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    case 'new': return 'new';
    case 'contacted': return 'contacted';
    case 'quotation_sent': return 'quotation_sent';
    case 'pending_approval': return 'pending_approval';
    default: return 'new';
  }
}

function mapDbToHallEnquiryStatus(st?: string): any {
  switch (st) {
    case 'quotation_sent': return 'quote_sent';
    case 'new': return 'pending';
    case 'contacted': return 'pending';
    case 'pending_approval': return 'pending';
    case 'confirmed': return 'confirmed';
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

export async function syncHallEnquiryToSupabase(enquiry: HallEnquiry): Promise<void> {
  if (typeof window !== 'undefined' || !enquiry) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      const ref = (enquiry as any).enquiry_reference || `ENQ-HALL-${enquiry.id}`;
      await client.query(
        `INSERT INTO hall_enquiries (
          enquiry_reference, name, phone, email, event_type, event_date,
          expected_guests, requirements, message, status, admin_notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (enquiry_reference) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          event_type = EXCLUDED.event_type,
          event_date = EXCLUDED.event_date,
          expected_guests = EXCLUDED.expected_guests,
          requirements = EXCLUDED.requirements,
          message = EXCLUDED.message,
          status = EXCLUDED.status,
          admin_notes = EXCLUDED.admin_notes,
          updated_at = NOW();`,
        [
          ref,
          enquiry.name,
          enquiry.phone,
          enquiry.email || null,
          enquiry.event_type,
          enquiry.event_date,
          Number(enquiry.expected_guests || 100),
          enquiry.requirements || '',
          (enquiry as any).message || '',
          mapHallEnquiryStatusToDb(enquiry.status),
          enquiry.admin_notes || null,
          enquiry.created_at || new Date().toISOString(),
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE HALL ENQUIRY SYNC WARN] (${enquiry.id}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadHallEnquiriesFromSupabase(): Promise<HallEnquiry[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id::text, enquiry_reference, name, phone, email, event_type,
          event_date::text as event_date, expected_guests, requirements,
          message, status, admin_notes, created_at
        FROM hall_enquiries
        ORDER BY created_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: row.enquiry_reference || `enq-${row.id}`,
        enquiry_reference: row.enquiry_reference,
        name: row.name,
        phone: row.phone,
        email: row.email || undefined,
        event_type: row.event_type,
        event_date: row.event_date,
        expected_guests: Number(row.expected_guests) || 100,
        requirements: row.requirements || '',
        message: row.message || '',
        status: mapDbToHallEnquiryStatus(row.status),
        admin_notes: row.admin_notes || undefined,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD HALL ENQUIRIES WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function syncConventionQuoteToSupabase(quote: ConventionQuote): Promise<void> {
  if (typeof window !== 'undefined' || !quote) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `INSERT INTO convention_quotes (
          id, quote_number, client_name, client_phone, client_email,
          event_name, event_date, seating_layout, guest_count,
          catering_package, catering_rate_per_plate, hall_rental_charge,
          av_sound_lighting, stage_decoration, generator_diesel,
          subtotal, gst_rate, gst_amount, total_amount, status,
          created_by, created_at, valid_until
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (quote_number) DO UPDATE SET
          client_name = EXCLUDED.client_name,
          client_phone = EXCLUDED.client_phone,
          client_email = EXCLUDED.client_email,
          event_name = EXCLUDED.event_name,
          event_date = EXCLUDED.event_date,
          seating_layout = EXCLUDED.seating_layout,
          guest_count = EXCLUDED.guest_count,
          catering_package = EXCLUDED.catering_package,
          catering_rate_per_plate = EXCLUDED.catering_rate_per_plate,
          hall_rental_charge = EXCLUDED.hall_rental_charge,
          av_sound_lighting = EXCLUDED.av_sound_lighting,
          stage_decoration = EXCLUDED.stage_decoration,
          generator_diesel = EXCLUDED.generator_diesel,
          subtotal = EXCLUDED.subtotal,
          gst_rate = EXCLUDED.gst_rate,
          gst_amount = EXCLUDED.gst_amount,
          total_amount = EXCLUDED.total_amount,
          status = EXCLUDED.status,
          valid_until = EXCLUDED.valid_until;`,
        [
          quote.id,
          quote.quote_number,
          quote.client_name || (quote as any).customer_name || (quote as any).name || 'Client',
          quote.client_phone || (quote as any).customer_phone || (quote as any).phone || '0000000000',
          quote.client_email || null,
          quote.event_name || (quote as any).name || 'Convention Event',
          quote.event_date || new Date().toISOString().split('T')[0],
          quote.seating_layout || 'theater',
          Number(quote.guest_count || 100),
          quote.catering_package || 'none',
          Number(quote.catering_rate_per_plate || 0),
          Number(quote.hall_rental_charge || 0),
          Number(quote.av_sound_lighting || 0),
          Number(quote.stage_decoration || 0),
          Number(quote.generator_diesel || 0),
          Number(quote.subtotal || 0),
          Number(quote.gst_rate || 0.05),
          Number(quote.gst_amount || 0),
          Number(quote.total_amount || 0),
          quote.status || 'draft',
          quote.created_by || 'Admin',
          quote.created_at || new Date().toISOString(),
          quote.valid_until || new Date().toISOString().split('T')[0],
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE CONVENTION QUOTE SYNC WARN] (${quote.quote_number}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadConventionQuotesFromSupabase(): Promise<ConventionQuote[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id, quote_number, client_name, client_phone, client_email,
          event_name, event_date::text as event_date, seating_layout,
          guest_count, catering_package, catering_rate_per_plate::float as catering_rate_per_plate,
          hall_rental_charge::float as hall_rental_charge, av_sound_lighting::float as av_sound_lighting,
          stage_decoration::float as stage_decoration, generator_diesel::float as generator_diesel,
          subtotal::float as subtotal, gst_rate::float as gst_rate, gst_amount::float as gst_amount,
          total_amount::float as total_amount, status, created_by, created_at, valid_until::text as valid_until
        FROM convention_quotes
        ORDER BY created_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        quote_number: row.quote_number,
        client_name: row.client_name,
        client_phone: row.client_phone,
        client_email: row.client_email || undefined,
        event_name: row.event_name,
        event_date: row.event_date,
        seating_layout: row.seating_layout,
        guest_count: Number(row.guest_count) || 100,
        catering_package: row.catering_package,
        catering_rate_per_plate: Number(row.catering_rate_per_plate) || 0,
        hall_rental_charge: Number(row.hall_rental_charge) || 0,
        av_sound_lighting: Number(row.av_sound_lighting) || 0,
        stage_decoration: Number(row.stage_decoration) || 0,
        generator_diesel: Number(row.generator_diesel) || 0,
        subtotal: Number(row.subtotal) || 0,
        gst_rate: Number(row.gst_rate) || 0.05,
        gst_amount: Number(row.gst_amount) || 0,
        total_amount: Number(row.total_amount) || 0,
        status: row.status,
        created_by: row.created_by,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        valid_until: row.valid_until,
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD CONVENTION QUOTES WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ==============================================================================
// 7. MAINTENANCE TICKETS SYNCHRONIZATION
// ==============================================================================

export async function syncMaintenanceTicketToSupabase(ticket: MaintenanceTicket): Promise<void> {
  if (typeof window !== 'undefined' || !ticket) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      const estimatedCost = Number(ticket.estimated_cost || 0);
      const actualCost = Number(ticket.actual_cost || 0);
      const cost = Number(ticket.actual_cost ?? ticket.estimated_cost ?? 0);
      const notes = ticket.resolution_notes || null;
      const createdAt = ticket.created_at || new Date().toISOString();
      const existing = await client.query('SELECT id FROM room_maintenance WHERE ticket_id = $1 LIMIT 1;', [ticket.id]);
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE room_maintenance 
           SET room_number = $1,
               issue_title = $2,
               issue_description = $3,
               category = $4,
               priority = $5,
               status = $6,
               assigned_technician = $7,
               reported_by = $8,
               estimated_cost = $9,
               actual_cost = $10,
               cost = $11,
               room_blocked = $12,
               resolution_notes = $13,
               notes = $14,
               updated_at = NOW()
           WHERE ticket_id = $15;`,
          [
            ticket.room_number,
            ticket.issue_title || ticket.description || 'Maintenance Issue',
            ticket.description || ticket.issue_title,
            ticket.category,
            ticket.priority || 'normal',
            (() => {
            const st = (ticket.status as any) || 'open';
            if (st === 'active' || st === 'pending') return 'open';
            return ['open', 'reported', 'in_progress', 'resolved', 'cancelled', 'closed'].includes(st) ? st : 'open';
          })(),
            ticket.assigned_to || null,
            ticket.reported_by || 'Staff',
            estimatedCost,
            actualCost,
            cost,
            Boolean(ticket.room_blocked),
            notes,
            notes,
            ticket.id,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO room_maintenance (
            ticket_id, room_number, issue_title, issue_description, category, priority, status,
            start_date, assigned_technician, reported_by, estimated_cost, actual_cost, cost,
            room_blocked, resolution_notes, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW());`,
          [
            ticket.id,
            ticket.room_number,
            ticket.issue_title || ticket.description || 'Maintenance Issue',
            ticket.description || ticket.issue_title,
            ticket.category,
            ticket.priority || 'normal',
            (['open', 'in_progress', 'resolved', 'cancelled'].includes(ticket.status as string) ? ticket.status : 'open'),
            createdAt.split('T')[0],
            ticket.assigned_to || null,
            ticket.reported_by || 'Staff',
            estimatedCost,
            actualCost,
            cost,
            Boolean(ticket.room_blocked),
            notes,
            notes,
            createdAt,
          ]
        );
      }
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE MAINTENANCE SYNC WARN] (${ticket.id}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadMaintenanceTicketsFromSupabase(): Promise<MaintenanceTicket[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          COALESCE(ticket_id, id::text) as id,
          COALESCE(room_number, '101') as room_number,
          COALESCE(issue_title, issue_description, 'Maintenance Issue') as issue_title,
          issue_description as description,
          COALESCE(category, 'ac_climate') as category,
          COALESCE(priority, 'normal') as priority,
          status,
          COALESCE(reported_by, 'Staff') as reported_by,
          created_at,
          assigned_technician as assigned_to,
          COALESCE(estimated_cost, cost, 0)::float as estimated_cost,
          COALESCE(actual_cost, 0)::float as actual_cost,
          COALESCE(cost, 0)::float as cost,
          COALESCE(room_blocked, false) as room_blocked,
          COALESCE(resolution_notes, notes) as resolution_notes
        FROM room_maintenance
        ORDER BY created_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        room_number: row.room_number,
        issue_title: row.issue_title,
        category: row.category,
        priority: row.priority,
        description: row.description,
        status: row.status,
        reported_by: row.reported_by,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        assigned_to: row.assigned_to || undefined,
        estimated_cost: Number(row.estimated_cost) || 0,
        actual_cost: Number(row.actual_cost) || undefined,
        room_blocked: Boolean(row.room_blocked),
        resolution_notes: row.resolution_notes || undefined,
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD MAINTENANCE WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function deleteMaintenanceTicketFromSupabase(id: string): Promise<void> {
  if (typeof window !== 'undefined' || !id) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(`DELETE FROM room_maintenance WHERE ticket_id = $1 OR id::text = $1;`, [id]);
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE DELETE MAINTENANCE WARN] (${id}):`, err instanceof Error ? err.message : String(err));
  }
}

// ==============================================================================
// 8. CASHBOOK: SHIFTS & TRANSACTIONS SYNCHRONIZATION
// ==============================================================================

export async function syncCashShiftToSupabase(shift: CashShift): Promise<void> {
  if (typeof window !== 'undefined' || !shift) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `INSERT INTO cash_shifts (
          id, shift_number, cashier_id, cashier_name, opened_by_name, opened_by_role, opened_at, closed_at,
          opening_float, closing_cash_counted, expected_closing_cash, discrepancy, notes, status,
          attendance_id, opening_denominations, closing_denominations, handover_notes, discrepancy_reason,
          closed_by_name, closed_by_role, total_cash_in, total_cash_out, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (shift_number) DO UPDATE SET
          cashier_id = EXCLUDED.cashier_id,
          cashier_name = EXCLUDED.cashier_name,
          opened_by_name = EXCLUDED.opened_by_name,
          opened_by_role = EXCLUDED.opened_by_role,
          opened_at = EXCLUDED.opened_at,
          closed_at = EXCLUDED.closed_at,
          opening_float = EXCLUDED.opening_float,
          closing_cash_counted = EXCLUDED.closing_cash_counted,
          expected_closing_cash = EXCLUDED.expected_closing_cash,
          discrepancy = EXCLUDED.discrepancy,
          notes = EXCLUDED.notes,
          status = EXCLUDED.status,
          attendance_id = EXCLUDED.attendance_id,
          opening_denominations = EXCLUDED.opening_denominations,
          closing_denominations = EXCLUDED.closing_denominations,
          handover_notes = EXCLUDED.handover_notes,
          discrepancy_reason = EXCLUDED.discrepancy_reason,
          closed_by_name = EXCLUDED.closed_by_name,
          closed_by_role = EXCLUDED.closed_by_role,
          total_cash_in = EXCLUDED.total_cash_in,
          total_cash_out = EXCLUDED.total_cash_out;`,
        [
          shift.id,
          shift.shift_number,
          shift.cashier_id,
          shift.cashier_name,
          shift.opened_by_name || shift.cashier_name || 'Front Desk Staff',
          shift.opened_by_role || 'Hotel Manager',
          shift.opened_at,
          shift.closed_at || null,
          Number(shift.opening_float || 0),
          shift.closing_cash_counted !== undefined ? Number(shift.closing_cash_counted) : null,
          shift.expected_closing_cash !== undefined ? Number(shift.expected_closing_cash) : null,
          Number(shift.discrepancy || 0),
          shift.notes || null,
          shift.status,
          shift.attendance_id || null,
          shift.opening_denominations ? JSON.stringify(shift.opening_denominations) : null,
          shift.closing_denominations ? JSON.stringify(shift.closing_denominations) : null,
          shift.handover_notes || null,
          shift.discrepancy_reason || null,
          shift.closed_by_name || null,
          shift.closed_by_role || null,
          shift.total_cash_in !== undefined ? Number(shift.total_cash_in) : null,
          shift.total_cash_out !== undefined ? Number(shift.total_cash_out) : null,
          shift.opened_at,
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE CASH SHIFT SYNC WARN] (${shift.id}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadCashShiftsFromSupabase(): Promise<CashShift[] | null> {
  if (typeof window !== 'undefined') return null;

  const db = getSupabasePgPool();
  if (!db) return null;

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id, shift_number, cashier_id, cashier_name, opened_by_name, opened_by_role, opened_at, closed_at,
          opening_float::float as opening_float,
          closing_cash_counted::float as closing_cash_counted,
          expected_closing_cash::float as expected_closing_cash,
          discrepancy::float as discrepancy, notes, status,
          attendance_id, opening_denominations, closing_denominations, handover_notes, discrepancy_reason,
          closed_by_name, closed_by_role,
          total_cash_in::float as total_cash_in,
          total_cash_out::float as total_cash_out
        FROM cash_shifts
        ORDER BY opened_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        shift_number: row.shift_number,
        cashier_id: row.cashier_id,
        cashier_name: row.cashier_name,
        opened_by_name: row.opened_by_name || undefined,
        opened_by_role: row.opened_by_role || undefined,
        opened_at: row.opened_at ? new Date(row.opened_at).toISOString() : new Date().toISOString(),
        closed_at: row.closed_at ? new Date(row.closed_at).toISOString() : undefined,
        opening_float: Number(row.opening_float) || 0,
        closing_cash_counted: row.closing_cash_counted !== null ? Number(row.closing_cash_counted) : undefined,
        expected_closing_cash: row.expected_closing_cash !== null ? Number(row.expected_closing_cash) : undefined,
        discrepancy: Number(row.discrepancy) || 0,
        notes: row.notes || undefined,
        status: row.status,
        attendance_id: row.attendance_id || undefined,
        opening_denominations: row.opening_denominations || undefined,
        closing_denominations: row.closing_denominations || undefined,
        handover_notes: row.handover_notes || undefined,
        discrepancy_reason: row.discrepancy_reason || undefined,
        closed_by_name: row.closed_by_name || undefined,
        closed_by_role: row.closed_by_role || undefined,
        total_cash_in: row.total_cash_in !== null ? Number(row.total_cash_in) : undefined,
        total_cash_out: row.total_cash_out !== null ? Number(row.total_cash_out) : undefined,
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD CASH SHIFTS WARN]', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function executeStartManagerShiftSupabase(params: {
  staffId: string;
  staffName: string;
  role: string;
  openingFloat: number;
  openingDenominations: Record<string, number>;
  shiftType?: string;
  notes?: string;
  actorName?: string;
}): Promise<{ attendance: StaffAttendance; shift: CashShift }> {
  const db = getSupabasePgPool();
  if (!db) throw new Error('Database connection pool unavailable.');

  const client = await db.connect();
  try {
    const res = await client.query(
      `SELECT public.start_manager_shift($1, $2, $3, $4, $5, $6, $7, $8) as result;`,
      [
        params.staffId,
        params.staffName,
        params.role,
        params.openingFloat,
        JSON.stringify(params.openingDenominations || {}),
        params.shiftType || 'general',
        params.notes || null,
        params.actorName || params.staffName,
      ]
    );
    const result = res.rows[0]?.result;
    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to start unified shift in PostgreSQL.');
    }
    return {
      attendance: result.attendance,
      shift: result.shift,
    };
  } finally {
    client.release();
  }
}

export async function executeEndManagerShiftSupabase(params: {
  shiftId: string;
  closingCashCounted: number;
  closingDenominations: Record<string, number>;
  handoverNotes?: string;
  discrepancyReason?: string;
  actorName?: string;
}): Promise<{
  attendance: StaffAttendance | null;
  shift: CashShift;
  financials: {
    openingFloat: number;
    totalCashIn: number;
    totalCashOut: number;
    expectedClosingCash: number;
    closingCashCounted: number;
    discrepancy: number;
    workHours: number;
  };
}> {
  const db = getSupabasePgPool();
  if (!db) throw new Error('Database connection pool unavailable.');

  const client = await db.connect();
  try {
    const res = await client.query(
      `SELECT public.end_manager_shift($1, $2, $3, $4, $5, $6) as result;`,
      [
        params.shiftId,
        params.closingCashCounted,
        JSON.stringify(params.closingDenominations || {}),
        params.handoverNotes || null,
        params.discrepancyReason || null,
        params.actorName || 'Duty Manager',
      ]
    );
    const result = res.rows[0]?.result;
    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to end unified shift in PostgreSQL.');
    }
    return {
      attendance: result.attendance,
      shift: result.shift,
      financials: result.financials,
    };
  } finally {
    client.release();
  }
}

export async function syncCashTransactionToSupabase(tx: CashTransaction): Promise<void> {
  if (typeof window !== 'undefined' || !tx) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `INSERT INTO cash_transactions (
          id, shift_id, type, category, amount, reason, booking_reference, receipt_ref, performed_by, performed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          amount = EXCLUDED.amount,
          reason = EXCLUDED.reason,
          booking_reference = EXCLUDED.booking_reference,
          receipt_ref = EXCLUDED.receipt_ref;`,
        [
          tx.id,
          tx.shift_id || null,
          tx.type,
          tx.category,
          Number(tx.amount || 0),
          tx.reason || (tx as any).description || 'Cash Transaction',
          tx.booking_reference || null,
          tx.receipt_ref || null,
          tx.performed_by,
          tx.performed_at,
          tx.performed_at,
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE CASH TX SYNC WARN] (${tx.id}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadCashTransactionsFromSupabase(): Promise<CashTransaction[] | null> {
  if (typeof window !== 'undefined') return null;

  const db = getSupabasePgPool();
  if (!db) return null;

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id, shift_id, type, category, amount::float as amount, reason,
          booking_reference, receipt_ref, performed_by, performed_at
        FROM cash_transactions
        ORDER BY performed_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        shift_id: row.shift_id || undefined,
        type: row.type,
        category: row.category,
        amount: Number(row.amount) || 0,
        reason: row.reason,
        booking_reference: row.booking_reference || undefined,
        receipt_ref: row.receipt_ref || undefined,
        performed_by: row.performed_by,
        performed_at: row.performed_at ? new Date(row.performed_at).toISOString() : new Date().toISOString(),
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD CASH TX WARN]', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function deleteCashShiftFromSupabase(shiftId: string): Promise<void> {
  if (typeof window !== 'undefined' || !shiftId) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query('DELETE FROM cash_transactions WHERE shift_id = $1', [shiftId]);
      await client.query('DELETE FROM cash_shifts WHERE id = $1 OR shift_number = $1', [shiftId]);
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE DELETE CASH SHIFT WARN] (${shiftId}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function deleteCashTransactionFromSupabase(id: string): Promise<void> {
  if (typeof window !== 'undefined' || !id) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query('DELETE FROM cash_transactions WHERE id = $1', [id]);
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE DELETE CASH TX WARN] (${id}):`, err instanceof Error ? err.message : String(err));
  }
}

// ==============================================================================
// 9. DAILY CLOSINGS SYNCHRONIZATION
// ==============================================================================

export async function syncDailyClosingToSupabase(closing: DailyClosing): Promise<void> {
  if (typeof window !== 'undefined' || !closing) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `INSERT INTO daily_closings (
          id, closing_date, total_revenue, room_revenue, hall_revenue, other_revenue,
          cash_collected, upi_collected, card_collected, online_collected,
          total_expenses, cash_expenses, expected_cash_in_drawer, actual_cash_counted,
          discrepancy, notes, closed_by_name, closed_by_role, status, closed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (closing_date) DO UPDATE SET
          total_revenue = EXCLUDED.total_revenue,
          room_revenue = EXCLUDED.room_revenue,
          hall_revenue = EXCLUDED.hall_revenue,
          other_revenue = EXCLUDED.other_revenue,
          cash_collected = EXCLUDED.cash_collected,
          upi_collected = EXCLUDED.upi_collected,
          card_collected = EXCLUDED.card_collected,
          online_collected = EXCLUDED.online_collected,
          total_expenses = EXCLUDED.total_expenses,
          cash_expenses = EXCLUDED.cash_expenses,
          expected_cash_in_drawer = EXCLUDED.expected_cash_in_drawer,
          actual_cash_counted = EXCLUDED.actual_cash_counted,
          discrepancy = EXCLUDED.discrepancy,
          notes = EXCLUDED.notes,
          closed_by_name = EXCLUDED.closed_by_name,
          closed_by_role = EXCLUDED.closed_by_role,
          status = EXCLUDED.status,
          closed_at = EXCLUDED.closed_at;`,
        [
          closing.id,
          closing.closing_date,
          Number(closing.total_revenue || 0),
          Number(closing.room_revenue || 0),
          Number(closing.hall_revenue || 0),
          Number(closing.other_revenue || 0),
          Number(closing.cash_collected || 0),
          Number(closing.upi_collected || 0),
          Number(closing.card_collected || 0),
          Number(closing.online_collected || 0),
          Number(closing.total_expenses || 0),
          Number(closing.cash_expenses || 0),
          Number(closing.expected_cash_in_drawer || 0),
          Number(closing.actual_cash_counted || 0),
          Number(closing.discrepancy || 0),
          closing.notes || null,
          closing.closed_by_name,
          closing.closed_by_role,
          closing.status,
          closing.closed_at,
          closing.created_at,
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE DAILY CLOSING SYNC WARN] (${closing.closing_date}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadDailyClosingsFromSupabase(): Promise<DailyClosing[] | null> {
  if (typeof window !== 'undefined') return null;

  const db = getSupabasePgPool();
  if (!db) return null;

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id, closing_date::text as closing_date, total_revenue::float as total_revenue,
          room_revenue::float as room_revenue, hall_revenue::float as hall_revenue,
          other_revenue::float as other_revenue, cash_collected::float as cash_collected,
          upi_collected::float as upi_collected, card_collected::float as card_collected,
          online_collected::float as online_collected, total_expenses::float as total_expenses,
          cash_expenses::float as cash_expenses, expected_cash_in_drawer::float as expected_cash_in_drawer,
          actual_cash_counted::float as actual_cash_counted, discrepancy::float as discrepancy,
          notes, closed_by_name, closed_by_role, status, closed_at, created_at
        FROM daily_closings
        ORDER BY closing_date DESC;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        closing_date: row.closing_date,
        total_revenue: Number(row.total_revenue) || 0,
        room_revenue: Number(row.room_revenue) || 0,
        hall_revenue: Number(row.hall_revenue) || 0,
        other_revenue: Number(row.other_revenue) || 0,
        cash_collected: Number(row.cash_collected) || 0,
        upi_collected: Number(row.upi_collected) || 0,
        card_collected: Number(row.card_collected) || 0,
        online_collected: Number(row.online_collected) || 0,
        total_expenses: Number(row.total_expenses) || 0,
        cash_expenses: Number(row.cash_expenses) || 0,
        expected_cash_in_drawer: Number(row.expected_cash_in_drawer) || 0,
        actual_cash_counted: Number(row.actual_cash_counted) || 0,
        discrepancy: Number(row.discrepancy) || 0,
        notes: row.notes || undefined,
        closed_by_name: row.closed_by_name,
        closed_by_role: row.closed_by_role,
        status: row.status,
        closed_at: row.closed_at ? new Date(row.closed_at).toISOString() : new Date().toISOString(),
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD DAILY CLOSINGS WARN]', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ==============================================================================
// 10. STAFF ATTENDANCE SYNCHRONIZATION
// ==============================================================================

export async function syncStaffAttendanceToSupabase(attendance: StaffAttendance): Promise<void> {
  if (typeof window !== 'undefined' || !attendance) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `INSERT INTO staff_attendance (
          id, staff_id, staff_name, role, date, shift, clock_in, clock_out, status, work_hours, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          clock_out = EXCLUDED.clock_out,
          status = EXCLUDED.status,
          work_hours = EXCLUDED.work_hours,
          notes = EXCLUDED.notes;`,
        [
          attendance.id,
          attendance.staff_id,
          attendance.staff_name,
          attendance.role,
          attendance.date,
          attendance.shift,
          attendance.clock_in || null,
          attendance.clock_out || null,
          attendance.status,
          Number(attendance.work_hours || 0),
          attendance.notes || null,
          attendance.created_at,
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[SUPABASE ATTENDANCE SYNC WARN] (${attendance.id}):`, msg);
    if (
      msg.includes('MANAGER_DUTY_COLLISION') ||
      msg.includes('idx_single_active_duty_manager') ||
      msg.includes('Duty Manager') ||
      msg.includes('clock')
    ) {
      throw err;
    }
  }
}

export async function loadStaffAttendanceFromSupabase(): Promise<StaffAttendance[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id, staff_id, staff_name, role, date::text as date, shift,
          clock_in, clock_out, status, work_hours::float as work_hours, notes, created_at
        FROM staff_attendance
        ORDER BY date DESC, created_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        staff_id: row.staff_id,
        staff_name: row.staff_name,
        role: row.role,
        date: row.date,
        shift: row.shift,
        clock_in: row.clock_in ? new Date(row.clock_in).toISOString() : undefined,
        clock_out: row.clock_out ? new Date(row.clock_out).toISOString() : undefined,
        status: row.status,
        work_hours: Number(row.work_hours) || 0,
        notes: row.notes || undefined,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD ATTENDANCE WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function loadStaffFromSupabase(): Promise<StaffMember[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          p.id,
          p.full_name,
          u.email,
          p.phone,
          r.name as role_name,
          p.is_active,
          p.last_login_at
        FROM profiles p
        LEFT JOIN roles r ON p.role_id = r.id
        LEFT JOIN auth.users u ON p.id = u.id
        WHERE p.is_active = true
        ORDER BY p.created_at ASC;
      `);

      if (!res.rows || res.rows.length === 0) return [];

      return res.rows.map((row: any) => {
        const role = (row.role_name || 'Front Desk') as StaffRole;
        const isManager = role === 'Hotel Manager';
        const isAdmin = role === 'Super Admin';

        return {
          id: row.id,
          full_name: row.full_name,
          email: row.email || `${row.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@sritayigrand.com`,
          phone: row.phone || '',
          role,
          department: isManager ? 'Hotel Operations & Management' : isAdmin ? 'Executive Management' : 'Front Desk & Reception',
          is_active: row.is_active !== false,
          last_login: row.last_login_at ? new Date(row.last_login_at).toISOString() : new Date().toISOString(),
          permissions: {
            can_override_rates: isAdmin || isManager,
            can_process_refunds: isAdmin || isManager,
            can_view_accounting: isAdmin || isManager,
            can_encode_rfid: true,
            can_run_night_audit: isAdmin || isManager,
            can_manage_inventory: true,
          },
        };
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD STAFF WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ==============================================================================
// 11. CONTACT ENQUIRIES SYNCHRONIZATION
// ==============================================================================

export async function syncContactEnquiryToSupabase(enq: ContactEnquiry): Promise<void> {
  if (typeof window !== 'undefined' || !enq) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `INSERT INTO contact_enquiries (
          id, name, phone, email, subject, message, check_in_date, check_out_date,
          room_type, adults_count, status, source, admin_notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          admin_notes = EXCLUDED.admin_notes,
          updated_at = NOW();`,
        [
          enq.id,
          enq.name,
          enq.phone,
          enq.email || null,
          enq.subject || null,
          enq.message,
          enq.check_in_date || null,
          enq.check_out_date || null,
          enq.room_type || null,
          Number(enq.adults_count || 1),
          enq.status,
          enq.source,
          enq.admin_notes || null,
          enq.created_at || new Date().toISOString(),
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE CONTACT ENQ SYNC WARN] (${enq.id}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadContactEnquiriesFromSupabase(): Promise<ContactEnquiry[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id, name, phone, email, subject, message,
          check_in_date::text as check_in_date, check_out_date::text as check_out_date,
          room_type, adults_count, status, source, admin_notes, created_at, updated_at
        FROM contact_enquiries
        ORDER BY created_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email || undefined,
        subject: row.subject || undefined,
        message: row.message,
        check_in_date: row.check_in_date || undefined,
        check_out_date: row.check_out_date || undefined,
        room_type: row.room_type || undefined,
        adults_count: Number(row.adults_count) || 1,
        status: row.status,
        source: row.source,
        admin_notes: row.admin_notes || undefined,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD CONTACT ENQUIRIES WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ==============================================================================
// 12. FOLIO CHARGES (ADDITIONAL CHARGES) SYNCHRONIZATION
// ==============================================================================

export async function syncFolioChargeToSupabase(charge: FolioCharge): Promise<void> {
  if (typeof window !== 'undefined' || !charge) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      let bookingUuid: string | null = null;
      if (charge.booking_reference) {
        const bRes = await client.query('SELECT id FROM bookings WHERE booking_reference = $1 OR id::text = $1 LIMIT 1;', [charge.booking_reference]);
        if (bRes.rows.length > 0) bookingUuid = bRes.rows[0].id;
      }

      const chargeName = charge.description || (charge as any).charge_name || (charge as any).item_name || 'Room Charge';
      const desc = charge.description || chargeName;

      await client.query(
        `INSERT INTO additional_charges (
          id, booking_id, charge_id, booking_reference, charge_name, description, category,
          amount, tax_rate, tax_amount, total_amount, posted_by, created_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
        [
          bookingUuid,
          charge.id,
          charge.booking_reference,
          chargeName,
          desc,
          charge.category || 'other',
          Number(charge.amount || 0),
          Number(charge.tax_rate || 0.05),
          Number(charge.tax_amount || 0),
          Number(charge.total_amount || 0),
          charge.posted_by || 'Staff',
          charge.created_at || new Date().toISOString(),
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE FOLIO CHARGE SYNC WARN] (${charge.id}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadFolioChargesFromSupabase(): Promise<FolioCharge[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          COALESCE(charge_id, id::text) as id,
          COALESCE(booking_reference, '') as booking_reference,
          COALESCE(charge_name, description, 'Charge') as description,
          COALESCE(category, 'room_service') as category,
          amount::float as amount,
          tax_rate::float as tax_rate,
          tax_amount::float as tax_amount,
          total_amount::float as total_amount,
          COALESCE(posted_by, 'Front Desk') as posted_by,
          created_at
        FROM additional_charges
        ORDER BY created_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        booking_id: row.booking_reference,
        booking_reference: row.booking_reference,
        description: row.description,
        category: row.category,
        amount: Number(row.amount) || 0,
        tax_rate: Number(row.tax_rate) || 0.05,
        tax_amount: Number(row.tax_amount) || 0,
        total_amount: Number(row.total_amount) || Number(row.amount) || 0,
        posted_by: row.posted_by,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD FOLIO CHARGES WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function deleteFolioChargeFromSupabase(id: string): Promise<void> {
  if (typeof window !== 'undefined' || !id) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(`DELETE FROM additional_charges WHERE charge_id = $1 OR id::text = $1;`, [id]);
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE DELETE FOLIO CHARGE WARN] (${id}):`, err instanceof Error ? err.message : String(err));
  }
}

// ==============================================================================
// 13. AUDIT LOGS SYNCHRONIZATION
// ==============================================================================

export async function syncAuditLogToSupabase(log: AuditLogEntry): Promise<void> {
  if (typeof window !== 'undefined' || !log) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `INSERT INTO audit_logs (
          action, entity_name, entity_id, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5);`,
        [
          log.action,
          log.entityType || 'SYSTEM',
          log.entityId || null,
          log.ipAddress || '127.0.0.1',
          log.timestamp || new Date().toISOString(),
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE AUDIT LOG SYNC WARN] (${log.id}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadAuditLogsFromSupabase(): Promise<AuditLogEntry[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id::text as id,
          action,
          COALESCE(entity_name, 'SYSTEM') as entity_type,
          entity_id,
          COALESCE(ip_address, '127.0.0.1') as ip_address,
          created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 500;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        userId: 'admin-user',
        userName: 'Admin',
        userRole: 'admin',
        action: row.action,
        entityType: row.entity_type as any,
        entityId: row.entity_id || 'system',
        details: '',
        ipAddress: row.ip_address || '127.0.0.1',
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD AUDIT LOGS WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ==============================================================================
// 14. REVIEWS SYNCHRONIZATION
// ==============================================================================

export async function loadReviewsFromSupabase(): Promise<GoogleReview[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id, hotel_name, reviewer_name, rating, rating_label, review_date_display,
          retrieval_date::text as retrieval_date, excerpt, full_text, is_rating_only,
          is_translated, source_platform, source_url, is_featured, is_published, display_order
        FROM reviews
        ORDER BY display_order ASC, created_at DESC;
      `);

      if (res.rows.length === 0) return [];

      return res.rows.map((row: any) => ({
        id: row.id,
        hotel_name: row.hotel_name,
        reviewer_name: row.reviewer_name,
        rating: Number(row.rating) || 5,
        rating_label: row.rating_label,
        review_date_display: row.review_date_display,
        retrieval_date: row.retrieval_date,
        excerpt: row.excerpt,
        full_text: row.full_text || undefined,
        is_rating_only: Boolean(row.is_rating_only),
        is_translated: Boolean(row.is_translated),
        source_platform: row.source_platform,
        source_url: row.source_url,
        is_featured: Boolean(row.is_featured),
        is_published: Boolean(row.is_published),
        display_order: Number(row.display_order) || 0,
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD REVIEWS WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function deleteReviewFromSupabase(id: string): Promise<void> {
  if (typeof window !== 'undefined' || !id) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(`DELETE FROM reviews WHERE id = $1;`, [id]);
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE DELETE REVIEW WARN] (${id}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function syncReviewToSupabase(review: GoogleReview): Promise<void> {
  if (typeof window !== 'undefined' || !review || !review.id) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(`
        INSERT INTO reviews (
          id, hotel_name, reviewer_name, rating, rating_label, review_date_display,
          retrieval_date, excerpt, full_text, is_rating_only,
          is_translated, source_platform, source_url, is_featured, is_published, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          hotel_name = EXCLUDED.hotel_name,
          reviewer_name = EXCLUDED.reviewer_name,
          rating = EXCLUDED.rating,
          rating_label = EXCLUDED.rating_label,
          review_date_display = EXCLUDED.review_date_display,
          retrieval_date = EXCLUDED.retrieval_date,
          excerpt = EXCLUDED.excerpt,
          full_text = EXCLUDED.full_text,
          is_rating_only = EXCLUDED.is_rating_only,
          is_translated = EXCLUDED.is_translated,
          source_platform = EXCLUDED.source_platform,
          source_url = EXCLUDED.source_url,
          is_featured = EXCLUDED.is_featured,
          is_published = EXCLUDED.is_published,
          display_order = EXCLUDED.display_order;
      `, [
        review.id,
        review.hotel_name || 'SRI TAYI GRAND',
        review.reviewer_name,
        review.rating || 5,
        review.rating_label || '5 stars',
        review.review_date_display || 'Recently added',
        review.retrieval_date || new Date().toISOString().split('T')[0],
        review.excerpt || '',
        review.full_text || review.excerpt || null,
        Boolean(review.is_rating_only),
        Boolean(review.is_translated),
        review.source_platform || 'Google',
        review.source_url || 'https://www.google.com/travel/search?q=sri%20tayi%20grand%20kadiri',
        Boolean(review.is_featured),
        review.is_published !== undefined ? Boolean(review.is_published) : true,
        Number(review.display_order) || 99
      ]);
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE SYNC REVIEW WARN] (${review.id}):`, err instanceof Error ? err.message : String(err));
  }
}

// ==============================================================================
// 15. WEBSITE CONTENT SYNCHRONIZATION
// ==============================================================================

export async function syncWebsiteContentToSupabase(key: string, section: string, contentValue: any): Promise<void> {
  if (typeof window !== 'undefined' || !key) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `INSERT INTO website_content (key, section, content_value, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET
           section = EXCLUDED.section,
           content_value = EXCLUDED.content_value,
           updated_at = NOW();`,
        [key, section, JSON.stringify(contentValue)]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE WEBSITE CONTENT SYNC WARN] (${key}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadWebsiteContentFromSupabase(): Promise<Record<string, any>> {
  if (typeof window !== 'undefined') return {};

  const db = getSupabasePgPool();
  if (!db) return {};

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`SELECT key, content_value FROM website_content;`);
      const map: Record<string, any> = {};
      for (const row of res.rows) {
        map[row.key] = row.content_value;
      }
      return map;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD WEBSITE CONTENT WARN]', err instanceof Error ? err.message : String(err));
    return {};
  }
}

// ==============================================================================
// 3.5. ROOM CATEGORIES SYNCHRONIZATION
// ==============================================================================

export async function loadCategoriesFromSupabase(): Promise<RoomCategory[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id, slug, name, short_description, full_description, 
          base_price_per_night, max_adults, max_children, max_occupancy, 
          bed_type, room_size_sqft, cover_image_url, is_active
        FROM room_categories
        ORDER BY base_price_per_night ASC;
      `);
      return res.rows.map((r: any) => ({
        id: normalizeCategoryId(r.slug || r.id),
        slug: r.slug,
        name: r.name,
        short_description: r.short_description || '',
        full_description: r.full_description || '',
        base_price_per_night: Number(r.base_price_per_night),
        base_tariff_paise: Math.round(Number(r.base_price_per_night) * 100),
        max_adults: Number(r.max_adults) || 2,
        max_children: Number(r.max_children) || 1,
        max_occupancy: Number(r.max_occupancy) || 3,
        bed_type: r.bed_type || 'Double Bed',
        room_size_sqft: Number(r.room_size_sqft) || 250,
        cover_image_url: r.cover_image_url || '/images/hotel/room-double-bed-photo-enhanced.png',
        gallery_images: [],
        amenities: [],
        is_active: r.is_active !== false,
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD CATEGORIES WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function syncCategoryToSupabase(category: RoomCategory): Promise<void> {
  if (typeof window !== 'undefined' || !category) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `UPDATE room_categories 
         SET name = $1,
             short_description = COALESCE($2, short_description),
             base_price_per_night = $3,
             bed_type = COALESCE($4, bed_type),
             max_occupancy = COALESCE($5, max_occupancy),
             is_active = COALESCE($6, is_active),
             cover_image_url = COALESCE($7, cover_image_url),
             updated_at = NOW()
         WHERE id::text = $8 OR slug = $9;`,
        [
          category.name,
          category.short_description || null,
          category.base_price_per_night,
          category.bed_type || null,
          category.max_occupancy,
          category.is_active,
          category.cover_image_url || null,
          category.id,
          category.slug || category.name.toLowerCase().replace(/\s+/g, '-'),
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(
      `[SUPABASE CATEGORY SYNC WARN] (${category.name}):`,
      err instanceof Error ? err.message : String(err)
    );
  }
}


export async function syncRoomTransferToSupabase(transfer: RoomTransferRecord): Promise<void> {
  if (typeof window !== 'undefined' || !transfer) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query(
        `INSERT INTO room_transfers (
          id,
          booking_reference,
          from_room_number,
          to_room_number,
          from_room_id,
          to_room_id,
          reason_category,
          reason_notes,
          actor,
          old_room_status,
          maintenance_ticket_id,
          transferred_at,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::timestamptz, NOW()), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          reason_notes = EXCLUDED.reason_notes,
          old_room_status = EXCLUDED.old_room_status,
          maintenance_ticket_id = COALESCE(EXCLUDED.maintenance_ticket_id, room_transfers.maintenance_ticket_id);`,
        [
          transfer.id,
          transfer.booking_reference,
          transfer.from_room_number,
          transfer.to_room_number,
          transfer.from_room_id || null,
          transfer.to_room_id || null,
          transfer.reason_category,
          transfer.reason_notes,
          transfer.actor,
          transfer.old_room_status,
          transfer.maintenance_ticket_id || null,
          transfer.transferred_at || new Date().toISOString(),
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(
      `[SUPABASE ROOM TRANSFER SYNC WARN] (${transfer.booking_reference}):`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function loadRoomTransfersFromSupabase(): Promise<RoomTransferRecord[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(
        `SELECT * FROM room_transfers ORDER BY transferred_at DESC;`
      );
      return res.rows.map((r: any) => ({
        id: r.id,
        booking_reference: r.booking_reference,
        from_room_number: r.from_room_number,
        to_room_number: r.to_room_number,
        from_room_id: r.from_room_id || '',
        to_room_id: r.to_room_id || '',
        reason_category: r.reason_category,
        reason_notes: r.reason_notes || '',
        actor: r.actor || 'Front Desk',
        old_room_status: r.old_room_status || 'cleaning',
        maintenance_ticket_id: r.maintenance_ticket_id || undefined,
        transferred_at: r.transferred_at ? new Date(r.transferred_at).toISOString() : new Date().toISOString(),
        created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD ROOM TRANSFERS WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ==============================================================================
// 18B. STAY EXTENSIONS SYNCHRONIZATION
// ==============================================================================

export async function syncStayExtensionToSupabase(ext: StayExtensionRecord): Promise<void> {
  if (typeof window !== 'undefined' || !ext) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      let bookingUuid: string | null = null;
      let guestUuid: string | null = null;
      if (ext.booking_reference) {
        const bRes = await client.query('SELECT id, guest_id FROM bookings WHERE booking_reference = $1 OR id::text = $1 LIMIT 1;', [ext.booking_reference]);
        if (bRes.rows.length > 0) {
          bookingUuid = bRes.rows[0].id;
          guestUuid = bRes.rows[0].guest_id;
        }
      }

      await client.query(
        `INSERT INTO stay_extensions (
          id,
          booking_id,
          booking_reference,
          guest_id,
          guest_name,
          room_id,
          room_number,
          previous_checkout_date,
          new_checkout_date,
          additional_nights,
          daily_room_charge,
          additional_room_charge,
          tax_rate,
          tax_amount,
          total_extension_charge,
          pricing_mode,
          paid_now,
          payment_method,
          payment_reference,
          status,
          performed_by,
          idempotency_key,
          reason,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, COALESCE($24::timestamptz, NOW())
        )
        ON CONFLICT (id) DO UPDATE SET
          new_checkout_date = EXCLUDED.new_checkout_date,
          additional_nights = EXCLUDED.additional_nights,
          daily_room_charge = EXCLUDED.daily_room_charge,
          additional_room_charge = EXCLUDED.additional_room_charge,
          tax_amount = EXCLUDED.tax_amount,
          total_extension_charge = EXCLUDED.total_extension_charge,
          paid_now = EXCLUDED.paid_now,
          payment_method = EXCLUDED.payment_method,
          payment_reference = EXCLUDED.payment_reference,
          status = EXCLUDED.status,
          reason = EXCLUDED.reason;`,
        [
          ext.id,
          bookingUuid,
          ext.booking_reference,
          guestUuid,
          ext.guest_name,
          ext.room_id || null,
          ext.room_number,
          ext.previous_checkout_date,
          ext.new_checkout_date,
          Number(ext.additional_nights || 1),
          Number(ext.daily_room_charge || 0),
          Number(ext.additional_room_charge || 0),
          Number(ext.tax_rate || 0.12),
          Number(ext.tax_amount || 0),
          Number(ext.total_extension_charge || 0),
          ext.pricing_mode || 'gst_inclusive',
          Number(ext.paid_now || 0),
          ext.payment_method || null,
          ext.payment_reference || null,
          ext.status || 'active',
          ext.performed_by || 'Front Desk',
          ext.idempotency_key || null,
          ext.reason || null,
          ext.created_at || new Date().toISOString(),
        ]
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(
      `[SUPABASE STAY EXTENSION SYNC WARN] (${ext.booking_reference}):`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function loadStayExtensionsFromSupabase(): Promise<StayExtensionRecord[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(
        `SELECT * FROM stay_extensions ORDER BY created_at DESC;`
      );
      return res.rows.map((r: any) => ({
        id: r.id,
        booking_id: r.booking_id || undefined,
        booking_reference: r.booking_reference,
        guest_id: r.guest_id || undefined,
        guest_name: r.guest_name,
        room_id: r.room_id || undefined,
        room_number: r.room_number,
        previous_checkout_date: r.previous_checkout_date,
        new_checkout_date: r.new_checkout_date,
        additional_nights: Number(r.additional_nights) || 1,
        daily_room_charge: Number(r.daily_room_charge) || 0,
        additional_room_charge: Number(r.additional_room_charge) || 0,
        tax_rate: Number(r.tax_rate) || 0.12,
        tax_amount: Number(r.tax_amount) || 0,
        total_extension_charge: Number(r.total_extension_charge) || 0,
        pricing_mode: r.pricing_mode || 'gst_inclusive',
        paid_now: Number(r.paid_now) || 0,
        payment_method: r.payment_method || undefined,
        payment_reference: r.payment_reference || undefined,
        status: r.status || 'active',
        performed_by: r.performed_by || 'Front Desk',
        idempotency_key: r.idempotency_key || undefined,
        reason: r.reason || undefined,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD STAY EXTENSIONS WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ==============================================================================
// 19. GENERAL LEDGER ACCOUNTING SYNCHRONIZATION
// ==============================================================================

export async function syncJournalEntryToSupabase(entry: JournalEntry): Promise<void> {
  if (typeof window !== 'undefined' || !entry) return;

  const db = getSupabasePgPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO journal_entries (
          id, entry_number, date, reference, description, total_debit, total_credit,
          is_balanced, is_posted, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (id) DO UPDATE SET
          entry_number = EXCLUDED.entry_number,
          date = EXCLUDED.date,
          reference = EXCLUDED.reference,
          description = EXCLUDED.description,
          total_debit = EXCLUDED.total_debit,
          total_credit = EXCLUDED.total_credit,
          is_balanced = EXCLUDED.is_balanced,
          is_posted = EXCLUDED.is_posted,
          updated_at = NOW();`,
        [
          entry.id,
          entry.entry_number,
          entry.date,
          entry.reference || null,
          entry.description,
          Number(entry.total_debit || 0),
          Number(entry.total_credit || 0),
          entry.is_balanced,
          entry.is_posted,
          entry.created_by || 'Admin',
          entry.created_at || new Date().toISOString(),
        ]
      );

      // Refresh line items
      await client.query('DELETE FROM journal_lines WHERE entry_id = $1;', [entry.id]);

      if (Array.isArray(entry.lines)) {
        for (let i = 0; i < entry.lines.length; i++) {
          const line = entry.lines[i];
          const lineId = `${entry.id}-line-${i + 1}`;
          await client.query(
            `INSERT INTO journal_lines (
              id, entry_id, account_code, account_name, debit, credit, description, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());`,
            [
              lineId,
              entry.id,
              line.accountCode,
              line.accountName,
              Number(line.debit || 0),
              Number(line.credit || 0),
              line.description || null,
            ]
          );
        }
      }
      await client.query('COMMIT');
    } catch (err: unknown) {
      await client.query('ROLLBACK').catch(() => {});
      console.warn(`[SUPABASE JOURNAL SYNC WARN] (${entry.id}):`, err instanceof Error ? err.message : String(err));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn(`[SUPABASE JOURNAL SYNC POOL WARN] (${entry.id}):`, err instanceof Error ? err.message : String(err));
  }
}

export async function loadJournalEntriesFromSupabase(): Promise<JournalEntry[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const entriesRes = await client.query(`
        SELECT id, entry_number, date::text as date, reference, description,
               total_debit::float as total_debit, total_credit::float as total_credit,
               is_balanced, is_posted, created_by, created_at
        FROM journal_entries
        ORDER BY date DESC, created_at DESC;
      `);

      if (!entriesRes.rows || entriesRes.rows.length === 0) return [];

      const linesRes = await client.query(`
        SELECT id, entry_id, account_code, account_name, debit::float as debit,
               credit::float as credit, description
        FROM journal_lines
        ORDER BY id ASC;
      `);

      const linesByEntry = new Map<string, JournalLine[]>();
      for (const row of linesRes.rows) {
        if (!linesByEntry.has(row.entry_id)) {
          linesByEntry.set(row.entry_id, []);
        }
        linesByEntry.get(row.entry_id)!.push({
          accountCode: row.account_code,
          accountName: row.account_name,
          debit: Number(row.debit) || 0,
          credit: Number(row.credit) || 0,
          description: row.description || undefined,
        });
      }

      return entriesRes.rows.map((r: any) => ({
        id: r.id,
        entry_number: r.entry_number,
        date: r.date,
        reference: r.reference || '',
        description: r.description,
        lines: linesByEntry.get(r.id) || [],
        total_debit: Number(r.total_debit) || 0,
        total_credit: Number(r.total_credit) || 0,
        is_balanced: Boolean(r.is_balanced),
        is_posted: Boolean(r.is_posted),
        created_by: r.created_by,
        created_at: r.created_at,
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD JOURNAL ENTRIES WARN]', err instanceof Error ? err.message : String(err));
    return [];
  }
}


export async function syncGuestToSupabase(guest: Partial<Guest>): Promise<void> {
  const db = getSupabasePgPool();
  if (!db) return;
  const client = await db.connect();
  try {
    const isUuid = guest.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guest.id);
    if (isUuid) {
      await client.query(
        `UPDATE guests
         SET full_name = COALESCE($1, full_name),
             phone = COALESCE($2, phone),
             email = COALESCE($3, email),
             address = COALESCE($4, address),
             city = COALESCE($5, city),
             state = COALESCE($6, state),
             id_type = COALESCE($7, id_type),
             id_number = COALESCE($8, id_number),
             notes = COALESCE($9, notes),
             updated_at = NOW()
         WHERE id = $10;`,
        [
          guest.full_name || null,
          guest.phone || null,
          guest.email || null,
          guest.address || null,
          guest.city || null,
          guest.state || null,
          guest.id_type || null,
          guest.id_number || null,
          guest.notes || null,
          guest.id,
        ]
      );
    } else {
      const res = await client.query(
        `INSERT INTO guests (full_name, phone, email, address, city, state, country, id_type, id_number, total_stays, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'India', $7, $8, 0, $9)
         RETURNING id;`,
        [
          guest.full_name || 'Guest',
          guest.phone || null,
          guest.email || null,
          guest.address || null,
          guest.city || null,
          guest.state || null,
          guest.id_type || null,
          guest.id_number || null,
          guest.notes || null,
        ]
      );
      if (res.rows.length > 0 && guest) {
        guest.id = res.rows[0].id;
      }
    }
  } catch (err: any) {
    console.warn('[SUPABASE GUEST SYNC WARN]:', err.message);
  } finally {
    client.release();
  }
}

export async function loadGuestsFromSupabase(): Promise<Guest[]> {
  const db = getSupabasePgPool();
  if (!db) return [];
  const client = await db.connect();
  try {
    const res = await client.query(`SELECT * FROM guests ORDER BY updated_at DESC LIMIT 500;`);
    return res.rows.map((r: any) => ({
      id: r.id,
      full_name: r.full_name,
      phone: r.phone || '',
      email: r.email || '',
      address: r.address || '',
      city: r.city || '',
      state: r.state || '',
      country: r.country || 'India',
      id_type: r.id_type || '',
      id_number: r.id_number || '',
      total_stays: Number(r.total_stays) || 0,
      total_spend: 0,
      vip_tier: 'regular',
      is_blacklisted: false,
      notes: r.notes || '',
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('[SUPABASE LOAD GUESTS WARN]', err.message);
    return [];
  } finally {
    client.release();
  }
}

/**
 * ==============================================================================
 * NIGHT AUDIT SUPABASE CLOUD SYNCHRONIZATION
 * Persists night audit automated settings and recipients directly into PostgreSQL.
 * ==============================================================================
 */

export async function syncNightAuditConfigToSupabase(config: NightAuditConfig): Promise<void> {
  const db = getSupabasePgPool();
  if (!db) return;
  const client = await db.connect();
  try {
    // 1. Upsert settings
    await client.query(`
      INSERT INTO night_audit_settings (id, hotel_id, enabled, execution_time, timezone, email_enabled, whatsapp_enabled, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        execution_time = EXCLUDED.execution_time,
        timezone = EXCLUDED.timezone,
        email_enabled = EXCLUDED.email_enabled,
        whatsapp_enabled = EXCLUDED.whatsapp_enabled,
        updated_at = NOW();
    `, [
      'stg-audit-settings',
      'sri-tayi-grand',
      Boolean(config.enabled),
      config.execution_time || '00:00',
      config.timezone || 'Asia/Kolkata',
      Boolean(config.email_enabled),
      Boolean(config.whatsapp_enabled)
    ]);

    // 2. Upsert recipients and clean up removed ones
    if (Array.isArray(config.recipients)) {
      const activeIds = config.recipients.map(r => r.id).filter(Boolean);
      if (activeIds.length > 0) {
        await client.query(
          `DELETE FROM night_audit_recipients WHERE id NOT IN (${activeIds.map((_, i) => `$${i + 1}`).join(', ')});`,
          activeIds
        );
      } else {
        await client.query(`DELETE FROM night_audit_recipients;`);
      }

      for (const r of config.recipients) {
        const addr = (r.address || r.recipient_address || '').trim().toLowerCase();
        const name = (r.name || r.recipient_name || 'Recipient').trim();
        const id = r.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const role = r.role || 'General Manager';
        const createdBy = r.created_by || 'Super Admin';

        await client.query(`
          INSERT INTO night_audit_recipients (id, hotel_id, channel, recipient_name, recipient_address, role, is_active, consent_status, created_by, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (id) DO UPDATE SET
            channel = EXCLUDED.channel,
            recipient_name = EXCLUDED.recipient_name,
            recipient_address = EXCLUDED.recipient_address,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
        `, [
          id,
          'sri-tayi-grand',
          r.channel || 'email',
          name,
          addr,
          role,
          r.is_active !== false,
          r.consent_status || 'granted',
          createdBy
        ]);
      }
    }
  } catch (err: any) {
    console.warn('[SUPABASE SYNC NIGHT AUDIT CONFIG WARN]', err.message);
  } finally {
    client.release();
  }
}

export async function upsertNightAuditRecipientInSupabase(recipient: NightAuditRecipient): Promise<NightAuditRecipient | null> {
  const db = getSupabasePgPool();
  if (!db) return null;
  const client = await db.connect();
  try {
    const id = recipient.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const addr = (recipient.address || recipient.recipient_address || '').trim().toLowerCase();
    const name = (recipient.name || recipient.recipient_name || 'Recipient').trim();
    const role = recipient.role || 'General Manager';
    const channel = recipient.channel || 'email';
    const isActive = recipient.is_active !== false;
    const consent = recipient.consent_status || 'granted';
    const createdBy = recipient.created_by || 'Super Admin';

    const res = await client.query(`
      INSERT INTO night_audit_recipients (id, hotel_id, channel, recipient_name, recipient_address, role, is_active, consent_status, created_by, updated_at)
      VALUES ($1, 'sri-tayi-grand', $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (hotel_id, channel, lower(recipient_address)) DO UPDATE SET
        recipient_name = EXCLUDED.recipient_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *;
    `, [id, channel, name, addr, role, isActive, consent, createdBy]);

    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      hotel_id: r.hotel_id,
      channel: r.channel,
      name: r.recipient_name,
      recipient_name: r.recipient_name,
      address: r.recipient_address,
      recipient_address: r.recipient_address,
      role: r.role,
      is_active: r.is_active,
      consent_status: r.consent_status,
      created_by: r.created_by,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined
    };
  } catch (err: any) {
    console.warn('[SUPABASE UPSERT NIGHT AUDIT RECIPIENT WARN]', err.message);
    return null;
  } finally {
    client.release();
  }
}

export async function loadNightAuditConfigFromSupabase(): Promise<NightAuditConfig | null> {
  const db = getSupabasePgPool();
  if (!db) return null;
  const client = await db.connect();
  try {
    const sRes = await client.query(`SELECT * FROM night_audit_settings WHERE id = 'stg-audit-settings' LIMIT 1;`);
    const rRes = await client.query(`SELECT * FROM night_audit_recipients ORDER BY created_at ASC;`);
    
    if (sRes.rows.length === 0) return null;
    const s = sRes.rows[0];

    const recipients: NightAuditRecipient[] = rRes.rows.map((r: any) => ({
      id: r.id,
      hotel_id: r.hotel_id,
      channel: r.channel,
      name: r.recipient_name,
      recipient_name: r.recipient_name,
      address: r.recipient_address,
      recipient_address: r.recipient_address,
      role: r.role || 'General Manager',
      is_active: r.is_active,
      consent_status: r.consent_status,
      created_by: r.created_by,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined
    }));

    return {
      enabled: s.enabled,
      execution_time: s.execution_time,
      timezone: s.timezone,
      email_enabled: s.email_enabled,
      whatsapp_enabled: s.whatsapp_enabled,
      recipients
    };
  } catch (err: any) {
    console.warn('[SUPABASE LOAD NIGHT AUDIT CONFIG WARN]', err.message);
    return null;
  } finally {
    client.release();
  }
}

export async function deleteNightAuditRecipientFromSupabase(recipientId: string): Promise<void> {
  const db = getSupabasePgPool();
  if (!db) return;
  const client = await db.connect();
  try {
    await client.query(`DELETE FROM night_audit_recipients WHERE id = $1;`, [recipientId]);
  } catch (err: any) {
    console.warn('[SUPABASE DELETE NIGHT AUDIT RECIPIENT WARN]', err.message);
  } finally {
    client.release();
  }
}

export interface DailyAuditRunRecord {
  id: string;
  business_date: string;
  run_type: 'scheduled' | 'manual' | 'test';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'exception';
  triggered_by: string;
  summary_json?: any;
  pdf_path?: string;
  pdf_filename?: string;
  error_log?: string;
  reconciled?: boolean;
  discrepancy_amount?: number;
  started_at?: string;
  completed_at?: string;
}

export interface AuditDispatchLogRecord {
  id?: string;
  audit_run_id: string;
  recipient_id?: string;
  recipient_name: string;
  channel: 'email' | 'whatsapp';
  destination: string;
  status: 'delivered' | 'sent' | 'failed' | 'disabled' | 'configuration_required' | 'pending';
  provider?: string;
  provider_message_id?: string;
  error_message?: string;
  retry_count?: number;
  sent_at?: string;
  delivered_at?: string;
}

export interface AuditReportSnapshotRecord {
  id?: string;
  audit_run_id: string;
  business_date: string;
  snapshot_json: any;
  cutoff_timestamp?: string;
  created_at?: string;
}

export interface AuditReportFileRecord {
  id?: string;
  audit_run_id: string;
  filename: string;
  file_path: string;
  file_size_bytes?: number;
  mime_type?: string;
  sha256_checksum?: string;
  created_at?: string;
}

export interface AuditExceptionRecord {
  id?: string;
  audit_run_id?: string;
  severity: 'critical' | 'warning' | 'info';
  exception_type: string;
  message: string;
  resolved?: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at?: string;
}

export interface AuditExecutionLogRecord {
  id?: string;
  audit_run_id: string;
  event_type: string;
  event_details: string;
  created_at?: string;
}

export async function recordDailyAuditRunToSupabase(run: DailyAuditRunRecord): Promise<void> {
  const db = getSupabasePgPool();
  if (!db) return;
  const client = await db.connect();
  try {
    await client.query(`
      INSERT INTO daily_audit_runs (
        id, business_date, run_type, status, triggered_by, summary_json, 
        pdf_path, pdf_filename, error_log, reconciled, discrepancy_amount, 
        started_at, completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, NOW()), $13)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        summary_json = EXCLUDED.summary_json,
        pdf_path = EXCLUDED.pdf_path,
        pdf_filename = EXCLUDED.pdf_filename,
        error_log = EXCLUDED.error_log,
        reconciled = EXCLUDED.reconciled,
        discrepancy_amount = EXCLUDED.discrepancy_amount,
        completed_at = EXCLUDED.completed_at;
    `, [
      run.id,
      run.business_date,
      run.run_type || 'scheduled',
      run.status || 'in_progress',
      run.triggered_by || 'system',
      run.summary_json ? JSON.stringify(run.summary_json) : null,
      run.pdf_path || null,
      run.pdf_filename || null,
      run.error_log || null,
      run.reconciled !== false,
      Number(run.discrepancy_amount || 0),
      run.started_at ? new Date(run.started_at) : new Date(),
      run.completed_at ? new Date(run.completed_at) : null
    ]);

    // Also update night_audit_settings last_run_at and last_status
    await client.query(`
      UPDATE night_audit_settings
      SET last_run_at = NOW(),
          last_status = $1,
          updated_at = NOW()
      WHERE id = 'stg-audit-settings';
    `, [run.status === 'completed' ? 'operational' : (run.status === 'failed' ? 'failed' : 'in_progress')]);
  } catch (err: any) {
    console.warn('[SUPABASE RECORD DAILY AUDIT RUN WARN]', err.message);
  } finally {
    client.release();
  }
}

export async function updateDailyAuditRunInSupabase(
  runId: string,
  updates: Partial<DailyAuditRunRecord>
): Promise<void> {
  const db = getSupabasePgPool();
  if (!db) return;
  const client = await db.connect();
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.summary_json !== undefined) {
      fields.push(`summary_json = $${idx++}`);
      values.push(JSON.stringify(updates.summary_json));
    }
    if (updates.pdf_path !== undefined) {
      fields.push(`pdf_path = $${idx++}`);
      values.push(updates.pdf_path);
    }
    if (updates.pdf_filename !== undefined) {
      fields.push(`pdf_filename = $${idx++}`);
      values.push(updates.pdf_filename);
    }
    if (updates.error_log !== undefined) {
      fields.push(`error_log = $${idx++}`);
      values.push(updates.error_log);
    }
    if (updates.reconciled !== undefined) {
      fields.push(`reconciled = $${idx++}`);
      values.push(updates.reconciled);
    }
    if (updates.discrepancy_amount !== undefined) {
      fields.push(`discrepancy_amount = $${idx++}`);
      values.push(Number(updates.discrepancy_amount));
    }
    if (updates.completed_at !== undefined) {
      fields.push(`completed_at = $${idx++}`);
      values.push(updates.completed_at ? new Date(updates.completed_at) : new Date());
    }

    if (fields.length > 0) {
      values.push(runId);
      await client.query(`UPDATE daily_audit_runs SET ${fields.join(', ')} WHERE id = $${idx};`, values);
    }
  } catch (err: any) {
    console.warn('[SUPABASE UPDATE DAILY AUDIT RUN WARN]', err.message);
  } finally {
    client.release();
  }
}

export async function recordAuditReportSnapshotToSupabase(snapshot: AuditReportSnapshotRecord): Promise<void> {
  const db = getSupabasePgPool();
  if (!db) return;
  const client = await db.connect();
  try {
    const id = snapshot.id || `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await client.query(`
      INSERT INTO audit_report_snapshots (id, audit_run_id, business_date, snapshot_json, cutoff_timestamp, created_at)
      VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), NOW())
      ON CONFLICT (id) DO UPDATE SET
        snapshot_json = EXCLUDED.snapshot_json;
    `, [
      id,
      snapshot.audit_run_id,
      snapshot.business_date,
      JSON.stringify(snapshot.snapshot_json),
      snapshot.cutoff_timestamp ? new Date(snapshot.cutoff_timestamp) : null
    ]);
  } catch (err: any) {
    console.warn('[SUPABASE RECORD AUDIT SNAPSHOT WARN]', err.message);
  } finally {
    client.release();
  }
}

export async function recordAuditReportFileToSupabase(file: AuditReportFileRecord): Promise<void> {
  const db = getSupabasePgPool();
  if (!db) return;
  const client = await db.connect();
  try {
    const id = file.id || `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await client.query(`
      INSERT INTO audit_report_files (id, audit_run_id, filename, file_path, file_size_bytes, mime_type, sha256_checksum, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (id) DO UPDATE SET
        file_path = EXCLUDED.file_path,
        file_size_bytes = EXCLUDED.file_size_bytes,
        sha256_checksum = EXCLUDED.sha256_checksum;
    `, [
      id,
      file.audit_run_id,
      file.filename,
      file.file_path,
      file.file_size_bytes || 0,
      file.mime_type || 'application/pdf',
      file.sha256_checksum || null
    ]);
  } catch (err: any) {
    console.warn('[SUPABASE RECORD AUDIT FILE WARN]', err.message);
  } finally {
    client.release();
  }
}

export async function recordAuditDispatchLogToSupabase(log: AuditDispatchLogRecord): Promise<string | null> {
  const db = getSupabasePgPool();
  if (!db) return null;
  const client = await db.connect();
  try {
    const id = log.id || `disp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await client.query(`
      INSERT INTO audit_dispatch_logs (
        id, audit_run_id, recipient_id, recipient_name, channel, destination, 
        status, provider, provider_message_id, error_message, retry_count, sent_at, delivered_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, NOW()), $13)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        provider = EXCLUDED.provider,
        provider_message_id = EXCLUDED.provider_message_id,
        error_message = EXCLUDED.error_message,
        retry_count = EXCLUDED.retry_count,
        delivered_at = EXCLUDED.delivered_at;
    `, [
      id,
      log.audit_run_id,
      log.recipient_id || null,
      log.recipient_name || 'Recipient',
      log.channel,
      log.destination,
      log.status,
      log.provider || null,
      log.provider_message_id || null,
      log.error_message || null,
      log.retry_count || 0,
      log.sent_at ? new Date(log.sent_at) : new Date(),
      log.delivered_at ? new Date(log.delivered_at) : (log.status === 'delivered' ? new Date() : null)
    ]);

    // Record delivery event
    const eventType = log.status === 'delivered' ? 'delivered' : (log.status === 'failed' ? 'failed' : 'dispatched');
    await client.query(`
      INSERT INTO audit_delivery_events (id, dispatch_log_id, event_type, event_payload, created_at)
      VALUES ($1, $2, $3, $4, NOW());
    `, [
      `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      id,
      eventType,
      JSON.stringify({
        channel: log.channel,
        destination: log.destination,
        provider: log.provider,
        provider_message_id: log.provider_message_id,
        error_message: log.error_message
      })
    ]);

    return id;
  } catch (err: any) {
    console.warn('[SUPABASE RECORD AUDIT DISPATCH LOG WARN]', err.message);
    return null;
  } finally {
    client.release();
  }
}

export async function recordAuditDeliveryEventToSupabase(dispatchLogId: string, eventType: string, eventPayload?: any): Promise<void> {
  const db = getSupabasePgPool();
  if (!db) return;
  const client = await db.connect();
  try {
    await client.query(`
      INSERT INTO audit_delivery_events (id, dispatch_log_id, event_type, event_payload, created_at)
      VALUES ($1, $2, $3, $4, NOW());
    `, [
      `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dispatchLogId,
      eventType,
      JSON.stringify(eventPayload || {})
    ]);
  } catch (err: any) {
    console.warn('[SUPABASE RECORD AUDIT DELIVERY EVENT WARN]', err.message);
  } finally {
    client.release();
  }
}

export async function recordAuditExceptionToSupabase(exception: AuditExceptionRecord): Promise<void> {
  const db = getSupabasePgPool();
  if (!db) return;
  const client = await db.connect();
  try {
    const id = exception.id || `exc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await client.query(`
      INSERT INTO audit_exceptions (id, audit_run_id, severity, exception_type, message, resolved, resolved_by, resolved_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO UPDATE SET
        resolved = EXCLUDED.resolved,
        resolved_by = EXCLUDED.resolved_by,
        resolved_at = EXCLUDED.resolved_at;
    `, [
      id,
      exception.audit_run_id || null,
      exception.severity || 'warning',
      exception.exception_type,
      exception.message,
      exception.resolved === true,
      exception.resolved_by || null,
      exception.resolved_at ? new Date(exception.resolved_at) : null
    ]);
  } catch (err: any) {
    console.warn('[SUPABASE RECORD AUDIT EXCEPTION WARN]', err.message);
  } finally {
    client.release();
  }
}

export async function recordAuditExecutionLogToSupabase(log: AuditExecutionLogRecord): Promise<void> {
  const db = getSupabasePgPool();
  if (!db) return;
  const client = await db.connect();
  try {
    const id = log.id || `exe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await client.query(`
      INSERT INTO audit_execution_logs (id, audit_run_id, event_type, event_details, created_at)
      VALUES ($1, $2, $3, $4, NOW());
    `, [
      id,
      log.audit_run_id,
      log.event_type,
      log.event_details
    ]);
  } catch (err: any) {
    console.warn('[SUPABASE RECORD AUDIT EXECUTION LOG WARN]', err.message);
  } finally {
    client.release();
  }
}

export async function retryFailedAuditDispatchInSupabase(dispatchLogId: string): Promise<AuditDispatchLogRecord | null> {
  const db = getSupabasePgPool();
  if (!db) return null;
  const client = await db.connect();
  try {
    const checkRes = await client.query(`
      SELECT * FROM audit_dispatch_logs WHERE id = $1;
    `, [dispatchLogId]);

    if (checkRes.rows.length === 0) return null;
    const current = checkRes.rows[0];

    const updatedRes = await client.query(`
      UPDATE audit_dispatch_logs
      SET status = 'pending',
          retry_count = retry_count + 1,
          sent_at = NOW()
      WHERE id = $1
      RETURNING *;
    `, [dispatchLogId]);

    await client.query(`
      INSERT INTO audit_delivery_events (id, dispatch_log_id, event_type, event_payload, created_at)
      VALUES ($1, $2, 'retried', $3, NOW());
    `, [
      `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dispatchLogId,
      JSON.stringify({ previous_error: current.error_message, retry_count: current.retry_count + 1 })
    ]);

    const r = updatedRes.rows[0];
    return {
      id: r.id,
      audit_run_id: r.audit_run_id,
      recipient_id: r.recipient_id,
      recipient_name: r.recipient_name,
      channel: r.channel,
      destination: r.destination,
      status: r.status,
      provider: r.provider,
      provider_message_id: r.provider_message_id,
      error_message: r.error_message,
      retry_count: r.retry_count,
      sent_at: r.sent_at ? new Date(r.sent_at).toISOString() : undefined,
      delivered_at: r.delivered_at ? new Date(r.delivered_at).toISOString() : undefined
    };
  } catch (err: any) {
    console.warn('[SUPABASE RETRY FAILED DISPATCH WARN]', err.message);
    return null;
  } finally {
    client.release();
  }
}

export async function loadDailyAuditRunsFromSupabase(limit = 20): Promise<Array<DailyAuditRunRecord & { deliveries?: AuditDispatchLogRecord[]; files?: AuditReportFileRecord[]; snapshot?: any }>> {
  const db = getSupabasePgPool();
  if (!db) return [];
  const client = await db.connect();
  try {
    const runsRes = await client.query(`
      SELECT *, business_date::text as business_date_str FROM daily_audit_runs
      ORDER BY started_at DESC
      LIMIT $1;
    `, [limit]);

    if (runsRes.rows.length === 0) return [];

    const runIds = runsRes.rows.map((r: any) => r.id);
    const logsRes = await client.query(`
      SELECT * FROM audit_dispatch_logs
      WHERE audit_run_id = ANY($1)
      ORDER BY sent_at ASC;
    `, [runIds]);

    const filesRes = await client.query(`
      SELECT * FROM audit_report_files
      WHERE audit_run_id = ANY($1)
      ORDER BY created_at ASC;
    `, [runIds]);

    const logsByRunId: Record<string, AuditDispatchLogRecord[]> = {};
    for (const l of logsRes.rows) {
      if (!logsByRunId[l.audit_run_id]) logsByRunId[l.audit_run_id] = [];
      logsByRunId[l.audit_run_id].push({
        id: l.id,
        audit_run_id: l.audit_run_id,
        recipient_id: l.recipient_id,
        recipient_name: l.recipient_name,
        channel: l.channel,
        destination: l.destination,
        status: l.status,
        provider: l.provider,
        provider_message_id: l.provider_message_id,
        error_message: l.error_message,
        retry_count: l.retry_count,
        sent_at: l.sent_at ? new Date(l.sent_at).toISOString() : undefined,
        delivered_at: l.delivered_at ? new Date(l.delivered_at).toISOString() : undefined
      });
    }

    const filesByRunId: Record<string, AuditReportFileRecord[]> = {};
    for (const f of filesRes.rows) {
      if (!filesByRunId[f.audit_run_id]) filesByRunId[f.audit_run_id] = [];
      filesByRunId[f.audit_run_id].push({
        id: f.id,
        audit_run_id: f.audit_run_id,
        filename: f.filename,
        file_path: f.file_path,
        file_size_bytes: f.file_size_bytes,
        mime_type: f.mime_type,
        sha256_checksum: f.sha256_checksum,
        created_at: f.created_at ? new Date(f.created_at).toISOString() : undefined
      });
    }

    return runsRes.rows.map((r: any) => ({
      id: r.id,
      business_date: r.business_date_str || (r.business_date instanceof Date ? r.business_date.toLocaleDateString('en-CA') : String(r.business_date || '').split('T')[0]),
      run_type: r.run_type,
      status: r.status,
      triggered_by: r.triggered_by,
      summary_json: r.summary_json,
      pdf_path: r.pdf_path,
      pdf_filename: r.pdf_filename,
      error_log: r.error_log,
      reconciled: r.reconciled,
      discrepancy_amount: Number(r.discrepancy_amount || 0),
      started_at: r.started_at ? new Date(r.started_at).toISOString() : undefined,
      completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : undefined,
      deliveries: logsByRunId[r.id] || [],
      files: filesByRunId[r.id] || []
    }));
  } catch (err: any) {
    console.warn('[SUPABASE LOAD DAILY AUDIT RUNS WARN]', err.message);
    return [];
  } finally {
    client.release();
  }
}


