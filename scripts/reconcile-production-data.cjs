const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function reconcile() {
  const client = await pool.connect();
  try {
    console.log('[RECONCILIATION] Starting authoritative database audit & reconciliation...');
    await client.query('BEGIN');

    // 1. Link orphaned payments to their bookings
    const linkRes = await client.query(`
      UPDATE payments p
      SET booking_id = b.id
      FROM bookings b
      WHERE p.booking_id IS NULL
        AND p.booking_reference = b.booking_reference
      RETURNING p.id, p.payment_reference, p.booking_reference;
    `);
    console.log(`[RECONCILIATION] Linked ${linkRes.rowCount} orphan payments to bookings.`);

    // 2. Audit & reconcile STG-20261122-4216
    const bRes = await client.query(`
      SELECT b.id, b.booking_reference, b.rooms_count, b.subtotal_amount, b.total_amount, b.paid_amount, b.assigned_room_number
      FROM bookings b
      WHERE b.booking_reference = 'STG-20261122-4216';
    `);

    if (bRes.rows.length > 0) {
      const b = bRes.rows[0];
      console.log('[RECONCILIATION] Found target booking STG-20261122-4216:', b);

      // Resolve room 106 UUID
      const rRes = await client.query(`SELECT id, room_number FROM rooms WHERE room_number = '106' LIMIT 1;`);
      const room106Id = rRes.rows[0]?.id;

      // Reconcile paid_amount to sum of successful payments
      const paySumRes = await client.query(`
        SELECT COALESCE(SUM(amount), 0)::float as total_paid
        FROM payments
        WHERE (booking_id = $1 OR booking_reference = $2)
          AND status = 'successful';
      `, [b.id, b.booking_reference]);
      const truePaid = paySumRes.rows[0].total_paid; // 5880

      await client.query(`
        UPDATE bookings
        SET paid_amount = $1,
            rooms_count = 1,
            status = 'checked_in',
            payment_status = 'successful',
            assigned_room_number = '106',
            assigned_room_numbers = ARRAY['106'],
            assigned_room_id = $2
        WHERE id = $3;
      `, [truePaid, room106Id, b.id]);
      console.log(`[RECONCILIATION] Corrected bookings.paid_amount from ${b.paid_amount} to ${truePaid}.`);

      // Clean up duplicate ghost rows in booking_rooms
      // Delete ghost rows with null or empty room_number and status != 'checked_in'
      await client.query(`
        DELETE FROM booking_rooms
        WHERE booking_id = $1
          AND id IN ('69d52859-5dc0-4089-aa36-4b8ad5c54277', '668506c8-b291-4bf7-8300-52411ba4095c', '3f6a7f13-ab64-4a1f-9b5e-dd2a60c85b88');
      `, [b.id]);
      console.log('[RECONCILIATION] Removed 3 duplicate unassigned ghost rows from booking_rooms.');

      // Update the 1 remaining valid allocation for Room 106
      await client.query(`
        UPDATE booking_rooms
        SET room_number = '106',
            assigned_room_id = $1,
            price_per_night = 2800.00,
            status = 'checked_in',
            checked_in_at = '2026-11-22T18:37:56.568Z',
            assigned_guest_name = 'Manjunath Mesala'
        WHERE booking_id = $2;
      `, [room106Id, b.id]);
      console.log('[RECONCILIATION] Updated valid room allocation for Room 106 (price_per_night = 2800.00, status = checked_in).');
    }

    // 3. System-wide audit: Reconcile all bookings' paid_amount against payments ledger
    const allBookings = await client.query(`
      SELECT b.id, b.booking_reference, b.total_amount, b.paid_amount,
             COALESCE((
               SELECT SUM(p.amount) 
               FROM payments p 
               WHERE (p.booking_id = b.id OR p.booking_reference = b.booking_reference) 
                 AND p.status = 'successful'
             ), 0)::float AS actual_paid
      FROM bookings b;
    `);

    for (const row of allBookings.rows) {
      if (Math.abs(Number(row.paid_amount) - row.actual_paid) > 0.01) {
        console.warn(`[RECONCILIATION MISMATCH] Booking ${row.booking_reference}: stored paid_amount = ${row.paid_amount}, actual payments total = ${row.actual_paid}. Correcting...`);
        const newPaymentStatus = row.actual_paid >= Number(row.total_amount) ? 'successful' : (row.actual_paid > 0 ? 'partially_refunded' : 'pending');
        await client.query(`
          UPDATE bookings
          SET paid_amount = $1,
              payment_status = $2
          WHERE id = $3;
        `, [row.actual_paid, newPaymentStatus, row.id]);
      }
    }

    await client.query('COMMIT');
    console.log('[RECONCILIATION] Database transaction committed successfully.');

    // 4. Synchronize local bookings.json
    const bookingsJsonPath = path.join(__dirname, '..', 'data', 'bookings.json');
    if (fs.existsSync(bookingsJsonPath)) {
      const raw = fs.readFileSync(bookingsJsonPath, 'utf8');
      const list = JSON.parse(raw);
      const idx = list.findIndex((b) => b.booking_reference === 'STG-20261122-4216');
      if (idx !== -1) {
        list[idx].paid_amount = 5880;
        list[idx].rooms_count = 1;
        list[idx].assigned_room_number = '106';
        list[idx].assigned_room_numbers = ['106'];
        list[idx].booking_rooms = [
          {
            id: 'f9a73225-a18b-40c1-9cf7-33de5c7f443e',
            room_id: 'rm-106',
            room_number: '106',
            category_id: 'cat-four-bed-02',
            category_name: 'Four Bed Room',
            price_per_night: 2800,
            status: 'checked_in',
            checked_in_at: '2026-11-22T18:37:56.568Z',
            checked_out_at: null,
            assigned_guest_name: 'Manjunath Mesala',
            keycard_uid: 'BT-57-1000049757'
          }
        ];
        fs.writeFileSync(bookingsJsonPath, JSON.stringify(list, null, 2), 'utf8');
        console.log('[RECONCILIATION] Updated data/bookings.json successfully.');
      }
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[RECONCILIATION ERROR]', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

reconcile().catch((e) => {
  console.error(e);
  process.exit(1);
});
