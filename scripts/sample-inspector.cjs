const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();

  console.log('--- SAMPLE BOOKINGS ---');
  const bookingsRes = await client.query('SELECT id, booking_reference, status, guest_id, check_in_date, check_out_date, created_at FROM bookings ORDER BY created_at DESC LIMIT 5;');
  console.table(bookingsRes.rows);

  console.log('--- SAMPLE PAYMENTS ---');
  const paymentsRes = await client.query('SELECT id, payment_reference, amount, payment_method, status, created_at FROM payments ORDER BY created_at DESC LIMIT 5;');
  console.table(paymentsRes.rows);

  console.log('--- PROFILES / USERS ---');
  const profilesRes = await client.query('SELECT id, role_id, full_name, phone, created_at FROM profiles;');
  console.table(profilesRes.rows);

  console.log('--- RFID CARDS SAMPLE ---');
  const cardsRes = await client.query('SELECT id, card_uid, card_label, card_type, assigned_room_number, is_active FROM rfid_cards LIMIT 10;');
  console.table(cardsRes.rows);

  console.log('--- HOTEL SETTINGS ---');
  const settingsRes = await client.query('SELECT hotel_name, phone, email, address FROM hotel_settings;');
  console.table(settingsRes.rows);

  console.log('--- ROOMS SUMMARY ---');
  const roomsRes = await client.query('SELECT count(*), operational_status FROM rooms GROUP BY operational_status;');
  console.table(roomsRes.rows);

  await client.end();
}

run().catch(console.error);
