import {
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
} from '@/types';

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
  if (poolInstance) return poolInstance;

  try {
    const req = typeof eval !== 'undefined' ? eval('require') : null;
    if (!req) return null;
    const { Pool } = req('pg');

    const host = process.env.SUPABASE_DB_HOST || 'aws-0-ap-northeast-1.pooler.supabase.com';
    const port = Number(process.env.SUPABASE_DB_PORT) || 6543;
    const database = process.env.SUPABASE_DB_NAME || 'postgres';
    const user = process.env.SUPABASE_DB_USER || 'postgres.wercvaimozbbkbwmuoct';
    const password = process.env.SUPABASE_DB_PASSWORD || 'Vaynex@2026';

    const connectionString =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DATABASE_URL ||
      `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

    poolInstance = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
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
          category_id,
          category_name,
          keycard_uid,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, COALESCE($29, NOW()), NOW()
        )
        ON CONFLICT (booking_reference) DO UPDATE SET
          status = EXCLUDED.status,
          payment_status = EXCLUDED.payment_status,
          paid_amount = EXCLUDED.paid_amount,
          room_assigned_by = COALESCE(EXCLUDED.room_assigned_by, bookings.room_assigned_by),
          id_proof_type = COALESCE(EXCLUDED.id_proof_type, bookings.id_proof_type),
          id_proof_number = COALESCE(EXCLUDED.id_proof_number, bookings.id_proof_number),
          checked_in_at = COALESCE(EXCLUDED.checked_in_at, bookings.checked_in_at),
          checked_out_at = COALESCE(EXCLUDED.checked_out_at, bookings.checked_out_at),
          assigned_room_id = COALESCE(EXCLUDED.assigned_room_id, bookings.assigned_room_id),
          assigned_room_number = COALESCE(EXCLUDED.assigned_room_number, bookings.assigned_room_number),
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
          booking.status || 'confirmed',
          booking.payment_status || 'pending',
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

        const brCheck = await client.query(
          `SELECT id FROM booking_rooms WHERE booking_id = $1 LIMIT 1;`,
          [bookingUuid]
        );
        const pricePerNight = Number(booking.subtotal_amount || booking.total_amount || 1800);
        if (brCheck.rows.length === 0 && catUuid) {
          await client.query(
            `INSERT INTO booking_rooms (booking_id, category_id, assigned_room_id, price_per_night, created_at)
             VALUES ($1, $2, $3, $4, NOW());`,
            [bookingUuid, catUuid, roomUuid, pricePerNight]
          );
        } else if (brCheck.rows.length > 0) {
          await client.query(
            `UPDATE booking_rooms 
             SET assigned_room_id = COALESCE($1, assigned_room_id),
                 category_id = COALESCE($2, category_id),
                 price_per_night = COALESCE($3, price_per_night)
             WHERE id = $4;`,
            [roomUuid, catUuid, pricePerNight, brCheck.rows[0].id]
          );
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
  }
}

export async function loadBookingsFromSupabase(): Promise<Booking[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

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
          b.payment_status,
          COALESCE(b.payment_method, 'online') as payment_method,
          COALESCE(b.subtotal_amount, 0)::float as subtotal_amount,
          COALESCE(b.tax_amount, 0)::float as tax_amount,
          COALESCE(b.total_amount, 0)::float as total_amount,
          COALESCE(b.paid_amount, 0)::float as paid_amount,
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
          b.created_at
        FROM bookings b
        LEFT JOIN guests g ON b.guest_id = g.id
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
        assigned_room_number: row.assigned_room_number || undefined,
        adults_count: Number(row.adults_count) || 1,
        children_count: Number(row.children_count) || 0,
        rooms_count: Number(row.rooms_count) || 1,
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
    return [];
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
          b.payment_status,
          COALESCE(b.payment_method, 'cash') as payment_method,
          COALESCE(b.subtotal_amount, 0)::float as subtotal_amount,
          COALESCE(b.tax_amount, 0)::float as tax_amount,
          COALESCE(b.total_amount, 0)::float as total_amount,
          COALESCE(b.paid_amount, 0)::float as paid_amount,
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
        assigned_room_number: row.assigned_room_number || undefined,
        adults_count: Number(row.adults_count) || 1,
        children_count: Number(row.children_count) || 0,
        rooms_count: Number(row.rooms_count) || 1,
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
      await client.query(
        `INSERT INTO payments (
          payment_reference,
          booking_reference,
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
        )
        ON CONFLICT (payment_reference) DO UPDATE SET
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          payment_method = EXCLUDED.payment_method,
          notes = EXCLUDED.notes,
          updated_at = NOW();`,
        [
          payment.payment_reference,
          payment.booking_reference,
          (payment as any).guest_name || null,
          Number(payment.amount || 0),
          payment.currency || 'INR',
          payment.payment_method || 'cash',
          payment.gateway_order_id || null,
          payment.gateway_payment_id || null,
          (payment as any).gateway_signature || null,
          payment.status || 'successful',
          (payment as any).notes || payment.payment_reference || null,
          payment.paid_at || new Date().toISOString(),
        ]
      );
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

export async function loadPaymentsFromSupabase(): Promise<PaymentRecord[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

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
    return [];
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
  room_number: string;
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
        SELECT room_number, operational_status, housekeeping_status, notes
        FROM rooms;
      `);
      return res.rows.map((r: any) => ({
        room_number: r.room_number,
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
          Number(settings.tax_percentage || 12),
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
        tax_percentage: row.tax_percentage,
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

export async function loadExpensesFromSupabase(): Promise<Expense[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

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
    return [];
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
          enquiry.status || 'new',
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
        status: row.status,
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
          quote.client_name,
          quote.client_phone,
          quote.client_email || null,
          quote.event_name,
          quote.event_date,
          quote.seating_layout,
          Number(quote.guest_count || 100),
          quote.catering_package,
          Number(quote.catering_rate_per_plate || 0),
          Number(quote.hall_rental_charge || 0),
          Number(quote.av_sound_lighting || 0),
          Number(quote.stage_decoration || 0),
          Number(quote.generator_diesel || 0),
          Number(quote.subtotal || 0),
          Number(quote.gst_rate || 0.18),
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
        gst_rate: Number(row.gst_rate) || 0.18,
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
            ticket.status,
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
            ticket.status,
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
          id, shift_number, cashier_id, cashier_name, opened_at, closed_at,
          opening_float, closing_cash_counted, expected_closing_cash, discrepancy, notes, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          closed_at = EXCLUDED.closed_at,
          closing_cash_counted = EXCLUDED.closing_cash_counted,
          expected_closing_cash = EXCLUDED.expected_closing_cash,
          discrepancy = EXCLUDED.discrepancy,
          notes = EXCLUDED.notes,
          status = EXCLUDED.status;`,
        [
          shift.id,
          shift.shift_number,
          shift.cashier_id,
          shift.cashier_name,
          shift.opened_at,
          shift.closed_at || null,
          Number(shift.opening_float || 0),
          shift.closing_cash_counted !== undefined ? Number(shift.closing_cash_counted) : null,
          shift.expected_closing_cash !== undefined ? Number(shift.expected_closing_cash) : null,
          Number(shift.discrepancy || 0),
          shift.notes || null,
          shift.status,
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

export async function loadCashShiftsFromSupabase(): Promise<CashShift[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          id, shift_number, cashier_id, cashier_name, opened_at, closed_at,
          opening_float::float as opening_float,
          closing_cash_counted::float as closing_cash_counted,
          expected_closing_cash::float as expected_closing_cash,
          discrepancy::float as discrepancy, notes, status
        FROM cash_shifts
        ORDER BY opened_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        shift_number: row.shift_number,
        cashier_id: row.cashier_id,
        cashier_name: row.cashier_name,
        opened_at: row.opened_at ? new Date(row.opened_at).toISOString() : new Date().toISOString(),
        closed_at: row.closed_at ? new Date(row.closed_at).toISOString() : undefined,
        opening_float: Number(row.opening_float) || 0,
        closing_cash_counted: row.closing_cash_counted !== null ? Number(row.closing_cash_counted) : undefined,
        expected_closing_cash: row.expected_closing_cash !== null ? Number(row.expected_closing_cash) : undefined,
        discrepancy: Number(row.discrepancy) || 0,
        notes: row.notes || undefined,
        status: row.status,
      }));
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.warn('[SUPABASE LOAD CASH SHIFTS WARN]', err instanceof Error ? err.message : String(err));
    return [];
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
          tx.reason,
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

export async function loadCashTransactionsFromSupabase(): Promise<CashTransaction[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

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
    return [];
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

export async function loadDailyClosingsFromSupabase(): Promise<DailyClosing[]> {
  if (typeof window !== 'undefined') return [];

  const db = getSupabasePgPool();
  if (!db) return [];

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
    return [];
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
    console.warn(`[SUPABASE ATTENDANCE SYNC WARN] (${attendance.id}):`, err instanceof Error ? err.message : String(err));
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
      await client.query(
        `INSERT INTO additional_charges (
          charge_id, booking_reference, charge_name, description, category,
          amount, tax_rate, tax_amount, total_amount, posted_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          charge.id,
          charge.booking_reference,
          charge.description,
          charge.description,
          charge.category,
          Number(charge.amount || 0),
          Number(charge.tax_rate || 0.12),
          Number(charge.tax_amount || 0),
          Number(charge.total_amount || 0),
          charge.posted_by,
          charge.created_at,
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
        tax_rate: Number(row.tax_rate) || 0.12,
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
          log_id, action, entity_name, entity_id, user_name, user_role, category, details, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
        [
          log.id,
          log.action,
          log.entityType || 'SYSTEM',
          log.entityId || null,
          log.userName || 'Admin',
          log.userRole || 'admin',
          log.entityType || 'SECURITY',
          log.details || null,
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
          COALESCE(log_id, id::text) as id,
          action,
          COALESCE(entity_name, 'SYSTEM') as entity_type,
          entity_id,
          COALESCE(user_name, 'Admin') as user_name,
          COALESCE(user_role, 'admin') as user_role,
          COALESCE(category, 'SECURITY') as category,
          details,
          ip_address,
          created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 500;
      `);

      return res.rows.map((row: any) => ({
        id: row.id,
        timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        userId: 'admin-user',
        userName: row.user_name,
        userRole: row.user_role,
        action: row.action,
        entityType: row.entity_type as any,
        entityId: row.entity_id || 'system',
        details: row.details || '',
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
        id: r.id,
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
        cover_image_url: r.cover_image_url || '/images/hotel/room-double-large.jpg',
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
             updated_at = NOW()
         WHERE id::text = $7 OR slug = $8;`,
        [
          category.name,
          category.short_description || null,
          category.base_price_per_night,
          category.bed_type || null,
          category.max_occupancy,
          category.is_active,
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
