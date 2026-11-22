const { Pool } = require('pg');
const fs = require('fs');

let connStr = 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf8');
  for (const line of content.split('\n')) {
    if (line.startsWith('DATABASE_URL=') || line.startsWith('SUPABASE_DATABASE_URL=')) {
      connStr = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
      break;
    }
  }
}

const pool = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false }
});

const migrationSql = `
-- 1. night_audit_settings
CREATE TABLE IF NOT EXISTS night_audit_settings (
  id TEXT PRIMARY KEY DEFAULT 'stg-audit-settings',
  hotel_id TEXT NOT NULL DEFAULT 'sri-tayi-grand',
  enabled BOOLEAN NOT NULL DEFAULT true,
  execution_time TEXT NOT NULL DEFAULT '00:00',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'operational',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default settings if not exists
INSERT INTO night_audit_settings (id, hotel_id, enabled, execution_time, timezone, email_enabled, whatsapp_enabled, last_status, updated_at)
VALUES ('stg-audit-settings', 'sri-tayi-grand', true, '00:00', 'Asia/Kolkata', true, false, 'operational', NOW())
ON CONFLICT (id) DO UPDATE SET
  execution_time = COALESCE(night_audit_settings.execution_time, '00:00'),
  timezone = 'Asia/Kolkata',
  updated_at = NOW();

-- 2. night_audit_recipients
CREATE TABLE IF NOT EXISTS night_audit_recipients (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL DEFAULT 'sri-tayi-grand',
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient_name TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  consent_status TEXT NOT NULL DEFAULT 'granted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default authorized recipients if none exist
INSERT INTO night_audit_recipients (id, hotel_id, channel, recipient_name, recipient_address, is_active, consent_status, created_at, updated_at)
VALUES 
  ('rec-tech-admin', 'sri-tayi-grand', 'email', 'Technical Director (Vaynex)', 'byvaynex@gmail.com', true, 'granted', NOW(), NOW()),
  ('rec-mgmt-desk', 'sri-tayi-grand', 'email', 'Sri Tayi Grand Management', 'contact@sritayigrand.com', true, 'granted', NOW(), NOW()),
  ('rec-mod-hari', 'sri-tayi-grand', 'email', 'Duty Manager (Hari Achari)', 'hari@sritayigrand.com', true, 'granted', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. daily_audit_runs
CREATE TABLE IF NOT EXISTS daily_audit_runs (
  id TEXT PRIMARY KEY,
  business_date DATE NOT NULL,
  run_type TEXT NOT NULL CHECK (run_type IN ('scheduled', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  triggered_by TEXT NOT NULL DEFAULT 'system',
  summary_json JSONB,
  pdf_path TEXT,
  pdf_filename TEXT,
  error_log TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_daily_audit_runs_date ON daily_audit_runs(business_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_audit_runs_status ON daily_audit_runs(status);

-- 4. audit_dispatch_logs
CREATE TABLE IF NOT EXISTS audit_dispatch_logs (
  id TEXT PRIMARY KEY,
  audit_run_id TEXT NOT NULL REFERENCES daily_audit_runs(id) ON DELETE CASCADE,
  recipient_name TEXT,
  channel TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_dispatch_run_id ON audit_dispatch_logs(audit_run_id);
`;

async function applyMigration() {
  const client = await pool.connect();
  try {
    console.log('Applying Night Audit Production Schema Migration...');
    await client.query(migrationSql);
    console.log('Migration applied successfully!');

    const settingsRes = await client.query('SELECT * FROM night_audit_settings;');
    console.log('Current Settings in Supabase:', settingsRes.rows);

    const recRes = await client.query('SELECT * FROM night_audit_recipients;');
    console.log('Current Recipients in Supabase:', recRes.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
