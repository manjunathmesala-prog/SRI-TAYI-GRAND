const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function inspect() {
  await client.connect();
  const tables = ['cash_transactions', 'additional_charges', 'payments', 'stay_extensions', 'bookings'];
  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position;
    `, [t]);
    console.log(`\n=== TABLE: ${t} ===`);
    console.log(res.rows.map(r => r.column_name).join(', '));
  }
  await client.end();
}

inspect().catch(console.error);
