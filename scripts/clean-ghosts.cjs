const { Client } = require('pg');

const connectionString = 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function cleanGhosts() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const ghostBookings = await client.query(`
      SELECT 
        b.id,
        b.booking_reference,
        b.rooms_count,
        b.assigned_room_number,
        COUNT(br.id) as alloc_count
      FROM bookings b
      JOIN booking_rooms br ON br.booking_id = b.id
      GROUP BY b.id, b.booking_reference, b.rooms_count, b.assigned_room_number
      HAVING COUNT(br.id) > b.rooms_count;
    `);

    console.log('Found ghost bookings:', ghostBookings.rows);

    for (const b of ghostBookings.rows) {
      const rows = await client.query(`
        SELECT id, room_number, assigned_room_id, status, created_at
        FROM booking_rooms
        WHERE booking_id = $1
        ORDER BY (room_number IS NOT NULL AND room_number != '') DESC, created_at ASC;
      `, [b.id]);

      // Keep the top b.rooms_count rows
      const keep = rows.rows.slice(0, b.rooms_count);
      const keepIds = keep.map(r => r.id);
      console.log(`Booking ${b.booking_reference}: keeping IDs ${keepIds.join(', ')}`);

      const delRes = await client.query(`
        DELETE FROM booking_rooms
        WHERE booking_id = $1 AND NOT (id = ANY($2::uuid[]))
        RETURNING id;
      `, [b.id, keepIds]);
      console.log(`Deleted ${delRes.rows.length} ghost rows.`);

      // Ensure the kept row has the correct room_number
      if (b.assigned_room_number && (!keep[0].room_number || keep[0].room_number === '')) {
        await client.query(`
          UPDATE booking_rooms
          SET room_number = $1
          WHERE id = $2;
        `, [b.assigned_room_number, keep[0].id]);
        console.log(`Updated allocation ${keep[0].id} with room_number ${b.assigned_room_number}`);
      }
    }

    console.log('✅ Cleaned all ghost allocations successfully!');
  } finally {
    await client.end();
  }
}

cleanGhosts();
