const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function inspectSchema() {
  const client = await pool.connect();
  try {
    for (const table of ['booking_rooms', 'rooms', 'payments']) {
      const res = await client.query(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );
      console.log(`=== TABLE: ${table} ===`);
      console.table(res.rows);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

inspectSchema().catch(console.error);
