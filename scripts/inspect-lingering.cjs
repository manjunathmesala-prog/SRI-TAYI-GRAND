const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const b = await client.query('SELECT * FROM bookings');
  console.log('Bookings:', b.rows);
  const p = await client.query('SELECT * FROM payments');
  console.log('Payments:', p.rows);
  const inv = await client.query('SELECT * FROM invoices');
  console.log('Invoices:', inv.rows);
  const g = await client.query('SELECT * FROM guests');
  console.log('Guests:', g.rows);
  const ev = await client.query('SELECT * FROM rfid_access_events');
  console.log('RFID Events:', ev.rows);
  await client.end();
}

run().catch(console.error);
