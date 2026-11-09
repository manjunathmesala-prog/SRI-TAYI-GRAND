const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const client = new Client({
    host: 'db.wercvaimozbbkbwmuoct.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Vaynex@2026',
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connecting to PostgreSQL database...');
  await client.connect();
  console.log('Connected!');

  const checkTables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  );
  console.log('Existing public tables count:', checkTables.rows.length);
  if (checkTables.rows.length > 0) {
    console.log('Existing tables:', checkTables.rows.map((r) => r.table_name).join(', '));
  }

  const migrationFiles = [
    'supabase/migrations/20261104000000_sri_tayi_grand_master_schema.sql',
    'supabase/migrations/20261105000000_rfid_cards_roles_and_housekeeping.sql',
    'supabase/migrations/20261105010000_walk_in_reception_kiosk.sql',
    'supabase/seed.sql',
  ];

  for (const relPath of migrationFiles) {
    const fullPath = path.join(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${relPath}`);
      continue;
    }
    console.log(`\n--- Applying ${relPath} ---`);
    const sql = fs.readFileSync(fullPath, 'utf8');
    try {
      await client.query(sql);
      console.log(`✅ Successfully applied ${relPath}`);
    } catch (err) {
      console.error(`❌ Error applying ${relPath}:`, err.message);
    }
  }

  const finalTables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  );
  console.log(`\nFinal public tables count: ${finalTables.rows.length}`);
  console.log('Final tables:', finalTables.rows.map((r) => r.table_name).join(', '));

  await client.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
