/**
 * Direct Supabase registration for Cloudflare RFID hardware tunnel
 */
const { Pool } = require('pg');

const tunnelUrl = process.argv[2] ? process.argv[2].trim().replace(/\/+$/, '') : null;

if (!tunnelUrl) {
  console.error('No tunnel URL provided to register-tunnel-supabase.js');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST || 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: Number(process.env.SUPABASE_DB_PORT) || 5432,
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres.wercvaimozbbkbwmuoct',
  password: process.env.SUPABASE_DB_PASSWORD || 'Vaynex@2026',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const query = `
    INSERT INTO integrations (
      id, service_name, config, is_enabled, health_status, last_health_check_at, updated_at
    ) VALUES (
      'e0000000-0000-0000-0000-000000000001',
      'rfid_bridge',
      $1::jsonb,
      true,
      'online',
      NOW(),
      NOW()
    )
    ON CONFLICT (service_name) DO UPDATE SET
      config = EXCLUDED.config,
      is_enabled = true,
      health_status = 'online',
      last_health_check_at = NOW(),
      updated_at = NOW();
  `;
  const config = JSON.stringify({
    tunnel_url: tunnelUrl,
    mode: 'hardware',
    port: 1,
    reader_type: 4,
    updated_at: new Date().toISOString(),
  });

  await pool.query(query, [config]);
  console.log(`[OK] Successfully synchronized tunnel ${tunnelUrl} into Supabase Cloud!`);
  await pool.end();
}

main().catch((err) => {
  console.warn('[WARN] Supabase direct registration:', err.message);
  process.exit(0);
});
