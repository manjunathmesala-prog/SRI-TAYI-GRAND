const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const pool = new Pool({
  connectionString: env.DATABASE_URL || env.SUPABASE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const tablesToPurge = [
  'booking_status_history',
  'booking_rooms',
  'booking_guests',
  'booking_holds',
  'refunds',
  'invoices',
  'folio_charges',
  'additional_charges',
  'hall_payments',
  'hall_bookings',
  'hall_enquiries',
  'convention_quotes',
  'payments',
  'bookings',
  'room_transfers',
  'room_maintenance',
  'room_cleaning_sessions',
  'room_housekeeping',
  'reception_kiosk_tokens',
  'guests',
  'cash_transactions',
  'cash_shifts',
  'expenses',
  'daily_closings',
  'journal_lines',
  'journal_entries',
  'staff_assignments',
  'staff_attendance',
  'contact_enquiries',
  'audit_logs',
  'super_admin_notifications',
  'notifications',
  'rfid_access_events',
  'rfid_tap_history',
  'rfid_cards'
];

async function purge() {
  console.log('--- PURGING ALL TRANSACTIONAL & TEST DATA IN SUPABASE ---');
  for (const table of tablesToPurge) {
    try {
      const res = await pool.query(`DELETE FROM public."${table}";`);
      console.log(`✅ Cleared public."${table}" (${res.rowCount} row(s) deleted)`);
    } catch (err) {
      console.warn(`⚠️ Table public."${table}": ${err.message}`);
    }
  }

  // Reset rooms operational and housekeeping status
  try {
    const res = await pool.query(`
      UPDATE public.rooms 
      SET operational_status = 'available', housekeeping_status = 'clean';
    `);
    console.log(`✅ Reset public.rooms to available/clean (${res.rowCount} rooms updated)`);
  } catch (err) {
    console.warn(`⚠️ Failed to reset rooms: ${err.message}`);
  }

  // Also clean all local data/*.json files
  console.log('--- RESETTING LOCAL data/*.json FILES TO EMPTY ARRAYS ---');
  const dataDir = './data';
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.writeFileSync(`${dataDir}/${file}`, '[]\n', 'utf-8');
        console.log(`✅ Reset ${file} to []`);
      }
    }
  }

  console.log('--- ALL TEST DATA PURGED AND CLEARED TO 0 ---');
  await pool.end();
}

purge();
