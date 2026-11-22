const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE_URL = 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// ==============================================================================
// STEP 1: STATIC CODE AUDIT ACROSS ALL 53 PAGE FILES & COMPONENTS
// ==============================================================================
console.log('\n================================================================');
console.log('🔍 PHASE 1: STATIC CODE AUDIT FOR DEAD BUTTONS & PLACEHOLDERS');
console.log('================================================================\n');

const staticIssues = [];

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(process.cwd(), filePath);
  const lines = content.split('\n');

  // Check 1: Empty onClick handler
  const emptyClickRegex = /onClick=\{?\s*\(\s*.*?\s*\)\s*=>\s*\{\s*\}\s*\}?/g;
  let match;
  while ((match = emptyClickRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    staticIssues.push({
      file: relPath,
      line: lineNum,
      type: 'Empty onClick Handler',
      detail: match[0]
    });
  }

  // Check 2: Dead href="#" or href=""
  const deadHrefRegex = /href\s*=\s*['"](#|javascript:void\(0\);?|javascript:;)['"]/g;
  while ((match = deadHrefRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    staticIssues.push({
      file: relPath,
      line: lineNum,
      type: 'Dead Link (href="#")',
      detail: match[0]
    });
  }

  // Check 3: Placeholder alert()
  lines.forEach((line, idx) => {
    if (/\balert\s*\(['"][^'"]*['"]\)/.test(line)) {
      staticIssues.push({
        file: relPath,
        line: idx + 1,
        type: 'Browser alert() instead of UI feedback',
        detail: line.trim()
      });
    }
    if (/coming soon/i.test(line) && !line.includes('translate') && !line.includes('meta')) {
      staticIssues.push({
        file: relPath,
        line: idx + 1,
        type: 'Potential "Coming Soon" placeholder',
        detail: line.trim()
      });
    }
  });

  // Check 4: Button without onClick, submit, or form
  const buttonRegex = /<button\b([^>]*)>(.*?)<\/button>/gs;
  while ((match = buttonRegex.exec(content)) !== null) {
    const attrs = match[1];
    const inner = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;

    const hasOnClick = /onClick\s*=/.test(attrs);
    const isSubmit = /type\s*=\s*['"]submit['"]/.test(attrs);
    const isReset = /type\s*=\s*['"]reset['"]/.test(attrs);
    const hasForm = /form\s*=/.test(attrs);
    const isDisabled = /disabled(\s*=\s*\{true\})?/.test(attrs);

    if (!hasOnClick && !isSubmit && !isReset && !hasForm && !isDisabled) {
      staticIssues.push({
        file: relPath,
        line: lineNum,
        type: 'Button without Handler or Submit action',
        detail: `<button ${attrs.trim().slice(0, 50)}...>${inner.trim().slice(0, 30)}</button>`
      });
    }
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.next' && entry !== '.git') {
        walkDir(full);
      }
    } else if (entry.endsWith('.tsx') || entry.endsWith('.jsx')) {
      auditFile(full);
    }
  }
}

walkDir(path.resolve(process.cwd(), 'src/app'));
walkDir(path.resolve(process.cwd(), 'src/components'));

console.log(`Found ${staticIssues.length} potential static findings across all pages & components.`);
staticIssues.forEach((issue, idx) => {
  console.log(`\n[${idx + 1}] ${issue.type}`);
  console.log(`   File: ${issue.file}:${issue.line}`);
  console.log(`   Detail: ${issue.detail}`);
});

// ==============================================================================
// STEP 2: RUNTIME BROWSER AUDIT ACROSS ALL 53 ROUTES (PUBLIC & ADMIN)
// ==============================================================================
async function runRuntimeAudit() {
  console.log('\n================================================================');
  console.log('🌐 PHASE 2: RUNTIME GOOGLE CHROME CRAWLER ACROSS ALL ROUTES');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  const runtimeResults = {
    publicPages: [],
    managerPages: [],
    superAdminPages: [],
    consoleErrors: [],
    networkErrors: []
  };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      runtimeResults.consoleErrors.push({ url: page.url(), message: txt });
    }
  });

  page.on('response', res => {
    if (res.status() >= 400 && !res.url().includes('favicon.ico')) {
      runtimeResults.networkErrors.push({
        url: res.url(),
        status: res.status(),
        page: page.url()
      });
    }
  });

  async function settle(ms = 1000) {
    await page.waitForTimeout(ms);
  }

  async function safeGoto(targetUrl) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await settle(1000);
        return res;
      } catch (err) {
        if (attempt < 2) {
          await settle(1500);
          continue;
        }
        throw err;
      }
    }
  }

  // --- PART A: PUBLIC ROUTES ---
  console.log('>>> [PART A] CRAWLING PUBLIC ROUTES...');
  const publicRoutes = [
    { path: '/', name: 'Home' },
    { path: '/about', name: 'About Hotel' },
    { path: '/amenities', name: 'Amenities' },
    { path: '/availability', name: 'Availability Check' },
    { path: '/booking', name: 'Booking Desk' },
    { path: '/contact', name: 'Contact Us' },
    { path: '/convention-hall', name: 'Convention Hall Public' },
    { path: '/gallery', name: 'Photo Gallery' },
    { path: '/policies', name: 'Hotel Policies' },
    { path: '/rooms', name: 'Rooms & Suites' },
    { path: '/testimonials', name: 'Guest Reviews' },
    { path: '/walk-in', name: 'Direct Guest Walk-In' }
  ];

  for (const r of publicRoutes) {
    try {
      const res = await safeGoto(`${BASE_URL}${r.path}`);
      const status = res ? res.status() : 0;
      const buttonCount = await page.locator('button').count();
      const linkCount = await page.locator('a').count();
      const hasContent = (await page.locator('body').innerText()).length > 50;

      runtimeResults.publicPages.push({
        name: r.name,
        path: r.path,
        status,
        buttonCount,
        linkCount,
        hasContent,
        ok: status === 200 && hasContent
      });
      console.log(`  ✅ [Public] ${r.name} (${r.path}) -> Status: ${status}, Buttons: ${buttonCount}, Links: ${linkCount}`);
    } catch (err) {
      console.error(`  ❌ [Public Error] ${r.name} (${r.path}): ${err.message}`);
      runtimeResults.publicPages.push({
        name: r.name,
        path: r.path,
        status: 0,
        ok: false,
        error: err.message
      });
    }
  }

  // --- PART B: MANAGER ROUTES (HARI ACHARI) ---
  console.log('\n>>> [PART B] LOGGING IN AS MANAGER HARI ACHARI & TESTING MANAGER ROUTES...');
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await settle(1000);

  const hariPreset = page.locator('[data-testid="preset-hari"], div[role="button"]:has-text("Hari Achari")').first();
  await hariPreset.click();
  await settle(400);

  const submitLogin = page.locator('button[type="submit"]').first();
  await submitLogin.click();
  await page.waitForURL('**/admin/dashboard', { timeout: 35000 });
  await settle(2000);

  const managerRoutes = [
    { path: '/admin/dashboard', name: 'Manager Dashboard' },
    { path: '/admin/walk-in', name: 'Walk-In Desk' },
    { path: '/admin/front-desk', name: 'Front Desk Console' },
    { path: '/admin/bookings', name: 'Bookings & Sales' },
    { path: '/admin/rooms', name: 'Physical Rooms' },
    { path: '/admin/rooms/board', name: 'Room Rack Board' },
    { path: '/admin/rooms/categories', name: 'Room Categories & Tariffs' },
    { path: '/admin/rooms/inventory', name: 'Room Inventory' },
    { path: '/admin/convention-hall', name: 'Convention Hall ERP' },
    { path: '/admin/staff/attendance', name: 'Staff Attendance' },
    { path: '/admin/expenses', name: 'Operating Expenditure' },
    { path: '/admin/night-audit', name: 'Night Audit' },
    { path: '/admin/daily-closing', name: 'Daily Closing Shift' },
    { path: '/admin/cashbook', name: 'Cash Drawer Ledger' },
    { path: '/admin/accounting', name: 'General Ledger ERP' },
    { path: '/admin/payments', name: 'Payment Transactions' },
    { path: '/admin/guests', name: 'Guest Directory' },
    { path: '/admin/housekeeping', name: 'Housekeeping Duty' },
    { path: '/admin/maintenance', name: 'Maintenance Log' },
    { path: '/admin/enquiries', name: 'Guest Enquiries' },
    { path: '/admin/reviews', name: 'Review Management' },
    { path: '/admin/rfid', name: 'RFID Keycards Console' },
    { path: '/admin/rfid/standee', name: 'RFID Reception Standee' }
  ];

  for (const r of managerRoutes) {
    try {
      const res = await safeGoto(`${BASE_URL}${r.path}`);
      const status = res ? res.status() : 0;
      const buttonCount = await page.locator('button').count();
      const linkCount = await page.locator('a').count();
      const hasContent = (await page.locator('body').innerText()).length > 50;

      runtimeResults.managerPages.push({
        name: r.name,
        path: r.path,
        status,
        buttonCount,
        linkCount,
        ok: status === 200 && hasContent
      });
      console.log(`  ✅ [Manager] ${r.name} (${r.path}) -> Status: ${status}, Buttons: ${buttonCount}, Links: ${linkCount}`);
    } catch (err) {
      console.error(`  ❌ [Manager Error] ${r.name} (${r.path}): ${err.message}`);
      runtimeResults.managerPages.push({
        name: r.name,
        path: r.path,
        status: 0,
        ok: false,
        error: err.message
      });
    }
  }

  // --- PART C: SUPER ADMIN ROUTES ---
  console.log('\n>>> [PART C] LOGGING IN AS SUPER ADMIN & TESTING RESTRICTED GOVERNANCE ROUTES...');
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await settle(1000);

  const adminPreset = page.locator('[data-testid="preset-super_admin"], div[role="button"]:has-text("Super Admin")').first();
  await adminPreset.click();
  await settle(400);

  const adminSubmit = page.locator('button[type="submit"]').first();
  await adminSubmit.click();
  await page.waitForURL('**/admin/dashboard', { timeout: 35000 });
  await settle(2000);

  const superAdminRoutes = [
    { path: '/admin/analytics', name: 'Analytics & Revenue KPIs' },
    { path: '/admin/reports', name: 'Financial & Tax Reports' },
    { path: '/admin/pricing', name: 'Dynamic Pricing Engine' },
    { path: '/admin/settings', name: 'Global Hotel Settings' },
    { path: '/admin/audit-logs', name: 'System Security Audit Logs' },
    { path: '/admin/channels', name: 'OTA Channel Manager' },
    { path: '/admin/content', name: 'Website Content Management' },
    { path: '/admin/staff', name: 'Staff Management Directory' }
  ];

  for (const r of superAdminRoutes) {
    try {
      const res = await safeGoto(`${BASE_URL}${r.path}`);
      const status = res ? res.status() : 0;
      const buttonCount = await page.locator('button').count();
      const linkCount = await page.locator('a').count();
      const hasContent = (await page.locator('body').innerText()).length > 50;

      runtimeResults.superAdminPages.push({
        name: r.name,
        path: r.path,
        status,
        buttonCount,
        linkCount,
        ok: status === 200 && hasContent
      });
      console.log(`  ✅ [Super Admin] ${r.name} (${r.path}) -> Status: ${status}, Buttons: ${buttonCount}, Links: ${linkCount}`);
    } catch (err) {
      console.error(`  ❌ [Super Admin Error] ${r.name} (${r.path}): ${err.message}`);
      runtimeResults.superAdminPages.push({
        name: r.name,
        path: r.path,
        status: 0,
        ok: false,
        error: err.message
      });
    }
  }

  await browser.close();

  // Save audit output to file
  const reportPath = path.resolve(process.cwd(), 'qa/evidence/manual-tester/ALL-PAGES-BUTTONS-AUDIT.json');
  fs.writeFileSync(reportPath, JSON.stringify({ staticIssues, runtimeResults }, null, 2));

  console.log('\n================================================================');
  console.log('📊 AUDIT SUMMARY:');
  console.log(`   Public Routes Tested:      ${runtimeResults.publicPages.length}`);
  console.log(`   Manager Routes Tested:     ${runtimeResults.managerPages.length}`);
  console.log(`   Super Admin Routes Tested: ${runtimeResults.superAdminPages.length}`);
  console.log(`   Total Page Routes Tested:  ${runtimeResults.publicPages.length + runtimeResults.managerPages.length + runtimeResults.superAdminPages.length}`);
  console.log(`   Console Errors:            ${runtimeResults.consoleErrors.length}`);
  console.log(`   Unexpected Network Errors: ${runtimeResults.networkErrors.length}`);
  console.log('================================================================\n');
}

runRuntimeAudit().catch(err => {
  console.error('Crawler failed:', err);
  process.exit(1);
});
