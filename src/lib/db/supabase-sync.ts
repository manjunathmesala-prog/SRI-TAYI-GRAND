import { Booking, PaymentRecord, PhysicalRoom, HotelSettings, OperationalStatus, HousekeepingStatus } from '@/types';

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
    const port = Number(process.env.SUPABASE_DB_PORT) || 5432;
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
      max: 10,
      idleTimeoutMillis: 30000,
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
      await client.query(
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
          updated_at = NOW();`,
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
