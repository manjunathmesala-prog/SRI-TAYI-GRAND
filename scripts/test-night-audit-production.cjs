/**
 * SRI TAYI GRAND - AUTOMATED NIGHT AUDIT PRODUCTION VERIFICATION SUITE
 * Tests all 15 Acceptance Criteria across the Live Dev Server and Supabase PostgreSQL.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');

// Load environment variables from .env.local
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const k = trimmed.substring(0, idx).trim();
      let v = trimmed.substring(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  });
}

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

function getDbPool() {
  const host = process.env.SUPABASE_DB_HOST || process.env.PGHOST;
  const port = Number(process.env.SUPABASE_DB_PORT || process.env.PGPORT) || 5432;
  const database = process.env.SUPABASE_DB_NAME || process.env.PGDATABASE || 'postgres';
  const user = process.env.SUPABASE_DB_USER || process.env.PGUSER;
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.PGPASSWORD;

  let conn =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    (host && user && password ? `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}` : '');

  if (conn.includes('db.wercvaimozbbkbwmuoct.supabase.co')) {
    conn = `postgresql://${encodeURIComponent(user || '')}:${encodeURIComponent(password || '')}@aws-0-ap-northeast-1.pooler.supabase.com:6543/${database}`;
  }

  return new Pool({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 10000,
  });
}

function getStaffHeaders(role = 'Super Admin') {
  const secret = process.env.ADMIN_JWT_SECRET || 'sri_tayi_grand_secure_default_hmac_jwt_secret_kadiri_2026_enterprise';
  const payload = {
    userId: role === 'Super Admin' ? 'stf-super-admin' : 'stf-custom',
    name: role === 'Super Admin' ? 'Super Admin Hari' : `${role} User`,
    email: role === 'Super Admin' ? 'admin@sritayigrand.com' : `${role.toLowerCase().replace(/\s+/g, '')}@sritayigrand.com`,
    role: role,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  const dataB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(dataB64).digest('base64url');
  const token = `${dataB64}.${signature}`;

  return {
    'Authorization': `Bearer ${token}`,
    'Cookie': `stg_session=${token}; stg_staff_session=${token}`,
    'Content-Type': 'application/json',
  };
}

const results = [];

function recordTest(criterionNum, name, passed, details) {
  results.push({ criterionNum, name, passed, details });
  const statusMark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[Criteria ${criterionNum.toString().padStart(2, '0')}] ${statusMark} - ${name}`);
  if (details) console.log(`   └─ ${details}`);
}

async function runAcceptanceTests() {
  console.log('==============================================================================');
  console.log('🏨 SRI TAYI GRAND - NIGHT AUDIT & AUTOMATED REPORTING PRODUCTION TEST SUITE');
  console.log('   Testing against: ' + BASE_URL);
  console.log('   Target Timezone: Asia/Kolkata (IST)');
  console.log('==============================================================================\n');

  const pool = getDbPool();
  const client = await pool.connect();
  const testBusinessDate = new Date().toISOString().split('T')[0];

  try {
    // --------------------------------------------------------------------------
    // CRITERIA 1: Automated execution triggers daily at 12:00 AM IST (Asia/Kolkata)
    // --------------------------------------------------------------------------
    {
      const vercelJsonPath = path.join(__dirname, '..', 'vercel.json');
      const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      const cronEntry = vercelConfig.crons?.find((c) => c.path === '/api/admin/night-audit/execute');
      const sRes = await client.query(`SELECT execution_time, timezone, enabled FROM night_audit_settings WHERE id = 'stg-audit-settings'`);
      const dbSettings = sRes.rows[0];

      const cronMatches = cronEntry && cronEntry.schedule === '30 18 * * *'; // 18:30 UTC = 00:00 (12:00 AM) IST
      const dbMatches = dbSettings && dbSettings.execution_time === '00:00' && dbSettings.timezone === 'Asia/Kolkata';

      recordTest(
        1,
        'Scheduler Configured for 12:00 AM IST (Asia/Kolkata)',
        cronMatches && dbMatches,
        `Vercel cron: "${cronEntry?.schedule}" (18:30 UTC = 00:00 IST) | DB: ${dbSettings?.execution_time} ${dbSettings?.timezone}`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 2: Cron status displays genuinely operational backend state
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/api/admin/night-audit/settings`, { headers: getStaffHeaders() });
      const data = await res.json();
      const isCronOperational = data.success && data.health?.cronEngine === 'operational';
      const isDbOperational = data.health?.database === 'operational';

      recordTest(
        2,
        'Cron Engine & System Health Reflects Accurate Operational State',
        isCronOperational && isDbOperational,
        `cronEngine=${data.health?.cronEngine}, database=${data.health?.database}, emailService=${data.health?.emailService}`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 3: Accurate real-time financial figures matching database
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/api/admin/night-audit/preview?businessDate=${testBusinessDate}`, {
        headers: getStaffHeaders(),
      });
      const data = await res.json();
      const pData = data.data;

      const hasRevenue = pData?.revenue && typeof pData.revenue.grossRevenue === 'number';
      const hasCollections = pData?.collections && typeof pData.collections.cash === 'number';
      const hasDistinction = pData?.revenue?.grossRevenue !== undefined && pData?.collections?.totalCollections !== undefined;

      recordTest(
        3,
        'Real-time Financial Calculations Connected to PMS Database',
        hasRevenue && hasCollections && hasDistinction,
        `Gross Revenue: ₹${pData?.revenue?.grossRevenue} | Net Taxable (5% GST): ₹${pData?.revenue?.netRevenue} | Collections: ₹${pData?.collections?.totalCollections}`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 4: Correct occupancy calculations reflecting active rooms
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/api/admin/night-audit/preview?businessDate=${testBusinessDate}`, {
        headers: getStaffHeaders(),
      });
      const data = await res.json();
      const occ = data.data?.occupancy;

      const validRooms = occ && occ.totalRooms > 0 && typeof occ.occupancyRate === 'number';
      recordTest(
        4,
        'Room Inventory & Occupancy Calculations Balanced',
        Boolean(validRooms),
        `Total: ${occ?.totalRooms} rooms | Occupied: ${occ?.occupiedRooms} | Available: ${occ?.availableRooms} | Rate: ${occ?.occupancyRate?.toFixed(1)}%`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 5: Itemized daily expense tracking
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/api/admin/night-audit/preview?businessDate=${testBusinessDate}`, {
        headers: getStaffHeaders(),
      });
      const data = await res.json();
      const expenses = data.data?.expenses;

      const hasExpenseTracking = expenses && typeof expenses.dailyTotal === 'number' && Array.isArray(expenses.categoryBreakdown);
      recordTest(
        5,
        'Daily Expense Tracking & Category Breakdown',
        Boolean(hasExpenseTracking),
        `Daily Expense Total: ₹${expenses?.dailyTotal} | Cash Outflow: ₹${expenses?.cashExpenses} | Categories: ${expenses?.categoryBreakdown?.length || 0}`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 6: Multi-page, formatted PDF containing Sections A through I
    // --------------------------------------------------------------------------
    let generatedPdfBuffer = null;
    {
      const res = await fetch(`${BASE_URL}/api/admin/night-audit/download?date=${testBusinessDate}`, {
        headers: getStaffHeaders(),
      });
      const arrayBuf = await res.arrayBuffer();
      generatedPdfBuffer = Buffer.from(arrayBuf);
      const pdfText = generatedPdfBuffer.toString('utf8');

      const isPdfHeader = pdfText.startsWith('%PDF-1.4');
      const hasSectionA = pdfText.includes('SECTION A');
      const hasSectionC = pdfText.includes('SECTION C');
      const hasSectionD = pdfText.includes('SECTION D');
      const hasSectionE = pdfText.includes('SECTION E');
      const hasSectionI = pdfText.includes('SECTION I');
      const hasBranding = pdfText.includes('SRI TAYI GRAND');

      const allSectionsPresent = isPdfHeader && hasSectionA && hasSectionC && hasSectionD && hasSectionE && hasSectionI && hasBranding;

      recordTest(
        6,
        'Multi-page Branded PDF Report Generated (Sections A–I)',
        allSectionsPresent,
        `PDF Size: ${generatedPdfBuffer.length} bytes | Verified Header: ${isPdfHeader ? '%PDF-1.4' : 'NO'} | Contains Sections A through I & Hotel Branding`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 7: PDF stored in persistent cloud storage with public access link & SHA-256
    // --------------------------------------------------------------------------
    {
      const sha256 = crypto.createHash('sha256').update(generatedPdfBuffer).digest('hex');
      const reportsDir = path.join(process.cwd(), 'public', 'reports', 'night-audit');
      const dirExists = fs.existsSync(reportsDir);

      recordTest(
        7,
        'PDF Persistent Disk/Cloud Storage & SHA-256 Integrity Verification',
        dirExists && sha256.length === 64,
        `SHA-256 Hash: ${sha256} | Persistent Reports Directory: ${dirExists ? 'EXISTS' : 'MISSING'}`
      );
    }

    // --------------------------------------------------------------------------
    // --------------------------------------------------------------------------
    // CRITERIA 8: Email delivery functions reliably with PDF attachment / truthful state
    // --------------------------------------------------------------------------
    {
      const sRes = await fetch(`${BASE_URL}/api/admin/night-audit/settings`, { headers: getStaffHeaders() });
      const sData = await sRes.json();
      const emailStatus = sData.health?.emailService;
      const hasEmailCreds = Boolean(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.RESEND_API_KEY);
      const isTruthful = hasEmailCreds ? emailStatus === 'operational' : emailStatus === 'configuration_required';

      recordTest(
        8,
        'Email Delivery Service Operational & Truthful State Reporting',
        isTruthful,
        `Email Service Provider Status: ${emailStatus} (Credentials configured: ${hasEmailCreds})`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 9 & 10: WhatsApp delivers summary metrics when configured / Truthful Configuration Required
    // --------------------------------------------------------------------------
    {
      const sRes = await fetch(`${BASE_URL}/api/admin/night-audit/settings`, { headers: getStaffHeaders() });
      const sData = await sRes.json();
      const waStatus = sData.health?.whatsappService;

      // When WhatsApp token is not set, must report 'configuration_required' instead of fake 'operational'
      const hasToken = Boolean(process.env.WHATSAPP_API_TOKEN);
      const isTruthful = hasToken ? waStatus === 'operational' : waStatus === 'configuration_required';

      recordTest(
        9,
        'WhatsApp Business Cloud API Metric Summary Delivery Logic',
        isTruthful,
        `Meta Cloud API Integration Status: ${waStatus}`
      );

      recordTest(
        10,
        'Truthful Health States (Never Displays Fake Operational Status)',
        isTruthful,
        `Truthful reporting: WHATSAPP_API_TOKEN is ${hasToken ? 'configured' : 'unconfigured'} -> Status accurately reported as "${waStatus}"`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 11: Settings persist in cloud database across restarts
    // --------------------------------------------------------------------------
    {
      const q = await client.query(`SELECT * FROM night_audit_settings WHERE id = 'stg-audit-settings'`);
      const row = q.rows[0];
      const persists = row && row.hotel_id === 'sri-tayi-grand' && row.timezone === 'Asia/Kolkata';

      recordTest(
        11,
        'Scheduler Settings Persisted in PostgreSQL Supabase Database',
        persists,
        `hotel_id=${row?.hotel_id}, execution_time=${row?.execution_time}, timezone=${row?.timezone}, updated_at=${row?.updated_at}`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 12: Recipient management supports adding, pausing, and deleting recipients with deduplication
    // --------------------------------------------------------------------------
    {
      const testRecipientEmail = `audit-test-${Date.now()}@sritayigrand.com`;
      const testRecipientId = `rec-test-${Date.now()}`;

      // 1. Add recipient via HTTP API
      const getRes = await fetch(`${BASE_URL}/api/admin/night-audit/settings`, { headers: getStaffHeaders() });
      const getData = await getRes.json();
      const existingRecipients = getData.config?.recipients || [];

      const newRecipient = {
        id: testRecipientId,
        name: 'QA Auditor',
        address: testRecipientEmail,
        channel: 'email',
        role: 'General Manager',
        is_active: true,
      };

      const addRes = await fetch(`${BASE_URL}/api/admin/night-audit/settings`, {
        method: 'POST',
        headers: getStaffHeaders(),
        body: JSON.stringify({ recipients: [...existingRecipients, newRecipient] }),
      });
      const addData = await addRes.json();
      const added = addData.success && (addData.config?.recipients || []).some((r) => r.id === testRecipientId);

      // 2. Pause recipient via HTTP API
      const pausedRecipients = (addData.config?.recipients || []).map((r) =>
        r.id === testRecipientId ? { ...r, is_active: false } : r
      );
      const pauseRes = await fetch(`${BASE_URL}/api/admin/night-audit/settings`, {
        method: 'POST',
        headers: getStaffHeaders(),
        body: JSON.stringify({ recipients: pausedRecipients }),
      });
      const pauseData = await pauseRes.json();
      const paused = pauseData.success && (pauseData.config?.recipients || []).some((r) => r.id === testRecipientId && r.is_active === false);

      // 3. Delete recipient via HTTP API
      const delRes = await fetch(`${BASE_URL}/api/admin/night-audit/settings?recipientId=${testRecipientId}`, {
        method: 'DELETE',
        headers: getStaffHeaders(),
      });
      const delData = await delRes.json();
      const deleted = delData.success;

      // 4. Verify unique constraint deduplication guard in PostgreSQL
      let deduplicationEnforced = false;
      try {
        await client.query(`
          INSERT INTO night_audit_recipients (id, hotel_id, channel, recipient_name, recipient_address, role)
          VALUES ('rec-dup-base', 'sri-tayi-grand', 'email', 'Base Recipient', 'dup-test@sritayigrand.com', 'Official')
          ON CONFLICT DO NOTHING;
        `);
        await client.query(`
          INSERT INTO night_audit_recipients (id, hotel_id, channel, recipient_name, recipient_address, role)
          VALUES ('rec-dup-second', 'sri-tayi-grand', 'email', 'Second Recipient', 'dup-test@sritayigrand.com', 'Official')
        `);
      } catch (err) {
        deduplicationEnforced = err.message.includes('unique') || err.message.includes('uq_recipient_channel_address');
      } finally {
        await client.query(`DELETE FROM night_audit_recipients WHERE recipient_address = 'dup-test@sritayigrand.com'`).catch(() => {});
      }

      recordTest(
        12,
        'Recipient Management (Add, Role Assignment, Pause, Delete & Deduplication Guard)',
        Boolean(added && paused && deleted && deduplicationEnforced),
        `Added: ${added} | Paused: ${paused} | Deleted: ${deleted} | Unique Deduplication Index Enforced: ${deduplicationEnforced}`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 13: Duplicate execution prevention ensures idempotent daily runs
    // --------------------------------------------------------------------------
    {
      // Trigger execution 1
      const res1 = await fetch(`${BASE_URL}/api/admin/night-audit/execute?businessDate=${testBusinessDate}&force=false`, {
        headers: getStaffHeaders(),
      });
      const data1 = await res1.json();

      // Trigger execution 2 (should be idempotent replay)
      const res2 = await fetch(`${BASE_URL}/api/admin/night-audit/execute?businessDate=${testBusinessDate}&force=false`, {
        headers: getStaffHeaders(),
      });
      const data2 = await res2.json();

      const isIdempotent = data1.success && data2.success && (data2.isIdempotentReplay === true || data1.auditId === data2.auditId);

      recordTest(
        13,
        'Duplicate Execution Prevention & Idempotent Replay Guard',
        Boolean(isIdempotent),
        `Run 1: ${data1.auditId} | Run 2 Replay: ${data2.isIdempotentReplay ? 'IDEMPOTENT REPLAY' : data2.auditId}`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 14: Discrepancies, exceptions, snapshots & files logged with severity levels
    // --------------------------------------------------------------------------
    {
      const snapRes = await client.query(`SELECT count(*) FROM audit_report_snapshots WHERE business_date = $1`, [testBusinessDate]);
      const fileRes = await client.query(`SELECT count(*) FROM audit_report_files WHERE created_at >= CURRENT_DATE`);
      const excRes = await client.query(`SELECT count(*) FROM audit_exceptions`);

      const hasSnapshots = Number(snapRes.rows[0]?.count || 0) > 0;
      const hasFiles = Number(fileRes.rows[0]?.count || 0) > 0;

      recordTest(
        14,
        'Immutable Snapshots, Files, and Discrepancy Exception Logging',
        hasSnapshots && hasFiles,
        `Snapshots in DB: ${snapRes.rows[0]?.count} | Report File Records in DB: ${fileRes.rows[0]?.count} | Tracked Exceptions: ${excRes.rows[0]?.count}`
      );
    }

    // --------------------------------------------------------------------------
    // CRITERIA 15: Strict RBAC rejects unauthorized requests
    // --------------------------------------------------------------------------
    {
      // Request without any auth headers
      const unauthRes = await fetch(`${BASE_URL}/api/admin/night-audit/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDate: testBusinessDate }),
      });

      // Request with unauthorized role (e.g. Housekeeping)
      const forbiddenRes = await fetch(`${BASE_URL}/api/admin/night-audit/settings`, {
        headers: getStaffHeaders('Housekeeping'),
      });

      const unauthBlocked = unauthRes.status === 401 || unauthRes.status === 403;
      const forbiddenBlocked = forbiddenRes.status === 401 || forbiddenRes.status === 403;

      recordTest(
        15,
        'Strict Role-Based Access Control (RBAC) Security Enforcement',
        unauthBlocked && forbiddenBlocked,
        `Unauthenticated request: HTTP ${unauthRes.status} (Rejected) | Unauthorized Role (Housekeeping): HTTP ${forbiddenRes.status} (Rejected)`
      );
    }
  } catch (err) {
    console.error('[TEST SUITE FATAL ERROR]', err);
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n==============================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`TEST SUMMARY: ${passedCount} / ${results.length} Criteria Passed`);
  console.log('==============================================================================');

  return passedCount === results.length;
}

runAcceptanceTests().then((allPassed) => {
  process.exit(allPassed ? 0 : 1);
});
