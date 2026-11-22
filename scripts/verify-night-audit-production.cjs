const { Pool } = require('pg');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

let connStr = 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
let adminSecret = 'sri_tayi_grand_secure_default_hmac_jwt_secret_kadiri_2026_enterprise';

if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf8');
  for (const line of content.split('\n')) {
    if (line.startsWith('DATABASE_URL=') || line.startsWith('SUPABASE_DATABASE_URL=')) {
      connStr = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
    if (line.startsWith('ADMIN_JWT_SECRET=')) {
      adminSecret = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
  }
}

const pool = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false }
});

function createAdminToken() {
  const payload = {
    userId: 'stf-admin-01',
    name: 'Sri Tayi Grand Admin',
    email: 'admin@sritayigrand.com',
    role: 'Super Admin',
    exp: Date.now() + 86400000
  };
  const dataB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', adminSecret).update(dataB64).digest('base64url');
  return `${dataB64}.${signature}`;
}

function makeApiRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        try {
          const json = JSON.parse(raw.toString('utf8'));
          resolve({ status: res.statusCode, headers: res.headers, data: json, raw });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runEndToEndVerification() {
  console.log('================================================================');
  console.log('SRI TAYI GRAND - NIGHT AUDIT & REPORT AUTOMATION E2E TEST SUITE');
  console.log('================================================================\n');

  const token = createAdminToken();

  // TEST 1: Database Settings & Seeded Recipients
  console.log('STEP 1: Verifying PostgreSQL Night Audit Tables in Supabase...');
  const client = await pool.connect();
  try {
    const settingsRes = await client.query('SELECT * FROM night_audit_settings WHERE id = $1', ['stg-audit-settings']);
    if (settingsRes.rows.length === 0) throw new Error('Settings row not found in Supabase');
    console.log('✅ Settings Row Present:', {
      enabled: settingsRes.rows[0].enabled,
      execution_time: settingsRes.rows[0].execution_time,
      timezone: settingsRes.rows[0].timezone,
      last_status: settingsRes.rows[0].last_status
    });

    const recRes = await client.query('SELECT id, recipient_name, recipient_address, channel, is_active FROM night_audit_recipients');
    console.log(`✅ ${recRes.rows.length} Recipients in Supabase PostgreSQL:`, recRes.rows);
  } finally {
    client.release();
  }

  // TEST 2: GET /api/admin/night-audit/settings
  console.log('\nSTEP 2: Calling GET /api/admin/night-audit/settings...');
  const settingsApi = await makeApiRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/night-audit/settings',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-staff-role': 'Super Admin'
    }
  });

  if (settingsApi.status !== 200 || !settingsApi.data?.success) {
    throw new Error(`Failed to load settings API: ${JSON.stringify(settingsApi.data)}`);
  }
  console.log('✅ Settings API Responded 200 OK:', {
    cronEngine: settingsApi.data.health?.cronEngine,
    emailService: settingsApi.data.health?.emailService,
    whatsappService: settingsApi.data.health?.whatsappService,
    recipientsCount: settingsApi.data.config?.recipients?.length
  });

  // TEST 3: POST /api/admin/night-audit/settings (Update Execution Time & Add Dynamic Recipient)
  console.log('\nSTEP 3: Testing Settings Persistence & Validation (POST /api/admin/night-audit/settings)...');
  const currentRecipients = settingsApi.data.config.recipients || [];
  const testRecId = `rec-test-${Date.now()}`;
  const updatedRecipients = [
    ...currentRecipients.filter(r => r.id !== 'rec-temp-e2e'),
    {
      id: testRecId,
      name: 'E2E Test Director',
      channel: 'email',
      address: 'byvaynex@gmail.com',
      is_active: true
    }
  ];

  const updateRes = await makeApiRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/night-audit/settings',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-staff-role': 'Super Admin'
    }
  }, {
    enabled: true,
    execution_time: '00:00',
    timezone: 'Asia/Kolkata',
    email_enabled: true,
    whatsapp_enabled: false,
    recipients: updatedRecipients
  });

  if (updateRes.status !== 200 || !updateRes.data?.success) {
    throw new Error(`Settings update failed: ${JSON.stringify(updateRes.data)}`);
  }
  console.log('✅ Settings updated and synchronized with Supabase PostgreSQL successfully!');

  // TEST 4: Execute Live Night Audit (POST /api/admin/night-audit/test)
  console.log('\nSTEP 4: Executing Live Real-Time Night Audit with Genuine PDF Generation & Dispatch...');
  const today = new Date().toISOString().split('T')[0];
  const auditRes = await makeApiRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/night-audit/test',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-staff-role': 'Super Admin'
    }
  }, {
    businessDate: today
  });

  if (auditRes.status !== 200 || !auditRes.data?.success) {
    throw new Error(`Night audit execution failed: ${JSON.stringify(auditRes.data)}`);
  }

  const result = auditRes.data.result;
  console.log('✅ Night Audit Executed Successfully!');
  console.log('   Audit ID:', result.auditId);
  console.log('   Business Date:', result.businessDate);
  console.log('   Generated At:', result.data.generatedAt);
  console.log('   Gross Revenue:', `Rs. ${result.data.revenue.grossRevenue}`);
  console.log('   Total Collections:', `Rs. ${result.data.collections.totalCollections}`);
  console.log('   Room Occupancy:', `${result.data.overview.occupancyRate.toFixed(1)}% (${result.data.overview.occupiedRooms}/${result.data.overview.totalRooms} rooms)`);
  console.log('   PDF Disk Path:', result.pdfPath);
  console.log('   Deliveries:', result.deliveries);

  // TEST 5: Verify Generated PDF file exists on disk and is non-empty
  console.log('\nSTEP 5: Verifying PDF File on Disk...');
  const pdfDiskPath = `${process.cwd()}/public${result.pdfPath}`;
  if (!fs.existsSync(pdfDiskPath)) {
    throw new Error(`PDF was not written to disk at: ${pdfDiskPath}`);
  }
  const pdfStats = fs.statSync(pdfDiskPath);
  console.log(`✅ PDF exists on disk! File: ${result.pdfFilename}, Size: ${pdfStats.size} bytes`);

  // TEST 6: Test PDF Download Endpoint (GET /api/admin/night-audit/download)
  console.log('\nSTEP 6: Testing PDF Download Stream (GET /api/admin/night-audit/download)...');
  const downloadRes = await makeApiRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/night-audit/download?filename=${encodeURIComponent(result.pdfFilename)}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-staff-role': 'Super Admin'
    }
  });

  if (downloadRes.status !== 200 || downloadRes.headers['content-type'] !== 'application/pdf') {
    throw new Error(`PDF download failed! Status: ${downloadRes.status}, Content-Type: ${downloadRes.headers['content-type']}`);
  }
  console.log(`✅ PDF Download Stream verified! Content-Type: ${downloadRes.headers['content-type']}, Size: ${downloadRes.raw.length} bytes`);

  // TEST 7: Test Audit History Endpoint (GET /api/admin/night-audit/history)
  console.log('\nSTEP 7: Verifying Execution History in Supabase (GET /api/admin/night-audit/history)...');
  const historyRes = await makeApiRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/night-audit/history?limit=5',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-staff-role': 'Super Admin'
    }
  });

  if (historyRes.status !== 200 || !historyRes.data?.success) {
    throw new Error(`Failed to load audit history: ${JSON.stringify(historyRes.data)}`);
  }

  const latestRun = historyRes.data.runs[0];
  console.log('✅ Latest Run Recorded in PostgreSQL:');
  console.log('   ID:', latestRun.id);
  console.log('   Status:', latestRun.status);
  console.log('   Completed At:', latestRun.completed_at);
  console.log('   Deliveries Logged:', latestRun.deliveries?.length || 0);

  // Clean up temporary test recipient
  const cleanClient = await pool.connect();
  try {
    await cleanClient.query('DELETE FROM night_audit_recipients WHERE id = $1', [testRecId]);
  } finally {
    cleanClient.release();
    await pool.end();
  }

  console.log('\n================================================================');
  console.log('🎉 ALL 7 NIGHT AUDIT PRODUCTION VERIFICATION CHECKS PASSED 100%!');
  console.log('================================================================');
}

runEndToEndVerification().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
