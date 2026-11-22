const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function dryRun() {
  await client.connect();
  console.log('================================================================');
  console.log('SRI TAYI GRAND - DATABASE CLEANUP DRY-RUN INVENTORY');
  console.log('================================================================\n');

  const cleanupPlan = [
    { table: 'audit_delivery_events', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'audit_dispatch_logs', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'audit_exceptions', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'audit_execution_logs', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'audit_report_files', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'audit_report_snapshots', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'daily_audit_runs', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'invoices', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'payments', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'booking_status_history', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'booking_rooms', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'booking_guests', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'room_transfers', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'bookings', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'guests', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'cash_transactions', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'cash_shifts', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'daily_closings', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'expenses', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'staff_attendance', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'room_maintenance', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'convention_quotes', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'contact_enquiries', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'rfid_access_events', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'rfid_tap_history', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'super_admin_notifications', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'audit_logs', action: 'DELETE ALL', filter: 'ALL' },
    { table: 'rfid_cards', action: 'SELECTIVE PURGE', filter: "card_type = 'guest'" }
  ];

  let totalRecordsToDelete = 0;
  console.log('--- TABLES TARGETED FOR TEST DATA REMOVAL ---');
  for (const item of cleanupPlan) {
    let count = 0;
    if (item.filter === 'ALL') {
      const res = await client.query(`SELECT count(*) FROM "${item.table}";`);
      count = parseInt(res.rows[0].count, 10);
    } else {
      const res = await client.query(`SELECT count(*) FROM "${item.table}" WHERE ${item.filter};`);
      count = parseInt(res.rows[0].count, 10);
    }
    totalRecordsToDelete += count;
    console.log(`- ${item.table.padEnd(28)}: ${String(count).padStart(5)} rows to delete (${item.action})`);
  }
  console.log(`\nTOTAL TEST & ACTIVITY RECORDS TO PURGE: ${totalRecordsToDelete}`);

  console.log('\n--- MASTER DATA TABLES TO PRESERVE (UNCHANGED) ---');
  const preserveTables = [
    'hotel_settings',
    'room_categories',
    'rooms',
    'amenities',
    'room_amenities',
    'room_images',
    'cancellation_policies',
    'website_content',
    'integrations',
    'roles',
    'profiles',
    'convention_halls',
    'night_audit_settings',
    'night_audit_recipients',
    'audit_scheduler_settings',
    'audit_recipients',
    'reviews',
    'gallery_images',
    'rfid_devices'
  ];

  for (const t of preserveTables) {
    const res = await client.query(`SELECT count(*) FROM "${t}";`);
    console.log(`- ${t.padEnd(28)}: ${String(res.rows[0].count).padStart(5)} rows (PRESERVED)`);
  }

  // Check preserved cards count
  const preservedCards = await client.query("SELECT count(*) FROM rfid_cards WHERE card_type != 'guest';");
  console.log(`- rfid_cards (Super Admin/Staff): ${preservedCards.rows[0].count} rows (PRESERVED)`);

  await client.end();
}

dryRun().catch(console.error);
