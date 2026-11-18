import pg from 'pg';
import fs from 'fs';
import crypto from 'crypto';

const { Pool } = pg;

// Load env
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

async function main() {
  console.log('=== SRI TAYI GRAND: EXTRA ROOM OPTION LIVE VERIFICATION ===\n');

  const token = createAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const BASE_URL = 'http://localhost:3000';

  console.log('1. Checking dev server health at', BASE_URL);
  const healthRes = await fetch(`${BASE_URL}/api/admin/bookings`, { headers });
  if (!healthRes.ok) {
    throw new Error(`Server returned ${healthRes.status}: ${await healthRes.text()}`);
  }
  const healthData = await healthRes.json();
  console.log('   Dev server is live! Total active bookings loaded:', healthData.bookings?.length ?? 0);

  // Setup stay dates (future stay to avoid conflict with checked_in guests)
  const checkIn = '2026-12-10';
  const checkOut = '2026-12-11';
  const testRef = `STG-VERIFY-${Date.now()}`;

  console.log('\n2. Creating test booking with single room (Room 201)...');
  const createRes = await fetch(`${BASE_URL}/api/admin/bookings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      booking_reference: testRef,
      guest_id: 'gst-verify-01',
      guest_name: 'Dev Verification Guest',
      guest_phone: '9849099999',
      guest_email: 'verify@sritayigrand.com',
      adults_count: 2,
      children_count: 0,
      rooms_count: 1,
      check_in_date: checkIn,
      check_out_date: checkOut,
      category_id: 'cat-double-03',
      category_name: 'Double Room',
      assigned_room_number: '201',
      status: 'confirmed',
      payment_status: 'pending',
      payment_method: 'pay_at_hotel',
      subtotal_amount: 1800,
      room_charges_amount: 1800,
      additional_charges_amount: 0,
      tax_amount: 90,
      total_amount: 1890,
      paid_amount: 0,
      booking_source: 'front_desk_manual'
    })
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.success) {
    throw new Error(`Failed to create test booking: ${JSON.stringify(createData)}`);
  }
  const bookingRef = createData.booking.booking_reference;
  console.log(`   Created test booking: ${bookingRef}`);
  console.log(`   Initial State: Rooms Count = ${createData.booking.rooms_count}, Total = ₹${createData.booking.total_amount}`);

  try {
    console.log('\n3. Testing Feature 1: Adding Extra Room (Room 202) via POST /api/admin/operations...');
    const extraRes = await fetch(`${BASE_URL}/api/admin/operations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'add_extra_room',
        bookingReference: bookingRef,
        roomNumber: '202',
        staffName: 'Dev Automated Tester'
      })
    });

    const extraData = await extraRes.json();
    console.log(`   Response Status: ${extraRes.status}`);
    console.log('   Response Data:', extraData);

    if (!extraRes.ok || !extraData.success) {
      throw new Error(`Failed to add extra room: ${JSON.stringify(extraData)}`);
    }

    const newRoomsCount = extraData.newRoomsCount || extraData.booking?.rooms_count;
    console.log(`   - Extra room assigned: #${extraData.extraRoom?.room_number}`);
    console.log(`   - New rooms count: ${newRoomsCount}`);
    console.log(`   - Added tariff: ₹${extraData.addedAmount} + Tax ₹${extraData.addedTax}`);
    console.log(`   - Authoritative new total: ₹${extraData.newTotal}`);
    console.log(`   - Booking assigned_room_numbers:`, extraData.booking?.assigned_room_numbers);

    if (newRoomsCount !== 2) throw new Error('Expected newRoomsCount to be 2');
    if (extraData.newTotal !== 3780) throw new Error(`Expected newTotal to be 3780, got ${extraData.newTotal}`);

    console.log('\n5. Testing Double-Booking Protection: Attempting to add Room 202 again...');
    const dupRes = await fetch(`${BASE_URL}/api/admin/operations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'add_extra_room',
        bookingReference: bookingRef,
        roomNumber: '202'
      })
    });
    const dupData = await dupRes.json();
    console.log(`   Double-booking attempt response code: ${dupRes.status} (Expected 409)`);
    console.log(`   Error message: "${dupData.error}"`);
    if (dupRes.status !== 409) {
      throw new Error(`Expected HTTP 409 for duplicate room assignment, got ${dupRes.status}`);
    }

    console.log('\n6. Checking PHYSICAL DATABASE STORAGE in PostgreSQL:');
    const pgBooking = await pool.query(
      'SELECT id, booking_reference, rooms_count, subtotal_amount, tax_amount, total_amount, assigned_room_number FROM bookings WHERE booking_reference = $1;',
      [bookingRef]
    );
    console.log('   [PostgreSQL bookings table row]:', pgBooking.rows[0]);
    if (!pgBooking.rows[0]) throw new Error('Booking not found in PostgreSQL bookings table!');
    if (Number(pgBooking.rows[0].rooms_count) !== 2) throw new Error(`PostgreSQL rooms_count mismatch: ${pgBooking.rows[0].rooms_count}`);
    if (Number(pgBooking.rows[0].total_amount) !== 3780) throw new Error(`PostgreSQL total_amount mismatch: ${pgBooking.rows[0].total_amount}`);

    const bookingUuid = pgBooking.rows[0].id;
    const pgRooms = await pool.query(
      `SELECT br.id, br.booking_id, br.price_per_night, r.room_number, rc.name as category_name
       FROM booking_rooms br
       LEFT JOIN rooms r ON br.assigned_room_id = r.id
       LEFT JOIN room_categories rc ON br.category_id = rc.id
       WHERE br.booking_id = $1
       ORDER BY r.room_number;`,
      [bookingUuid]
    );
    console.log(`   [PostgreSQL booking_rooms table rows (${pgRooms.rows.length} rows found)]:`);
    pgRooms.rows.forEach((r, idx) => {
      console.log(`     Room #${idx + 1}: Room Number = ${r.room_number}, Price = ₹${r.price_per_night}, Category = ${r.category_name}`);
    });
    if (pgRooms.rows.length !== 2) {
      throw new Error(`Expected 2 rows in PostgreSQL booking_rooms table, found ${pgRooms.rows.length}`);
    }
    const roomNums = pgRooms.rows.map(r => r.room_number);
    if (!roomNums.includes('201') || !roomNums.includes('202')) {
      throw new Error(`Expected rooms 201 and 202 in booking_rooms, got: ${roomNums.join(', ')}`);
    }

    console.log('\n7. Checking OPERATIONAL STORAGE CACHE (data/bookings.json):');
    if (fs.existsSync('data/bookings.json')) {
      const diskBookings = JSON.parse(fs.readFileSync('data/bookings.json', 'utf8'));
      const diskB = diskBookings.find(b => b.booking_reference === bookingRef);
      if (diskB) {
        console.log(`   Found in data/bookings.json: rooms_count = ${diskB.rooms_count}, total = ₹${diskB.total_amount}`);
        console.log(`   Assigned room numbers:`, diskB.assigned_room_numbers);
        if (diskB.rooms_count !== 2 || diskB.total_amount !== 3780) {
          throw new Error('data/bookings.json financial data out of sync');
        }
      } else {
        console.log('   (Booking in memory/database, not yet flushed to file or file reloaded)');
      }
    }

    console.log('\n=== ALL VERIFICATIONS PASSED: FEATURE 1 WORKING AND STORING CORRECTLY! ===\n');

  } finally {
    console.log('8. Cleaning up test booking from PostgreSQL...');
    await pool.query('DELETE FROM bookings WHERE booking_reference = $1;', [bookingRef]);
    console.log('   Cleaned up test record.');
    await pool.end();
  }
}

main().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  pool.end();
  process.exit(1);
});
