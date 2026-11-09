const { Client } = require('C:\\Users\\M S T C\\Downloads\\tayi grand\\node_modules\\pg');
const fs = require('fs');

async function syncAll() {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.wercvaimozbbkbwmuoct',
    password: 'Vaynex@2026',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL!');

  // 1. Sync Cards
  const cardsFile = 'C:\\Users\\M S T C\\Downloads\\tayi grand\\data\\cards.json';
  if (fs.existsSync(cardsFile)) {
    const cards = JSON.parse(fs.readFileSync(cardsFile, 'utf8'));
    console.log(`Syncing ${cards.length} cards to Supabase rfid_cards...`);
    for (const c of cards) {
      const q = `
        INSERT INTO rfid_cards (
          card_uid, card_label, card_type, is_lifetime, holder_name, holder_role, status, activated_at, expires_at, deactivated_at, last_tap_room, last_tap_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (card_uid) DO UPDATE SET
          card_label = EXCLUDED.card_label,
          card_type = EXCLUDED.card_type,
          is_lifetime = EXCLUDED.is_lifetime,
          holder_name = EXCLUDED.holder_name,
          holder_role = EXCLUDED.holder_role,
          status = EXCLUDED.status,
          activated_at = EXCLUDED.activated_at,
          expires_at = EXCLUDED.expires_at,
          deactivated_at = EXCLUDED.deactivated_at,
          last_tap_room = EXCLUDED.last_tap_room,
          last_tap_at = EXCLUDED.last_tap_at,
          updated_at = NOW();
      `;
      const values = [
        c.card_uid,
        c.card_label || `Card (${c.card_uid})`,
        c.card_type || 'guest',
        Boolean(c.is_lifetime),
        c.holder_name || c.guest_name || 'Guest',
        c.holder_role || (c.card_type === 'super_admin' ? 'Super Admin' : c.card_type === 'cleaner' ? 'Housekeeping' : 'Guest'),
        c.status || 'active',
        c.activated_at ? new Date(c.activated_at) : null,
        c.expires_at ? new Date(c.expires_at) : null,
        c.deactivated_at ? new Date(c.deactivated_at) : null,
        c.last_tap_room || c.room_number || null,
        c.last_tap_at ? new Date(c.last_tap_at) : null,
      ];
      try {
        await client.query(q, values);
      } catch (err) {
        console.warn(`Error syncing card ${c.card_uid}:`, err.message);
      }
    }
    console.log('✅ All cards synced successfully!');
  }

  // 2. Sync Access Events
  const eventsFile = 'C:\\Users\\M S T C\\Downloads\\tayi grand\\data\\rfid_events.json';
  if (fs.existsSync(eventsFile)) {
    const events = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
    console.log(`Syncing ${events.length} events to Supabase rfid_access_events...`);
    let synced = 0;
    for (const e of events) {
      const q = `
        INSERT INTO rfid_access_events (
          room_number, device_name, event_type, action_type, card_type, holder_name, booking_reference, reason, source, occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
      `;
      const values = [
        e.room_number || 'N/A',
        e.device_name || 'Central-RFID-IoT-Gateway',
        e.event_type || 'access_granted',
        e.action_type || 'door_unlock',
        e.card_type || 'guest',
        e.holder_name || 'Guest',
        e.booking_reference || null,
        e.reason || null,
        e.source || 'encoder',
        e.occurred_at ? new Date(e.occurred_at) : new Date(),
      ];
      try {
        await client.query(q, values);
        synced++;
      } catch (err) {
        console.warn(`Error syncing event:`, err.message);
      }
    }
    console.log(`✅ ${synced} events synced successfully!`);
  }

  // Check counts
  const cardsCount = await client.query('SELECT count(*) FROM rfid_cards;');
  const eventsCount = await client.query('SELECT count(*) FROM rfid_access_events;');
  console.log(`\nFinal Supabase DB Count:`);
  console.log(`- rfid_cards: ${cardsCount.rows[0].count}`);
  console.log(`- rfid_access_events: ${eventsCount.rows[0].count}`);

  await client.end();
}

syncAll().catch(console.error);
