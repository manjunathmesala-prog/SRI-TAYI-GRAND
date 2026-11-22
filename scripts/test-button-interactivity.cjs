const { chromium } = require('playwright-core');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testAllButtons() {
  console.log('\n================================================================');
  console.log('🔍 DEEP RUNTIME AUDIT: BUTTONS & INTERACTIVE FEATURES FOR MANAGER');
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

  const issues = [];
  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Ignore known favicon/analytics noise if any
      if (!txt.includes('favicon.ico')) {
        consoleErrors.push({ url: page.url(), text: txt });
      }
    }
  });

  page.on('response', res => {
    if (res.status() >= 400 && !res.url().includes('favicon.ico')) {
      networkFailures.push({
        url: res.url(),
        status: res.status(),
        page: page.url()
      });
    }
  });

  async function settle(ms = 1000) {
    await page.waitForTimeout(ms);
  }

  // 1. Authenticate as Hari Achari
  console.log('👉 [1] Authenticating as Manager Hari Achari...');
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await settle(1000);

  const hariBtn = page.locator('[data-testid="preset-hari"], div[role="button"]:has-text("Hari Achari")').first();
  await hariBtn.click();
  await settle(500);

  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();
  await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
  await settle(2000);

  const routesToTest = [
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Walk-In Counter', path: '/admin/walk-in' },
    { name: 'Bookings & Sales', path: '/admin/bookings' },
    { name: 'Room Categories', path: '/admin/rooms/categories' },
    { name: 'Convention Hall', path: '/admin/convention-hall' },
    { name: 'Staff Attendance', path: '/admin/staff/attendance' },
    { name: 'Operating Expenses', path: '/admin/expenses' },
    { name: 'Night Audit', path: '/admin/night-audit' },
    { name: 'Accounting ERP', path: '/admin/accounting' },
    { name: 'RFID Keycards', path: '/admin/rfid' }
  ];

  for (const route of routesToTest) {
    console.log(`\n🔎 Testing buttons and tabs on: ${route.name} (${route.path})...`);
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await settle(1500);

    // Get count of buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`   Found ${buttonCount} buttons on ${route.name}`);

    // Check specific critical buttons per page
    if (route.path === '/admin/dashboard') {
      // 1. Check refresh button
      const refreshBtn = page.locator('button[title*="Refresh"], button:has-text("Refresh")').first();
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
        await settle(800);
        console.log('   ✅ Refresh button clicked successfully');
      }
      // 2. Check Walk-In modal trigger
      const walkInBtn = page.locator('button:has-text("Walk-In")').first();
      if (await walkInBtn.isVisible()) {
        await walkInBtn.click();
        await settle(800);
        const modal = page.locator('div[role="dialog"], h2:has-text("Walk-In"), div:has-text("Registration")').first();
        const isOpen = await modal.isVisible().catch(() => false);
        console.log(`   ${isOpen ? '✅' : '⚠️'} Walk-In modal opened: ${isOpen}`);
        // Close modal if open
        const closeBtn = page.locator('button:has-text("Cancel"), button[aria-label="Close"], button:has(svg.lucide-x)').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await settle(500);
        }
      }
    }

    if (route.path === '/admin/staff/attendance') {
      // Check Clock In modal
      const clockInBtn = page.locator('button:has-text("Clock In"), button:has-text("Record Attendance")').first();
      if (await clockInBtn.isVisible()) {
        await clockInBtn.click();
        await settle(800);
        const modal = page.locator('div:has-text("Staff Member"), select, div[role="dialog"]').first();
        const isOpen = await modal.isVisible().catch(() => false);
        console.log(`   ${isOpen ? '✅' : '⚠️'} Clock-In modal opened: ${isOpen}`);
        const closeBtn = page.locator('button:has-text("Cancel")').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await settle(500);
        }
      }
    }

    if (route.path === '/admin/expenses') {
      // Check New Expense modal trigger
      const addExpenseBtn = page.locator('button:has-text("Add Expense"), button:has-text("Record Expense"), button:has-text("New Expense")').first();
      if (await addExpenseBtn.isVisible()) {
        await addExpenseBtn.click();
        await settle(800);
        const modal = page.locator('div[role="dialog"], input[placeholder*="Amount"], select').first();
        const isOpen = await modal.isVisible().catch(() => false);
        console.log(`   ${isOpen ? '✅' : '⚠️'} Record Expense modal opened: ${isOpen}`);
        const cancelBtn = page.locator('button:has-text("Cancel")').first();
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
          await settle(500);
        }
      }
    }

    if (route.path === '/admin/night-audit') {
      // Check Run Audit / Precheck buttons
      const precheckBtn = page.locator('button:has-text("Precheck"), button:has-text("Verify"), button:has-text("Run Precheck")').first();
      if (await precheckBtn.isVisible()) {
        console.log('   ✅ Night audit action button present');
      }
    }

    if (route.path === '/admin/convention-hall') {
      // Check booking / filter tabs
      const tabs = page.locator('button[role="tab"], button:has-text("All"), button:has-text("Calendar")');
      const tabCount = await tabs.count();
      console.log(`   ✅ Convention hall interactive tabs: ${tabCount}`);
    }

    if (route.path === '/admin/accounting') {
      // Check filters & export buttons
      const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download"), button:has-text("Filter")').first();
      if (await exportBtn.isVisible()) {
        console.log('   ✅ Accounting action controls present');
      }
    }

    if (route.path === '/admin/rfid') {
      // Check tab switches
      const hardwareTab = page.locator('button:has-text("Hardware"), button:has-text("Reader")').first();
      if (await hardwareTab.isVisible()) {
        await hardwareTab.click();
        await settle(800);
        console.log('   ✅ RFID Hardware Tab switched');
      }
      const cardsTab = page.locator('button:has-text("Active Cards"), button:has-text("Cards")').first();
      if (await cardsTab.isVisible()) {
        await cardsTab.click();
        await settle(800);
        console.log('   ✅ RFID Cards Tab switched');
      }
    }
  }

  await browser.close();

  console.log('\n================================================================');
  console.log('📊 RUNTIME BUTTON & INTERACTION AUDIT RESULTS:');
  console.log(`   Console Errors Detected: ${consoleErrors.length}`);
  console.log(`   Unexpected Network Errors: ${networkFailures.length}`);
  if (consoleErrors.length > 0) {
    console.log('   Console Errors:', consoleErrors);
  }
  if (networkFailures.length > 0) {
    console.log('   Network Failures:', networkFailures);
  }
  console.log('================================================================\n');
}

testAllButtons().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
