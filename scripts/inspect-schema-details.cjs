const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  
  console.log('--- ALL PUBLIC TABLES ---');
  const tbls = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log(tbls.rows.map(r => r.table_name));

  console.log('--- FOLIO_CHARGES COLUMNS ---');
  const folioCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'folio_charges'
    ORDER BY ordinal_position;
  `);
  console.log(folioCols.rows);

  console.log('--- ROOM_TRANSFERS COLUMNS ---');
  const rtCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'room_transfers'
    ORDER BY ordinal_position;
  `);
  console.log(rtCols.rows);

  console.log('--- STAY_EXTENSIONS CHECK ---');
  const extCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'stay_extensions'
    ORDER BY ordinal_position;
  `);
  console.log(extCols.rows);

  await client.end();
}

run().catch(console.error);
