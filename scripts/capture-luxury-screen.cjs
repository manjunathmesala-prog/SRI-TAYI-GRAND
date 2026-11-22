const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Meesala Chinna Sai\\.gemini\\antigravity\\brain\\1afb7600-7668-4749-9261-59ccef4eac68';

const pagesToCapture = [
  { name: 'luxury_dashboard', url: 'http://localhost:3000/admin/dashboard' },
  { name: 'luxury_front_desk', url: 'http://localhost:3000/admin/front-desk' },
  { name: 'luxury_rooms_board', url: 'http://localhost:3000/admin/rooms/board' },
  { name: 'luxury_housekeeping', url: 'http://localhost:3000/admin/housekeeping' },
  { name: 'luxury_rfid', url: 'http://localhost:3000/admin/rfid' },
  { name: 'luxury_bookings', url: 'http://localhost:3000/admin/bookings' },
];

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/admin/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Select Super Admin preset card if visible
    const superAdminCard = page.locator('div[role="button"]:has-text("Super Admin"), button:has-text("Select Account")').first();
    if (await superAdminCard.isVisible().catch(() => false)) {
      await superAdminCard.click().catch(() => {});
      await page.waitForTimeout(300);
    }
    
    await page.locator('#staff-email-input').fill('admin@sritayigrand.com');
    await page.locator('#staff-password-input').fill('SuperAdmin@TayiGrand2026!');
    await page.locator('button[type="submit"]').first().click();
    
    await page.waitForURL('**/admin/**', { timeout: 30000 });
    console.log('🎉 Successfully authenticated! Redirected to:', page.url());
    await page.waitForTimeout(2000);
    
    for (const item of pagesToCapture) {
      console.log(`Navigating to ${item.name}: ${item.url}...`);
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2500);
      
      const artifactPath = path.join(ARTIFACT_DIR, `${item.name}.png`);
      const publicPath = path.join(process.cwd(), 'public', 'qa-screenshots', `${item.name}.png`);
      
      await page.screenshot({ path: artifactPath });
      await page.screenshot({ path: publicPath });
      console.log(`✅ Saved ${item.name} screenshot.`);
    }
    
    console.log('🎉 All luxury page screenshots captured successfully!');
  } catch (err) {
    console.error('Error capturing screenshot:', err);
  } finally {
    await browser.close();
  }
})();
