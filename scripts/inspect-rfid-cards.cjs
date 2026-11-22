const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const cols = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rfid_cards' ORDER BY ordinal_position"
    );
    console.log('rfid_cards columns:', cols.rows.map(r => r.column_name));

    const distinctCardTypes = await client.query("SELECT card_type, count(*) FROM rfid_cards GROUP BY card_type");
    console.table(distinctCardTypes.rows);

    const superAdminCards = await client.query("SELECT * FROM rfid_cards WHERE card_type = 'super_admin' OR card_type = 'cleaner' OR card_label ILIKE '%admin%' OR card_label ILIKE '%clean%'");
    console.log(`Found ${superAdminCards.rows.length} Admin/Cleaner cards:`);
    console.table(superAdminCards.rows.map(r => ({
      id: r.id,
      card_uid: r.card_uid,
      card_label: r.card_label,
      card_type: r.card_type,
      holder_name: r.holder_name,
      is_active: r.is_active
    })));

    const recentCards = await client.query("SELECT id, card_uid, card_label, card_type, holder_name, is_active, created_at FROM rfid_cards ORDER BY created_at DESC LIMIT 10");
    console.log('Recent 10 cards:');
    console.table(recentCards.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
