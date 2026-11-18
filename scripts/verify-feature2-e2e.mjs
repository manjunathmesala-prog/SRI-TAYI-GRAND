import pg from 'pg';
import fs from 'fs';
import crypto from 'crypto';

const { Pool } = pg;

// Load env from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1].trim()] = val;
  }
});

const AUTH_SECRET = env.ADMIN_JWT_SECRET || 'sri_tayi_grand_secure_default_hmac_jwt_secret_kadiri_2026_enterprise';

function createAdminToken() {
  const payload = {
    userId: 'staff-super-admin',
    name: 'Sri Tayi Grand Admin',
    email: 'admin@sritayigrand.com',
    role: 'Super Admin',
    exp: Date.now() + 3600000,
  };
  const dataB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(dataB64).digest('base64url');
  return `${dataB64}.${signature}`;
}

const pool = new Pool({
  connectionString: env.DATABASE_URL || env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function runFeature2E2E() {
  console.log('=== SRI TAYI GRAND: FEATURE 2 MULTI-ROOM SELECTION E2E VERIFICATION ===\n');

  const token = createAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Cookie': `stg_session=${token}`,
  };

  const BASE_URL = 'http://localhost:3000';

  console.log('1. Checking dev server health at', BASE_URL);
  const healthRes = await fetch(`${BASE_URL}/api/admin/bookings`, { headers });
  if (!healthRes.ok) {
    throw new Error(`Server returned ${healthRes.status}: ${await healthRes.text()}`);
  }
  console.log('   Dev server is live and responding (HTTP 200)!');

  const offsetDate = (days) => {
    const d = new Date(Date.now() + days * 86400000);
    return d.toISOString().slice(0, 10);
  };

  const checkIn = offsetDate(70);
  const checkOut = offsetDate(71);

  console.log(`\n2. Creating multi-room mixed-category reservation via API:`);
  console.log(`   Stay dates: ${checkIn} to ${checkOut}`);
  console.log(`   Rooms: Room 201 (Double Room @ ₹1,800) + Room 306 (Suite Room @ ₹3,300)`);

  const walkInPayload = {
    action: 'statutory_walk_in',
    guestName: 'Balaji Narayana (Feature 2 E2E)',
    guestPhone: '9849099881',
    guestEmail: 'balaji.e2e@example.com',
    nationality: 'Indian',
    cityOfOrigin: 'Kadiri',
    idProofType: 'Aadhaar Card',
    idProofNumber: '548219289988',
    purposeOfVisit: 'Pilgrimage / Temple Darshan',
    checkInDate: checkIn,
    checkOutDate: checkOut,
    paymentMethod: 'cash',
    amountCollected: 5355,
    rooms: [
      { categoryId: 'cat-double-03', roomNumber: '201' },
      { categoryId: 'cat-suite-01', roomNumber: '306' },
    ],
    staffName: 'General Manager',
  };

  const res = await fetch(`${BASE_URL}/api/admin/operations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(walkInPayload),
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.booking) {
    throw new Error(`Walk-in failed (status ${res.status}): ${data.error || JSON.stringify(data)}`);
  }

  const booking = data.booking;
  console.log(`   ✓ Multi-room booking created successfully!`);
  console.log(`     Booking Reference: ${booking.booking_reference}`);
  console.log(`     Rooms Count: ${booking.rooms_count}`);
  console.log(`     Assigned Rooms: ${booking.assigned_room_numbers?.join(', ')}`);
  console.log(`     Subtotal: ₹${booking.subtotal_amount}, Tax: ₹${booking.tax_amount}, Total: ₹${booking.total_amount}`);

  // Assertions on API Response
  if (booking.rooms_count !== 2) throw new Error(`Expected rooms_count=2, got ${booking.rooms_count}`);
  if (!booking.assigned_room_numbers?.includes('201') || !booking.assigned_room_numbers?.includes('306')) {
    throw new Error(`Expected rooms [201, 306], got ${JSON.stringify(booking.assigned_room_numbers)}`);
  }
  if (booking.subtotal_amount !== 5100) throw new Error(`Expected subtotal 5100, got ${booking.subtotal_amount}`);
  if (booking.total_amount !== 5355) throw new Error(`Expected total 5355, got ${booking.total_amount}`);
  if (!Array.isArray(booking.booking_rooms) || booking.booking_rooms.length !== 2) {
    throw new Error(`Expected 2 items in booking_rooms, got ${booking.booking_rooms?.length}`);
  }

  console.log('\n3. Verifying PostgreSQL persistence in Supabase:');
  const bRow = await pool.query(
    `SELECT id, booking_reference, rooms_count, subtotal_amount, tax_amount, total_amount, status 
     FROM bookings WHERE booking_reference = $1`,
    [booking.booking_reference]
  );

  if (bRow.rows.length === 0) {
    throw new Error(`Booking ${booking.booking_reference} not found in PostgreSQL bookings table!`);
  }
  const pgBooking = bRow.rows[0];
  console.log(`   ✓ PostgreSQL bookings row verified:`);
  console.log(`     id: ${pgBooking.id}`);
  console.log(`     rooms_count: ${pgBooking.rooms_count}`);
  console.log(`     subtotal_amount: ₹${pgBooking.subtotal_amount}`);
  console.log(`     tax_amount: ₹${pgBooking.tax_amount}`);
  console.log(`     total_amount: ₹${pgBooking.total_amount}`);

  if (Number(pgBooking.rooms_count) !== 2) throw new Error(`PostgreSQL rooms_count != 2`);
  if (Number(pgBooking.total_amount) !== 5355) throw new Error(`PostgreSQL total_amount != 5355`);

  const brRows = await pool.query(
    `SELECT br.id, br.category_id, br.price_per_night, r.room_number, rc.name as category_name
     FROM booking_rooms br
     LEFT JOIN rooms r ON br.assigned_room_id = r.id
     LEFT JOIN room_categories rc ON br.category_id = rc.id
     WHERE br.booking_id = $1
     ORDER BY r.room_number`,
    [pgBooking.id]
  );
  console.log(`   ✓ PostgreSQL booking_rooms rows verified (${brRows.rows.length} rows):`);
  brRows.rows.forEach((r) => {
    console.log(`     - Room ${r.room_number} (${r.category_name}): price_per_night = ₹${r.price_per_night}`);
  });
  if (brRows.rows.length !== 2) {
    throw new Error(`Expected 2 rows in booking_rooms, found ${brRows.rows.length}`);
  }

  console.log('\n4. Testing duplicate room rejection via API:');
  const dupRes = await fetch(`${BASE_URL}/api/admin/operations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...walkInPayload,
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: '201' },
        { categoryId: 'cat-double-03', roomNumber: '201' },
      ],
    }),
  });
  const dupData = await dupRes.json();
  console.log(`   ✓ Duplicate room rejection returned status: ${dupRes.status}`);
  console.log(`     Error message: "${dupData.error}"`);
  if (dupRes.status === 200 || dupData.success) {
    throw new Error('Expected duplicate room selection to be rejected, but it succeeded!');
  }

  console.log('\n5. Testing overlapping booking conflict rejection via API:');
  const conflictRes = await fetch(`${BASE_URL}/api/admin/operations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...walkInPayload,
      guestName: 'Conflict Guest',
      guestPhone: '9849099882',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: '201' }, // Already booked for checkIn->checkOut!
        { categoryId: 'cat-double-03', roomNumber: '202' },
      ],
    }),
  });
  const conflictData = await conflictRes.json();
  console.log(`   ✓ Overlap conflict rejection returned status: ${conflictRes.status}`);
  console.log(`     Error message: "${conflictData.error}"`);
  if (conflictRes.status === 200 || conflictData.success) {
    throw new Error('Expected conflict to be rejected, but it succeeded!');
  }

  console.log('\n6. Cleaning up test reservation from PostgreSQL and local cache...');
  await pool.query('DELETE FROM booking_rooms WHERE booking_id = $1', [pgBooking.id]);
  await pool.query('DELETE FROM bookings WHERE id = $1', [pgBooking.id]);
  console.log('   ✓ Test booking cleaned up cleanly from database.');

  await pool.end();
  console.log('\n================================================================');
  console.log('FEATURE 2 E2E VERIFICATION COMPLETED SUCCESSFULLY (100% PASS)');
  console.log('================================================================\n');
}

runFeature2E2E().catch((err) => {
  console.error('E2E TEST FAILURE:', err);
  pool.end();
  process.exit(1);
});
