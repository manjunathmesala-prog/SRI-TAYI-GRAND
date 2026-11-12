const crypto = require('crypto');

const AUTH_SECRET = 'sri_tayi_grand_secure_default_hmac_jwt_secret_kadiri_2026_enterprise';
function signSessionPayload(payload) {
  const dataB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(dataB64).digest('base64url');
  return dataB64 + '.' + signature;
}

const token = signSessionPayload({
  userId: '00000000-0000-0000-0000-000000000001',
  name: 'Sri Tayi Grand Admin',
  email: 'admin@sritayigrand.com',
  role: 'Super Admin',
  exp: Date.now() + 86400000
});

const pages = [
  '/admin/dashboard',
  '/admin/analytics',
  '/admin/reports',
  '/admin/front-desk',
  '/admin/walk-in',
  '/admin/bookings',
  '/admin/rooms/board',
  '/admin/rooms/inventory',
  '/admin/rooms/categories',
  '/admin/guests',
  '/admin/housekeeping',
  '/admin/maintenance',
  '/admin/convention-hall',
  '/admin/enquiries',
  '/admin/rfid',
  '/admin/rfid/standee',
  '/admin/payments',
  '/admin/cashbook',
  '/admin/expenses',
  '/admin/accounting',
  '/admin/daily-closing',
  '/admin/staff/attendance',
  '/admin/staff',
  '/admin/pricing',
  '/admin/channels',
  '/admin/reviews',
  '/admin/content',
  '/admin/settings',
  '/admin/audit-logs',
  '/admin/login',
  '/admin/403'
];

async function testPages() {
  console.log('Testing all 31 admin web routes with active stg_session cookie...\n');
  let passCount = 0;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    try {
      const res = await fetch('http://localhost:3000' + page, {
        headers: {
          'Cookie': 'stg_session=' + token,
          'Authorization': 'Bearer ' + token
        },
        redirect: 'manual'
      });
      const isOk = res.status === 200 || (page === '/admin/login' && (res.status === 200 || res.status === 307));
      if (isOk) passCount++;
      console.log(`[${i + 1}/31] ${isOk ? '✅' : '❌'} HTTP ${res.status} ${page}`);
    } catch (e) {
      console.log(`[${i + 1}/31] ❌ ERR ${page}: ${e.message}`);
    }
  }
  console.log(`\nResult: ${passCount}/${pages.length} pages verified successfully!`);
}
testPages();
