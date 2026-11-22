const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const tablesRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('--- ALL PUBLIC TABLES ---');
    const tableNames = tablesRes.rows.map(r => r.table_name);
    console.log(tableNames.join(', '));

    const rfidTables = tableNames.filter(t => t.includes('rfid') || t.includes('card') || t.includes('integration'));
    console.log('\n--- RFID & INTEGRATION RELATED TABLES ---');
    console.log(rfidTables);

    for (const t of rfidTables) {
      console.log(`\n=== TABLE: ${t} ===`);
      const cols = await client.query(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [t]
      );
      console.table(cols.rows);

      const count = await client.query(`SELECT count(*) FROM "${t}"`);
      console.log(`Row count: ${count.rows[0].count}`);

      const rows = await client.query(`SELECT * FROM "${t}" ORDER BY 1 DESC LIMIT 5`);
      console.log('Sample rows:');
      console.log(JSON.stringify(rows.rows, null, 2));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
