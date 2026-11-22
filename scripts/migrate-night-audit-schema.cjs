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
  auto_retry_enabled BOOLEAN NOT NULL DEFAULT true,
  max_retry_attempts INTEGER NOT NULL DEFAULT 3,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'operational',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE night_audit_settings ADD COLUMN IF NOT EXISTS auto_retry_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE night_audit_settings ADD COLUMN IF NOT EXISTS max_retry_attempts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE night_audit_settings ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
ALTER TABLE night_audit_settings ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;
ALTER TABLE night_audit_settings ADD COLUMN IF NOT EXISTS last_status TEXT NOT NULL DEFAULT 'operational';

CREATE OR REPLACE VIEW audit_scheduler_settings AS SELECT * FROM night_audit_settings;

-- Seed default settings
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
  role TEXT NOT NULL DEFAULT 'General Manager',
  is_active BOOLEAN NOT NULL DEFAULT true,
  consent_status TEXT NOT NULL DEFAULT 'granted',
  created_by TEXT DEFAULT 'Super Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE night_audit_recipients ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'General Manager';
ALTER TABLE night_audit_recipients ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'Super Admin';
ALTER TABLE night_audit_recipients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_recipient_channel_address ON night_audit_recipients (hotel_id, channel, lower(recipient_address));

CREATE OR REPLACE VIEW audit_recipients AS SELECT * FROM night_audit_recipients;

-- Seed default authorized recipients
INSERT INTO night_audit_recipients (id, hotel_id, channel, recipient_name, recipient_address, role, is_active, consent_status, created_by, created_at, updated_at)
VALUES 
  ('rec-gm-hari', 'sri-tayi-grand', 'email', 'General Manager (Hari Achari)', 'hari@sritayigrand.com', 'General Manager', true, 'granted', 'System Seed', NOW(), NOW()),
  ('rec-accounts-dept', 'sri-tayi-grand', 'email', 'Accounts Department', 'accounts@sritayigrand.com', 'Accounts Department', true, 'granted', 'System Seed', NOW(), NOW()),
  ('rec-mgmt-official', 'sri-tayi-grand', 'email', 'Sri Tayi Grand Official', 'contact@sritayigrand.com', 'Official', true, 'granted', 'System Seed', NOW(), NOW()),
  ('rec-tech-vaynex', 'sri-tayi-grand', 'email', 'Technical Admin (Vaynex)', 'byvaynex@gmail.com', 'Technical Admin', true, 'granted', 'System Seed', NOW(), NOW())
ON CONFLICT (hotel_id, channel, lower(recipient_address)) DO UPDATE SET
  recipient_name = EXCLUDED.recipient_name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- 3. daily_audit_runs
CREATE TABLE IF NOT EXISTS daily_audit_runs (
  id TEXT PRIMARY KEY,
  business_date DATE NOT NULL,
  run_type TEXT NOT NULL DEFAULT 'scheduled',
  status TEXT NOT NULL DEFAULT 'in_progress',
  triggered_by TEXT NOT NULL DEFAULT 'system',
  summary_json JSONB DEFAULT '{}'::jsonb,
  pdf_path TEXT,
  pdf_filename TEXT,
  error_log TEXT,
  reconciled BOOLEAN NOT NULL DEFAULT true,
  discrepancy_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE daily_audit_runs ADD COLUMN IF NOT EXISTS reconciled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE daily_audit_runs ADD COLUMN IF NOT EXISTS discrepancy_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE daily_audit_runs ADD COLUMN IF NOT EXISTS run_type TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE daily_audit_runs ADD COLUMN IF NOT EXISTS triggered_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE daily_audit_runs ADD COLUMN IF NOT EXISTS summary_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE daily_audit_runs ADD COLUMN IF NOT EXISTS pdf_path TEXT;
ALTER TABLE daily_audit_runs ADD COLUMN IF NOT EXISTS pdf_filename TEXT;
ALTER TABLE daily_audit_runs ADD COLUMN IF NOT EXISTS error_log TEXT;

CREATE INDEX IF NOT EXISTS idx_daily_audit_runs_date ON daily_audit_runs(business_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_audit_runs_status ON daily_audit_runs(status);

-- 4. audit_report_snapshots
CREATE TABLE IF NOT EXISTS audit_report_snapshots (
  id TEXT PRIMARY KEY,
  audit_run_id TEXT REFERENCES daily_audit_runs(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  snapshot_json JSONB NOT NULL,
  cutoff_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON audit_report_snapshots(business_date);

-- 5. audit_report_files
CREATE TABLE IF NOT EXISTS audit_report_files (
  id TEXT PRIMARY KEY,
  audit_run_id TEXT REFERENCES daily_audit_runs(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  sha256_checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. audit_dispatch_logs
CREATE TABLE IF NOT EXISTS audit_dispatch_logs (
  id TEXT PRIMARY KEY,
  audit_run_id TEXT NOT NULL REFERENCES daily_audit_runs(id) ON DELETE CASCADE,
  recipient_id TEXT,
  recipient_name TEXT,
  channel TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

ALTER TABLE audit_dispatch_logs ADD COLUMN IF NOT EXISTS recipient_id TEXT;
ALTER TABLE audit_dispatch_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE audit_dispatch_logs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_audit_dispatch_run_id ON audit_dispatch_logs(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_audit_dispatch_status ON audit_dispatch_logs(status);

-- 7. audit_delivery_events
CREATE TABLE IF NOT EXISTS audit_delivery_events (
  id TEXT PRIMARY KEY,
  dispatch_log_id TEXT REFERENCES audit_dispatch_logs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. audit_exceptions
CREATE TABLE IF NOT EXISTS audit_exceptions (
  id TEXT PRIMARY KEY,
  audit_run_id TEXT REFERENCES daily_audit_runs(id) ON DELETE CASCADE,
  severity TEXT NOT NULL,
  exception_type TEXT NOT NULL,
  message TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. audit_execution_logs
CREATE TABLE IF NOT EXISTS audit_execution_logs (
  id TEXT PRIMARY KEY,
  audit_run_id TEXT REFERENCES daily_audit_runs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function applyMigration() {
  console.log('Connecting to Supabase PostgreSQL database...');
  const client = await pool.connect();
  try {
    console.log('Executing migrationSql...');
    await client.query(migrationSql);
    console.log('✅ Enterprise Night Audit schema applied successfully!');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%audit%' OR table_name LIKE '%night%')
      ORDER BY table_name;
    `);
    console.log('\nVerified Tables:');
    console.log(res.rows.map(r => ' - ' + r.table_name).join('\n'));

    const recs = await client.query('SELECT id, recipient_name, channel, recipient_address, role, is_active FROM night_audit_recipients;');
    console.log('\nRecipients in Database:');
    console.table(recs.rows);

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
