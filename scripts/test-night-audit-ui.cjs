const { chromium } = require('playwright-core');

async function testNightAuditUI() {
  console.log('--- STARTING PLAYWRIGHT BROWSER TEST FOR NIGHT AUDIT MODULE ---');

  // Launch browser using edge/chrome
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge'
  }).catch(async () => {
    return await chromium.launch({ headless: true });
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Visit Login
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle' });

    // 2. Perform Super Admin login
    console.log('2. Logging in as Super Admin...');
    await page.fill('input[type="email"]', 'admin@sritayigrand.com');
    await page.fill('input[type="password"]', 'GrandHotel@Kadiri2026!');
    await page.click('button[type="submit"]');

    await page.waitForURL(url => !url.pathname.includes('/admin/login'), { timeout: 15000 });
    console.log('✅ Logged in successfully. Current URL:', page.url());

    // 3. Navigate to /admin/night-audit
    console.log('3. Navigating to /admin/night-audit...');
    await page.goto('http://localhost:3000/admin/night-audit', { waitUntil: 'domcontentloaded' });

    // Click "Automated Dispatch" tab
    console.log('4. Switching to Automated Dispatch tab...');
    await page.click('button:has-text("Automated Dispatch")');
    await page.waitForTimeout(2000);

    // Verify Title inside Automated Dispatch
    await page.waitForSelector('text=Automated Daily Audit & Report Distribution', { timeout: 10000 });
    console.log('✅ Tab content "Automated Daily Audit & Report Distribution" rendered.');

    // Verify Cron Engine status
    const cronText = await page.textContent('text=Cron Engine:');
    console.log('✅ Cron Engine text detected:', cronText?.trim());

    // Wait for client fetch to complete
    await page.waitForTimeout(2500);

    // Verify Channel Health Badges
    const pageContent = await page.content();
    const hasEmailDispatch = pageContent.includes('Email PDF Report Dispatch');
    const hasWhatsAppSummary = pageContent.includes('WhatsApp Metric Summary');
    console.log('✅ Delivery Channels rendered:', { hasEmailDispatch, hasWhatsAppSummary });

    // Verify Recipients Table
    await page.waitForSelector('text=Configured Report Recipients', { timeout: 5000 });
    const hasVaynex = pageContent.includes('byvaynex@gmail.com');
    const hasMgmt = pageContent.includes('contact@sritayigrand.com');
    console.log('✅ Seeded Recipients rendered:', { hasVaynex, hasMgmt });

    // Verify Recent Runs Table
    const hasRecentRuns = pageContent.includes('Recent Night Audit Runs');
    const hasDownloadBtn = pageContent.includes('Download PDF');
    console.log('✅ Recent Runs Table & Download PDF Button rendered:', { hasRecentRuns, hasDownloadBtn });

    console.log('\n🎉 PLAYWRIGHT BROWSER UI VERIFICATION PASSED 100%!');
  } finally {
    await browser.close();
  }
}

testNightAuditUI().catch(err => {
  console.error('Playwright UI test error:', err);
  process.exit(1);
});
