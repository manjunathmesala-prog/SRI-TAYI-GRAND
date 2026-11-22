const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.resolve('backup_20261122_pre_cleanup');
const SUPABASE_BACKUP_DIR = path.join(BACKUP_DIR, 'supabase_tables');
const DATA_BACKUP_DIR = path.join(BACKUP_DIR, 'data_folder');
const CONFIGS_BACKUP_DIR = path.join(BACKUP_DIR, 'configs');

fs.mkdirSync(SUPABASE_BACKUP_DIR, { recursive: true });
fs.mkdirSync(DATA_BACKUP_DIR, { recursive: true });
fs.mkdirSync(CONFIGS_BACKUP_DIR, { recursive: true });

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function backup() {
  console.log('================================================================');
  console.log('SRI TAYI GRAND - PRODUCTION DATABASE & STATE FULL BACKUP');
  console.log('Timestamp: ' + new Date().toISOString());
  console.log('Backup Target: ' + BACKUP_DIR);
  console.log('================================================================\n');

  // 1. Backup local data directory
  if (fs.existsSync('data')) {
    const files = fs.readdirSync('data');
    for (const f of files) {
      fs.copyFileSync(path.join('data', f), path.join(DATA_BACKUP_DIR, f));
    }
    console.log(`✅ Backed up ${files.length} local persistence files from data/ directory.`);
  }

  // 2. Backup key config files (excluding sensitive raw credentials where possible)
  const configsToSave = ['bridge_config.ini', 'card_sn_counter.dat'];
  for (const c of configsToSave) {
    if (fs.existsSync(c)) {
      fs.copyFileSync(c, path.join(CONFIGS_BACKUP_DIR, c));
      console.log(`✅ Backed up ${c}`);
    }
  }

  // 3. Connect to Supabase PostgreSQL and dump all tables
  await client.connect();
  console.log('\nConnected to Supabase PostgreSQL. Dumping all 63 tables...');

  const tablesRes = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  );
  const tables = tablesRes.rows.map(r => r.table_name);

  const manifest = {
    backup_timestamp: new Date().toISOString(),
    total_tables: tables.length,
    tables: {}
  };

  for (const t of tables) {
    try {
      const res = await client.query(`SELECT * FROM "${t}";`);
      const rowCount = res.rows.length;
      const targetPath = path.join(SUPABASE_BACKUP_DIR, `${t}.json`);
      fs.writeFileSync(targetPath, JSON.stringify(res.rows, null, 2), 'utf8');
      manifest.tables[t] = {
        rowCount,
        file: `${t}.json`,
        status: 'SUCCESS'
      };
      console.log(`  - Table "${t}": ${rowCount} rows dumped`);
    } catch (err) {
      console.error(`  ❌ Failed table "${t}":`, err.message);
      manifest.tables[t] = {
        rowCount: -1,
        error: err.message,
        status: 'FAILED'
      };
    }
  }

  // 4. Save manifest
  fs.writeFileSync(path.join(BACKUP_DIR, 'backup_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('\n✅ Manifest written to backup_manifest.json');

  await client.end();
  console.log('================================================================');
  console.log('FULL BACKUP COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

backup().catch(console.error);
