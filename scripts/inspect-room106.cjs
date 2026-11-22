const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT * FROM rooms WHERE room_number = '106';");
    console.log('Room 106:', r.rows);

    const b = await client.query("SELECT * FROM bookings WHERE booking_reference = 'STG-20261122-4216';");
    console.log('Booking STG-20261122-4216:', b.rows);

    const br = await client.query("SELECT * FROM booking_rooms WHERE booking_id = $1;", [b.rows[0].id]);
    console.log('Booking Rooms:', br.rows);

    const p = await client.query("SELECT * FROM payments WHERE booking_reference = 'STG-20261122-4216' OR booking_id = $1;", [b.rows[0].id]);
    console.log('Payments:', p.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
