const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function check() {
  const tables = [
    'hotel_settings',
    'room_categories',
    'rooms',
    'guests',
    'bookings',
    'payments',
    'expenses',
    'room_maintenance',
    'hall_enquiries',
    'convention_quotes',
    'contact_enquiries',
    'cash_shifts',
    'cash_transactions',
    'staff_attendance',
    'chart_of_accounts',
    'journal_entries',
    'daily_closings',
    'folio_charges',
    'audit_logs',
    'dynamic_pricing_rules',
    'channel_connections',
    'reviews',
    'cms_content'
  ];
  console.log('--- SUPABASE LIVE ROW COUNTS ---');
  for (const t of tables) {
    try {
      const res = await pool.query('SELECT count(*) FROM ' + t);
      console.log(t.padEnd(25) + ': ' + res.rows[0].count);
    } catch (e) {
      console.log(t.padEnd(25) + ': ERROR (' + e.message + ')');
    }
  }
  await pool.end();
}
check();
