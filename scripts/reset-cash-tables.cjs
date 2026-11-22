const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  await client.query('DELETE FROM cash_transactions');
  await client.query('DELETE FROM cash_shifts');
  fs.writeFileSync('data/cash_shifts.json', '[]\n', 'utf8');
  fs.writeFileSync('data/cash_transactions.json', '[]\n', 'utf8');
  console.log('Cash drawer tables reset cleanly to zero.');
  await client.end();
}

run().catch(console.error);
