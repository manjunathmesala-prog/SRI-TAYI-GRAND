const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function executeCleanup() {
  console.log('================================================================');
  console.log('SRI TAYI GRAND - EXECUTING AUTHORIZED PRODUCTION DATABASE CLEANUP');
  console.log('Timestamp: ' + new Date().toISOString());
  console.log('================================================================\n');

  await client.connect();

  try {
    await client.query('BEGIN;');
    console.log('1. Transaction started (BEGIN)...\n');

    // 1. Audit logs & delivery events
    console.log('Purging test audit logs & report delivery events...');
    await client.query('DELETE FROM audit_delivery_events;');
    await client.query('DELETE FROM audit_dispatch_logs;');
    await client.query('DELETE FROM audit_exceptions;');
    await client.query('DELETE FROM audit_execution_logs;');
    await client.query('DELETE FROM audit_report_files;');
    await client.query('DELETE FROM audit_report_snapshots;');
    await client.query('DELETE FROM daily_audit_runs;');
    console.log('  ✅ Night audit test logs purged.');

    // 2. Financial & Booking dependent records
    console.log('Purging test invoices, payments, and booking rooms...');
    await client.query('DELETE FROM invoices;');
    await client.query('DELETE FROM payments;');
    await client.query('DELETE FROM booking_status_history;');
    await client.query('DELETE FROM booking_rooms;');
    await client.query('DELETE FROM booking_guests;');
    await client.query('DELETE FROM room_transfers;');
    console.log('  ✅ Dependent booking entities purged.');

    // 3. Bookings and Guests
    console.log('Purging test bookings and guests...');
    await client.query('DELETE FROM bookings;');
    await client.query('DELETE FROM guests;');
    console.log('  ✅ Bookings and guests purged.');

    // 4. Cash Shifts, Transactions, Expenses, Closings
    console.log('Purging cash shifts, transactions, expenses, daily closings...');
    await client.query('DELETE FROM cash_transactions;');
    await client.query('DELETE FROM cash_shifts;');
    await client.query('DELETE FROM daily_closings;');
    await client.query('DELETE FROM expenses;');
    console.log('  ✅ Cashbook, shifts, expenses, and daily closings purged.');

    // 5. Attendance & Maintenance
    console.log('Purging staff attendance test records and room maintenance tickets...');
    await client.query('DELETE FROM staff_attendance;');
    await client.query('DELETE FROM room_maintenance;');
    console.log('  ✅ Staff attendance & room maintenance purged.');

    // 6. Banquet Quotes & Enquiries
    console.log('Purging test convention quotes and contact enquiries...');
    await client.query('DELETE FROM convention_quotes;');
    await client.query('DELETE FROM contact_enquiries;');
    console.log('  ✅ Test convention quotes and contact enquiries purged.');

    // 7. RFID Events & Selective Card Purge
    console.log('Purging RFID test tap events and customer guest cards...');
    await client.query('DELETE FROM rfid_access_events;');
    await client.query('DELETE FROM rfid_tap_history;');
    const cardsPurge = await client.query("DELETE FROM rfid_cards WHERE card_type = 'guest' OR card_type IS NULL;");
    console.log(`  ✅ Purged ${cardsPurge.rowCount} test guest RFID cards. Master & Cleaner cards preserved.`);

    // 8. Super Admin notifications & Audit logs
    console.log('Purging test notifications and system audit logs...');
    await client.query('DELETE FROM super_admin_notifications;');
    await client.query('DELETE FROM audit_logs;');
    console.log('  ✅ Notifications and audit logs purged.');

    // 9. Reset all 25 physical rooms to 'available' & 'clean'
    console.log('Resetting all 25 physical rooms to available and clean...');
    await client.query(`
      UPDATE rooms 
      SET operational_status = 'available', 
          housekeeping_status = 'clean';
    `);
    console.log('  ✅ All 25 rooms reset to Available & Clean.');

    await client.query('COMMIT;');
    console.log('\n✅ TRANSACTION COMMITTED SUCCESSFULLY IN SUPABASE CLOUD!');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('\n❌ TRANSACTION ROLLED BACK DUE TO ERROR:', err);
    process.exit(1);
  } finally {
    await client.end();
  }

  // 10. Update local persistence files in data/
  console.log('\nSynchronizing local persistence files in data/ directory...');
  const emptyTables = [
    'bookings.json',
    'guests.json',
    'payments.json',
    'expenses.json',
    'cash_shifts.json',
    'cash_transactions.json',
    'daily_closings.json',
    'maintenance.json',
    'staff_attendance.json',
    'convention_quotes.json',
    'contact_enquiries.json',
    'folio_charges.json',
    'rfid_events.json',
    'rfid_tap_history.json',
    'audit_logs.json'
  ];

  for (const file of emptyTables) {
    const p = path.join('data', file);
    fs.writeFileSync(p, JSON.stringify([], null, 2), 'utf8');
    console.log(`  - Reset data/${file} to []`);
  }

  // Preserve only Super Admin & Cleaner cards in data/cards.json
  const cardsPath = path.join('data', 'cards.json');
  if (fs.existsSync(cardsPath)) {
    const existingCards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
    const preservedCards = existingCards.filter(c => c.card_type === 'super_admin' || c.card_type === 'cleaner');
    fs.writeFileSync(cardsPath, JSON.stringify(preservedCards, null, 2), 'utf8');
    console.log(`  - Filtered data/cards.json to preserve ${preservedCards.length} Master & Cleaner cards.`);
  }

  console.log('\n================================================================');
  console.log('PRODUCTION DATABASE & LOCAL RUNTIME CLEANUP FULLY COMPLETED');
  console.log('================================================================');
}

executeCleanup().catch(console.error);
