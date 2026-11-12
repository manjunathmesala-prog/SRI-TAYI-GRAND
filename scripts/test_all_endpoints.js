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

const endpoints = [
  '/api/admin/operations',
  '/api/admin/bookings',
  '/api/admin/payments',
  '/api/admin/expenses',
  '/api/admin/cashbook',
  '/api/admin/maintenance',
  '/api/admin/rooms',
  '/api/admin/rooms/categories',
  '/api/admin/guests',
  '/api/admin/housekeeping',
  '/api/admin/convention-hall',
  '/api/admin/enquiries',
  '/api/admin/reports?range=month',
  '/api/admin/accounting',
  '/api/admin/daily-closing',
  '/api/admin/staff/attendance',
  '/api/admin/staff',
  '/api/admin/pricing',
  '/api/admin/channels',
  '/api/reviews?all=true',
  '/api/admin/settings',
  '/api/admin/audit-logs',
  '/api/admin/walk-ins/queue',
];

async function runTests() {
  console.log('Testing all admin endpoints with valid Super Admin auth token...\n');
  for (const ep of endpoints) {
    try {
      const res = await fetch('http://localhost:3000' + ep, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'x-staff-role': 'Super Admin'
        }
      });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      
      let summary = '';
      if (json) {
        if (json.bookings) summary += `bookings: ${json.bookings.length} `;
        if (json.rooms) summary += `rooms: ${json.rooms.length} `;
        if (json.categories) summary += `categories: ${json.categories.length} `;
        if (json.payments) summary += `payments: ${json.payments.length} `;
        if (json.expenses) summary += `expenses: ${json.expenses.length} `;
        if (json.guests) summary += `guests: ${json.guests.length} `;
        if (json.tickets) summary += `tickets: ${json.tickets.length} `;
        if (json.enquiries) summary += `enquiries: ${json.enquiries.length} `;
        if (json.quotes) summary += `quotes: ${json.quotes.length} `;
        if (json.channels) summary += `channels: ${json.channels.length} `;
        if (json.rules) summary += `rules: ${json.rules.length} `;
        if (json.reviews) summary += `reviews: ${json.reviews.length} `;
        if (json.staff) summary += `staff: ${json.staff.length} `;
        if (json.attendance) summary += `attendance: ${json.attendance.length} `;
        if (json.glAccounts) summary += `glAccounts: ${json.glAccounts.length} `;
        if (json.journalEntries) summary += `journalEntries: ${json.journalEntries.length} `;
        if (json.logs) summary += `logs: ${json.logs.length} `;
        if (json.queue) summary += `queue: ${json.queue.length} `;
        if (json.settings) summary += `hotel: ${json.settings.hotel_name || json.settings.name} `;
        if (json.closing) summary += `today closing: ${json.closing.date || 'present'} `;
        if (!summary) summary = `keys: ${Object.keys(json).slice(0, 5).join(', ')}`;
      } else {
        summary = text.substring(0, 60).replace(/\n/g, ' ');
      }
      console.log(`${res.status === 200 ? '✅' : '❌'} [${res.status}] ${ep.padEnd(35)} -> ${summary}`);
    } catch (e) {
      console.log(`❌ [ERR] ${ep.padEnd(35)} -> ${e.message}`);
    }
  }
}
runTests();
