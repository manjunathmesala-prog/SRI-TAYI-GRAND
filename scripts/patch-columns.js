const { Client } = require('pg');

async function patch() {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.wercvaimozbbkbwmuoct',
    password: 'Vaynex@2026',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('Ensuring columns exist on room_maintenance...');
  await client.query(`
    ALTER TABLE room_maintenance ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
    ALTER TABLE room_maintenance ADD COLUMN IF NOT EXISTS category VARCHAR(100);
    ALTER TABLE room_maintenance ADD COLUMN IF NOT EXISTS priority VARCHAR(30) DEFAULT 'medium';
    ALTER TABLE room_maintenance ADD COLUMN IF NOT EXISTS reported_by VARCHAR(150);
    ALTER TABLE room_maintenance ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 2) DEFAULT 0.00;
    ALTER TABLE room_maintenance ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE room_maintenance ADD COLUMN IF NOT EXISTS ticket_id VARCHAR(100);
    ALTER TABLE room_maintenance DROP CONSTRAINT IF EXISTS room_maintenance_status_check;
    ALTER TABLE room_maintenance ADD CONSTRAINT room_maintenance_status_check CHECK (status IN ('open', 'reported', 'in_progress', 'resolved', 'cancelled', 'closed'));
  `);

  console.log('Ensuring columns exist on room_housekeeping...');
  await client.query(`
    ALTER TABLE room_housekeeping ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
    ALTER TABLE room_housekeeping ADD COLUMN IF NOT EXISTS housekeeper_name VARCHAR(150);
    ALTER TABLE room_housekeeping ADD COLUMN IF NOT EXISTS priority VARCHAR(30) DEFAULT 'normal';
    ALTER TABLE room_housekeeping ADD COLUMN IF NOT EXISTS checklist JSONB;
    ALTER TABLE room_housekeeping ADD COLUMN IF NOT EXISTS task_id VARCHAR(100);
  `);

  console.log('Ensuring columns exist on audit_logs...');
  await client.query(`
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(150);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role VARCHAR(50);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS category VARCHAR(50);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS log_id VARCHAR(100);
  `);

  console.log('Ensuring columns exist on additional_charges...');
  await client.query(`
    ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(50);
    ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS category VARCHAR(50);
    ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 0.12;
    ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) DEFAULT 0.00;
    ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) DEFAULT 0.00;
    ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS posted_by VARCHAR(150);
    ALTER TABLE additional_charges ADD COLUMN IF NOT EXISTS charge_id VARCHAR(100);
  `);

  console.log('✅ All table columns & constraints successfully verified and enhanced!');
  await client.end();
}

patch().catch(console.error);
