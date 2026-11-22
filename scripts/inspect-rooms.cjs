const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' 
      ORDER BY ordinal_position;
    `);
    console.log('ROOMS COLUMNS:');
    console.table(cols.rows);

    const rooms = await client.query(`
      SELECT * FROM rooms ORDER BY room_number;
    `);
    console.log('ROOMS DATA:');
    console.table(rooms.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
