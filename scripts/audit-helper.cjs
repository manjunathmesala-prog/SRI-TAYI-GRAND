const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  const tables = tablesRes.rows.map(r => r.table_name);
  
  const report = [];
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT count(*) FROM "${t}";`);
      report.push({ table: t, count: parseInt(res.rows[0].count, 10) });
    } catch (e) {
      report.push({ table: t, count: -1, error: e.message });
    }
  }
  
  console.log(JSON.stringify(report, null, 2));
  await client.end();
}

run().catch(console.error);
