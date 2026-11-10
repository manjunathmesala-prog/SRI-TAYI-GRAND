const { Client } = require('pg');

async function audit() {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.wercvaimozbbkbwmuoct',
    password: 'Vaynex@2026',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to live Supabase DB!');

  // 1. All tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  const tables = tablesRes.rows.map(r => r.table_name);
  console.log('\n--- ALL PUBLIC TABLES (' + tables.length + ') ---');
  console.log(tables.join(', '));

  // 2. Row counts for each table
  console.log('\n--- ROW COUNTS ---');
  for (const t of tables) {
    try {
      const cRes = await client.query(`SELECT count(*) FROM "${t}";`);
      console.log(`  ${t.padEnd(30)} : ${cRes.rows[0].count} rows`);
    } catch (e) {
      console.log(`  ${t.padEnd(30)} : ERROR (${e.message})`);
    }
  }

  // 3. Storage buckets
  console.log('\n--- STORAGE BUCKETS ---');
  try {
    const bucketsRes = await client.query(`SELECT id, name, public FROM storage.buckets;`);
    console.log(bucketsRes.rows);
  } catch (e) {
    console.log('Error querying storage.buckets:', e.message);
  }

  // 4. Columns for key tables of interest
  const interesting = [
    'hall_enquiries', 'hall_bookings', 'hall_payments', 'convention_halls',
    'housekeeping_tasks', 'room_housekeeping', 'room_maintenance',
    'audit_logs', 'additional_charges', 'profiles', 'staff_assignments',
    'notifications', 'website_content', 'gallery_images', 'hotel_settings'
  ];

  console.log('\n--- SCHEMA DETAILS FOR KEY TABLES ---');
  for (const t of interesting) {
    if (tables.includes(t)) {
      const colRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [t]);
      console.log(`\nTable [${t}]:`);
      colRes.rows.forEach(c => {
        console.log(`  - ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable}, default: ${c.column_default})`);
      });
    } else {
      console.log(`\nTable [${t}] DOES NOT EXIST!`);
    }
  }

  await client.end();
}

audit().catch(console.error);
