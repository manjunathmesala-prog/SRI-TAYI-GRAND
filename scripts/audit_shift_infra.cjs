const { Pool } = require('pg');
const fs = require('fs');
if (fs.existsSync('.env.local')) {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    }
  });
}

async function audit() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('--- TABLES IN PUBLIC SCHEMA ---');
    console.log(tables.rows.map(r => r.table_name).join(', '));

    console.log('\n--- PROFILES COLUMNS ---');
    const profCols = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'profiles'
      ORDER BY ordinal_position;
    `);
    console.log(profCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

    console.log('\n--- ACTIVE STAFF JOINED PROFILES & USERS ---');
    const staffRes = await pool.query(`
      SELECT 
        p.id,
        p.full_name,
        u.email,
        p.phone,
        r.name as role_name,
        p.is_active
      FROM profiles p
      LEFT JOIN roles r ON p.role_id = r.id
      LEFT JOIN auth.users u ON p.id = u.id
      WHERE p.is_active = true;
    `);
    console.log(JSON.stringify(staffRes.rows, null, 2));

    console.log('\n--- ATTENDANCE COLUMNS ---');
    const attCols = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'staff_attendance'
      ORDER BY ordinal_position;
    `);
    console.log(attCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

    console.log('\n--- CASH SHIFTS COLUMNS ---');
    const shiftCols = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'cash_shifts'
      ORDER BY ordinal_position;
    `);
    console.log(shiftCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

    console.log('\n--- CASH TRANSACTIONS COLUMNS ---');
    const txCols = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'cash_transactions'
      ORDER BY ordinal_position;
    `);
    console.log(txCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

    console.log('\n--- CURRENT ATTENDANCE ROWS ---');
    const att = await pool.query(`SELECT * FROM staff_attendance ORDER BY clock_in DESC LIMIT 5;`);
    console.log(JSON.stringify(att.rows, null, 2));

    console.log('\n--- AUDIT LOGS COLUMNS ---');
    const alCols = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
      ORDER BY ordinal_position;
    `);
    console.log(alCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

    console.log('\n--- EXISTING CONSTRAINTS / INDEXES ---');
    const idxs = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('staff_attendance', 'cash_shifts', 'cash_transactions');
    `);
    console.log(JSON.stringify(idxs.rows, null, 2));

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await pool.end();
  }
}

audit();
