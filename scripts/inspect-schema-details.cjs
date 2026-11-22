const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  
  console.log('--- STAFF_ATTENDANCE COLUMNS ---');
  const attCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'staff_attendance'
    ORDER BY ordinal_position;
  `);
  console.log(attCols.rows);

  console.log('--- STAFF_ATTENDANCE INDEXES ---');
  const attIdx = await client.query(`
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'staff_attendance';
  `);
  console.log(attIdx.rows);

  console.log('--- CASH_SHIFTS COLUMNS ---');
  const shiftCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'cash_shifts'
    ORDER BY ordinal_position;
  `);
  console.log(shiftCols.rows);

  console.log('--- CASH_SHIFTS INDEXES ---');
  const shiftIdx = await client.query(`
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'cash_shifts';
  `);
  console.log(shiftIdx.rows);

  console.log('--- CASH_TRANSACTIONS COLUMNS ---');
  const ctxCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'cash_transactions'
    ORDER BY ordinal_position;
  `);
  console.log(ctxCols.rows);

  await client.end();
}

run().catch(console.error);
