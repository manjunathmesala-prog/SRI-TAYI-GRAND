const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].replace(/['"]/g, '').trim() : '';

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function migrate() {
  await client.connect();
  console.log('Connected to PostgreSQL database');

  console.log('Creating stay_extensions table if not exists...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS stay_extensions (
      id VARCHAR(100) PRIMARY KEY,
      booking_id UUID,
      booking_reference VARCHAR(100) NOT NULL,
      guest_id UUID,
      guest_name VARCHAR(255) NOT NULL,
      room_id VARCHAR(100),
      room_number VARCHAR(50) NOT NULL,
      previous_checkout_date VARCHAR(50) NOT NULL,
      new_checkout_date VARCHAR(50) NOT NULL,
      additional_nights INTEGER NOT NULL,
      daily_room_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
      additional_room_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
      tax_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.12,
      tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_extension_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
      pricing_mode VARCHAR(50) DEFAULT 'gst_inclusive',
      paid_now NUMERIC(12, 2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(50),
      payment_reference VARCHAR(100),
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      performed_by VARCHAR(100) NOT NULL DEFAULT 'Front Desk',
      idempotency_key VARCHAR(150) UNIQUE,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_stay_extensions_booking_ref ON stay_extensions(booking_reference);
    CREATE INDEX IF NOT EXISTS idx_stay_extensions_room_number ON stay_extensions(room_number);
    CREATE INDEX IF NOT EXISTS idx_stay_extensions_idempotency ON stay_extensions(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_stay_extensions_created_at ON stay_extensions(created_at DESC);
  `);

  console.log('Checking table columns...');
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'stay_extensions'
    ORDER BY ordinal_position;
  `);
  console.log('stay_extensions columns:', cols.rows);

  await client.end();
  console.log('Migration completed successfully!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
