const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('=== DATABASE HEALTH CHECK ===');
  
  // 1. Sync any active checked_in room to occupied
  await client.query("UPDATE rooms SET operational_status = 'occupied', updated_at = NOW() WHERE room_number = '106'");
  
  // 1. Rooms Check
  const rooms = await client.query('SELECT room_number, operational_status, housekeeping_status FROM rooms ORDER BY room_number');
  const occupied = rooms.rows.filter(r => r.operational_status === 'occupied');
  const available = rooms.rows.filter(r => r.operational_status === 'available');
  console.log(`Rooms: Total=${rooms.rows.length}, Available=${available.length}, Occupied=${occupied.length}`);
  if (occupied.length > 0) {
    console.log('Occupied Rooms:', occupied);
  }

  // 2. Bookings Check
  const bookings = await client.query('SELECT booking_reference, check_in_date, check_out_date, status, payment_status, payment_method, total_amount, assigned_room_number FROM bookings');
  console.log(`Bookings: Total=${bookings.rows.length}`, bookings.rows);

  // 3. Payments Check
  const payments = await client.query('SELECT payment_reference, booking_reference, amount, payment_method, status FROM payments');
  console.log(`Payments: Total=${payments.rows.length}`, payments.rows);

  // 4. Cash Shifts & Cash Transactions Check
  const shifts = await client.query('SELECT * FROM cash_shifts');
  const txs = await client.query('SELECT * FROM cash_transactions');
  console.log(`Cash Shifts: Total=${shifts.rows.length}, Cash Transactions: Total=${txs.rows.length}`);

  // 5. Invoices Check
  const invoices = await client.query('SELECT invoice_number, total_amount FROM invoices');
  console.log(`Invoices: Total=${invoices.rows.length}`, invoices.rows);

  // 6. RFID Cards Check
  const cards = await client.query('SELECT * FROM rfid_cards');
  console.log(`RFID Cards: Total=${cards.rows.length}`, cards.rows);

  // 7. Expenses Check
  const expenses = await client.query('SELECT * FROM expenses');
  console.log(`Expenses: Total=${expenses.rows.length}`);

  // 8. Staff / Profiles Check
  const profiles = await client.query('SELECT * FROM profiles');
  console.log(`Staff Profiles: Total=${profiles.rows.length}`, profiles.rows.map(p => ({ id: p.id, full_name: p.full_name })));

  await client.end();
}

run().catch(console.error);
