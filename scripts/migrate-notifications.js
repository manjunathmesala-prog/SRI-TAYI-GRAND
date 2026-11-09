const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    host: process.env.PGHOST || 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER || 'postgres.wercvaimozbbkbwmuoct',
    password: process.env.PGPASSWORD || 'Vaynex@2026',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Postgres via connection pooler.');

  const sql = `
    CREATE TABLE IF NOT EXISTS super_admin_notifications (
      id VARCHAR(100) PRIMARY KEY,
      recipient_id VARCHAR(100) NOT NULL DEFAULT 'super-admin',
      type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sa_notifs_recip_read_time 
    ON super_admin_notifications(recipient_id, is_read, created_at DESC);

    -- Enable RLS
    ALTER TABLE super_admin_notifications ENABLE ROW LEVEL SECURITY;

    -- Policy: Service role has full access
    DROP POLICY IF EXISTS "Service role full access to super_admin_notifications" ON super_admin_notifications;
    CREATE POLICY "Service role full access to super_admin_notifications" 
    ON super_admin_notifications FOR ALL TO service_role USING (true);

    -- Policy: Authenticated users with Super Admin access can read/update
    DROP POLICY IF EXISTS "Authenticated users access to super_admin_notifications" ON super_admin_notifications;
    CREATE POLICY "Authenticated users access to super_admin_notifications" 
    ON super_admin_notifications FOR ALL TO authenticated USING (true);
  `;

  await client.query(sql);
  console.log('✅ super_admin_notifications table & index created successfully!');

  const check = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'super_admin_notifications';"
  );
  console.log('Columns:');
  check.rows.forEach((r) => console.log(` - ${r.column_name}: ${r.data_type}`));

  await client.end();
}

migrate().catch(console.error);
