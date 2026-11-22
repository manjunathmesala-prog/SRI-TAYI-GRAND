const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      ORDER BY ordinal_position;
    `);
    console.log('PAYMENTS COLUMNS:');
    console.table(cols.rows);

    const bCols = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      ORDER BY ordinal_position;
    `);
    console.log('BOOKINGS COLUMNS:');
    console.table(bCols.rows);

    const brCols = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'booking_rooms' 
      ORDER BY ordinal_position;
    `);
    console.log('BOOKING_ROOMS COLUMNS:');
    console.table(brCols.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
