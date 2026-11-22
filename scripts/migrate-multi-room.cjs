const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('[MIGRATION] Starting multi-room database schema enhancement...');

    // 1. Alter booking_rooms table
    await client.query(`
      ALTER TABLE booking_rooms 
      ADD COLUMN IF NOT EXISTS room_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'confirmed',
      ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS assigned_guest_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS keycard_uid VARCHAR(100);
    `);
    console.log('[MIGRATION] booking_rooms columns verified/added.');

    // 2. Alter bookings table
    await client.query(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS assigned_room_numbers TEXT[];
    `);
    console.log('[MIGRATION] bookings.assigned_room_numbers column verified/added.');

    // 3. Backfill booking_rooms.room_number
    await client.query(`
      UPDATE booking_rooms br
      SET room_number = r.room_number
      FROM rooms r
      WHERE br.assigned_room_id = r.id
        AND (br.room_number IS NULL OR br.room_number = '');
    `);
    console.log('[MIGRATION] Backfilled booking_rooms.room_number from rooms.');

    // 4. Backfill bookings.assigned_room_numbers from assigned_room_number or booking_rooms
    await client.query(`
      UPDATE bookings b
      SET assigned_room_numbers = ARRAY[b.assigned_room_number]
      WHERE (b.assigned_room_numbers IS NULL OR array_length(b.assigned_room_numbers, 1) = 0)
        AND b.assigned_room_number IS NOT NULL
        AND b.assigned_room_number != '';
    `);
    console.log('[MIGRATION] Backfilled bookings.assigned_room_numbers.');

    // 5. Update bookings status check constraint to include partially_checked_in and partially_checked_out
    await client.query(`
      ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
      ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
        CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'partially_checked_in', 'partially_checked_out'));
    `);
    console.log('[MIGRATION] bookings_status_check constraint updated.');

    // 6. Update exclusion constraint for overlapping stays
    await client.query(`
      ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_assigned_room_stays;
      ALTER TABLE bookings ADD CONSTRAINT no_overlapping_assigned_room_stays
        EXCLUDE USING gist (
          assigned_room_number WITH =, 
          daterange(check_in_date, check_out_date, '[)') WITH &&
        ) 
        WHERE (assigned_room_number IS NOT NULL AND status IN ('confirmed', 'checked_in', 'partially_checked_in', 'partially_checked_out'));
    `);
    console.log('[MIGRATION] no_overlapping_assigned_room_stays constraint updated.');

    // 7. Create helpful indexes if not exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking_id ON booking_rooms(booking_id);
      CREATE INDEX IF NOT EXISTS idx_booking_rooms_room_number ON booking_rooms(room_number);
      CREATE INDEX IF NOT EXISTS idx_booking_rooms_status ON booking_rooms(status);
    `);
    console.log('[MIGRATION] Indexes created/verified.');

    // 8. Verify table columns
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'booking_rooms' 
      ORDER BY ordinal_position;
    `);
    console.log('[MIGRATION] Current booking_rooms columns:');
    console.table(res.rows);

    console.log('[MIGRATION] Multi-room migration completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error('[MIGRATION ERROR]', err);
  process.exit(1);
});
