const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT ordinal_position, column_name, data_type FROM information_schema.columns WHERE table_name = 'bookings' ORDER BY ordinal_position");
    console.table(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
