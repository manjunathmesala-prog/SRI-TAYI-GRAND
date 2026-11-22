const { chromium } = require('playwright-core');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EVIDENCE_DIR = path.join(__dirname, '..', 'qa', 'evidence', 'rfid-qa-audit');

async function capture() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  });

  const page = await context.newPage();

  // Login as Sagar
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'sagar@sritayigrand.com');
  await page.fill('input[type="password"]', 'GrandHotel@Kadiri2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

  // Go to /admin/rfid
  await page.goto(`${BASE_URL}/admin/rfid`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Cards table view
  const cardsTab = page.locator('button:has-text("Keycards"), button:has-text("Cards")').first();
  if (await cardsTab.isVisible()) {
    await cardsTab.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '06_rfid_card_management_table.png') });
  }

  // Logs table view
  const logsTab = page.locator('button:has-text("Audit Logs"), button:has-text("Logs")').first();
  if (await logsTab.isVisible()) {
    await logsTab.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '07_rfid_audit_logs_grid.png') });
  }

  // Hardware diagnostics view
  const hwTab = page.locator('button:has-text("Hardware"), button:has-text("Bridge")').first();
  if (await hwTab.isVisible()) {
    await hwTab.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '08_rfid_hardware_reader_tab.png') });
  }

  // Open Issue Customer Card modal
  const rolesTab = page.locator('button:has-text("Role Cards"), button:has-text("Roles")').first();
  if (await rolesTab.isVisible()) {
    await rolesTab.click();
    await page.waitForTimeout(400);
  }

  const issueCustBtn = page.locator('button:has-text("+ Issue Customer Card"), button:has-text("Issue Customer Card")').first();
  if (await issueCustBtn.isVisible()) {
    await issueCustBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '09_rfid_issue_customer_card_modal.png') });
    const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
    await page.waitForTimeout(300);
  }

  // Open Super Admin Card modal
  const saBtn = page.locator('button:has-text("+ Super Admin Card"), button:has-text("Super Admin Card")').first();
  if (await saBtn.isVisible()) {
    await saBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '10_rfid_superadmin_card_modal.png') });
    const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
    await page.waitForTimeout(300);
  }

  // Open Cleaner Card modal
  const clnBtn = page.locator('button:has-text("+ Cleaner Card"), button:has-text("Cleaner Card")').first();
  if (await clnBtn.isVisible()) {
    await clnBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '11_rfid_cleaner_card_modal.png') });
  }

  await browser.close();
  console.log('Additional screenshots captured successfully!');
}

capture().catch(console.error);
