import { Booking } from '@/types';

let poolInstance: any = null;

function getDbPool(): any {
  if (typeof window !== 'undefined') return null;
  if (poolInstance) return poolInstance;

  try {
    // Dynamic require so Webpack does not bundle pg into browser bundles
    const req = typeof eval !== 'undefined' ? eval('require') : null;
    if (!req) return null;
    const { Pool } = req('pg');

    const connectionString =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DATABASE_URL ||
      'postgresql://postgres:Vaynex%402026@db.wercvaimozbbkbwmuoct.supabase.co:5432/postgres';

    poolInstance = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
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

/**
 * Asynchronously persists any booking (online or walk-in) to Supabase PostgreSQL.
 * Non-blocking: will never crash or halt local operations if internet drops.
 */
export async function syncBookingToSupabase(booking: Booking): Promise<void> {
  if (typeof window !== 'undefined') return;

  const db = getDbPool();
  if (!db) return;

  try {
    const client = await db.connect();
    try {
      // 1. Upsert Guest record by phone or email
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
             SET total_stays = total_stays + 1,
                 id_type = COALESCE($1, id_type),
                 id_number = COALESCE($2, id_number),
                 updated_at = NOW()
             WHERE id = $3;`,
            [booking.id_proof_type || null, booking.id_proof_number || null, guestId]
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

      // 2. Normalize and clamp dates
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
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, COALESCE($24, NOW()), NOW()
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

/**
 * Loads all persistent bookings from Supabase PostgreSQL.
 * Used on server initialization to hydrate past bookings.
 */
export async function loadBookingsFromSupabase(): Promise<Booking[]> {
  if (typeof window !== 'undefined') return [];

  const db = getDbPool();
  if (!db) return [];

  try {
    const client = await db.connect();
    try {
      const res = await client.query(`
        SELECT 
          b.id::text as id,
          b.booking_reference,
          b.guest_id::text as guest_id,
          g.full_name as guest_name,
          g.phone as guest_phone,
          g.email as guest_email,
          b.check_in_date::text as check_in_date,
          b.check_out_date::text as check_out_date,
          b.adults_count,
          b.children_count,
          b.rooms_count,
          b.status,
          b.payment_status,
          b.payment_method,
          b.subtotal_amount::float as subtotal_amount,
          b.tax_amount::float as tax_amount,
          b.total_amount::float as total_amount,
          b.paid_amount::float as paid_amount,
          b.booking_source,
          b.walk_in_token,
          b.pickup_code,
          b.room_assigned_by,
          b.id_proof_type,
          b.id_proof_number,
          b.special_requests,
          b.checked_in_at,
          b.checked_out_at,
          b.created_at
        FROM bookings b
        LEFT JOIN guests g ON b.guest_id = g.id
        ORDER BY b.created_at DESC;
      `);

      return res.rows.map((row: any) => ({
        id: `bk-pg-${row.id}`,
        booking_reference: row.booking_reference,
        guest_id: row.guest_id || 'gst-remote',
        guest_name: row.guest_name || 'Valued Guest',
        guest_phone: row.guest_phone || '',
        guest_email: row.guest_email || '',
        check_in_date: row.check_in_date,
        check_out_date: row.check_out_date,
        category_id: 'cat-double-03',
        category_name: 'Deluxe Room',
        adults_count: row.adults_count || 1,
        children_count: row.children_count || 0,
        rooms_count: row.rooms_count || 1,
        status: row.status,
        payment_status: row.payment_status,
        payment_method: row.payment_method,
        subtotal_amount: row.subtotal_amount,
        room_charges_amount: row.subtotal_amount,
        tax_amount: row.tax_amount,
        additional_charges_amount: 0,
        total_amount: row.total_amount,
        paid_amount: row.paid_amount,
        booking_source: row.booking_source || 'online',
        walk_in_token: row.walk_in_token,
        pickup_code: row.pickup_code,
        room_assigned_by: row.room_assigned_by,
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
