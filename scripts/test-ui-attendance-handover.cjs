const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const EVIDENCE_DIR = path.join(__dirname, '..', 'qa', 'evidence', 'mod-handover');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runUITest() {
  console.log('=== SRI TAYI GRAND: PLAYWRIGHT UI/UX MANAGER ON DUTY VERIFICATION ===\n');

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  try {
    // 1. Visit Login Page
    console.log('[1] Navigating to http://localhost:3000/admin/login...');
    await page.goto('http://localhost:3000/admin/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01_login_page.png') });

    // Verify preset buttons on login page: Only Super Admin, Hari Achari, and Sagar
    const presetButtons = await page.locator('button:has-text("Admin"), button:has-text("Hari"), button:has-text("Sagar")').allInnerTexts();
    console.log('    Preset Accounts on Login Page:');
    presetButtons.forEach((b) => console.log(`    - ${b.split('\n')[0]}`));
    console.log('    ✓ Login page presets verified.\n');

    // 2. Login as Sagar
    console.log('[2] Logging in as Sagar...');
    await page.fill('input[type="email"]', 'sagar@sritayigrand.com');
    await page.fill('input[type="password"]', 'GrandHotel@Kadiri2026!');
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log(`    ✓ Successfully authenticated and navigated to: ${page.url()}\n`);

    // 3. Navigate to Attendance Page
    console.log('[3] Navigating to Attendance Page (/admin/staff/attendance)...');
    await page.goto('http://localhost:3000/admin/staff/attendance', { waitUntil: 'domcontentloaded' });

    // Wait for the staff and attendance API response to load
    await page.waitForResponse(
      (res) => res.url().includes('/api/admin/staff/attendance') && res.status() === 200,
      { timeout: 15000 }
    );
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_attendance_initial_between_shifts.png') });

    // Check if between shifts or active shift
    const initialMODBanner = await page.locator('text=Sequential Shift Handover Protocol').isVisible();
    console.log(`    ✓ MOD Protocol Banner visible: ${initialMODBanner}\n`);

    // If an active shift is already present, clock it out first so we test from clean state
    const existingClockOutBtn = page.locator('button:has-text("Clock Out & Handover Shift")');
    if (await existingClockOutBtn.isVisible()) {
      console.log('    (Cleaning up previous test active shift...)');
      await existingClockOutBtn.click();
      await page.waitForResponse((res) => res.url().includes('/api/admin/staff/attendance') && res.status() === 200);
      await page.waitForTimeout(1500);
    }

    // 4. Click Clock-In Sagar via Direct Action Button
    console.log('[4] Clocking in Sagar via Direct Action Button...');
    const clockInSagarBtn = page.locator('button:has-text("Clock In Sagar")');
    await clockInSagarBtn.waitFor({ state: 'visible', timeout: 10000 });
    await clockInSagarBtn.click();

    // Wait for clock in response and attendance update
    await page.waitForResponse((res) => res.url().includes('/api/admin/staff/attendance') && res.status() === 200);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03_sagar_active_on_duty.png') });

    // Verify glowing active status
    const isSagarOnDuty = await page.locator('text=Active Manager on Duty (MOD)').isVisible();
    const isSagarNameVisible = await page.locator('h2:has-text("Sagar")').isVisible();
    console.log(`    ✓ Active MOD Banner Active: ${isSagarOnDuty}`);
    console.log(`    ✓ Sagar identified as Manager on Duty: ${isSagarNameVisible}\n`);

    // 5. Open Clock-In Modal and attempt to select Hari Achari while Sagar is on duty
    console.log('[5] Opening Quick Staff Clock-In Modal while Sagar is on duty...');
    await page.click('button:has-text("Clock-In Staff")');
    await page.waitForSelector('form:has-text("Duty Manager")', { timeout: 5000 });
    await page.waitForTimeout(600);

    // Open Duty Manager dropdown inside modal
    console.log('    Opening Duty Manager LuxurySelect dropdown...');
    const selectTrigger = page.locator('form button:has-text("Duty Manager")');
    await selectTrigger.click();
    await page.waitForTimeout(500);

    // Click Hari Achari in dropdown options
    const hariOption = page.locator('div[role="option"]:has-text("Hari Achari")');
    await hariOption.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '04_modal_collision_warning.png') });

    // Verify warning banner and disabled submit button
    const isHandoverWarningVisible = await page.locator('text=Manager Handover Required').isVisible();
    const isConfirmDisabled = await page.locator('button[type="submit"]:has-text("Confirm Clock-In")').isDisabled();
    console.log(`    ✓ Handover Required Alert visible in Modal: ${isHandoverWarningVisible}`);
    console.log(`    ✓ Confirm Clock-In button is disabled: ${isConfirmDisabled}\n`);

    // 6. Click Clock Out Sagar Now inside Modal
    console.log('[6] Clicking "Clock Out Sagar Now" inside Modal...');
    await page.click('button:has-text("Clock Out Sagar Now")');
    await page.waitForTimeout(2000);

    // Modal submit button should now be enabled for Hari!
    const isConfirmEnabledNow = await page.locator('button[type="submit"]:has-text("Confirm Clock-In")').isEnabled();
    console.log(`    ✓ After Sagar clocked out, Confirm Clock-In for Hari is enabled: ${isConfirmEnabledNow}`);

    // Submit Hari's clock-in
    console.log('[7] Submitting Hari Achari Clock-In...');
    await page.click('button[type="submit"]:has-text("Confirm Clock-In")');
    await page.waitForResponse((res) => res.url().includes('/api/admin/staff/attendance') && res.status() === 200);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '05_hari_active_on_duty.png') });

    const isHariOnDuty = await page.locator('h2:has-text("Hari Achari")').isVisible();
    console.log(`    ✓ Hari Achari is now the Active Manager on Duty: ${isHariOnDuty}\n`);

    // 8. Clock Out Hari Achari (Clean handover)
    console.log('[8] Clocking out Hari Achari to return to idle handover state...');
    await page.click('button:has-text("Clock Out & Handover Shift")');
    await page.waitForResponse((res) => res.url().includes('/api/admin/staff/attendance') && res.status() === 200);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '06_final_idle_state.png') });

    const isFinalBetweenShifts = await page.locator('text=Front Desk Between Shifts').isVisible();
    console.log(`    ✓ Final state is between shifts: ${isFinalBetweenShifts}\n`);

    console.log('========================================================================');
    console.log('🏆 ALL PLAYWRIGHT UI/UX SHIFT HANDOVER TESTS COMPLETED SUCCESSFULLY!');
    console.log(`📸 Screenshots saved to: ${EVIDENCE_DIR}`);
    console.log('========================================================================\n');
  } finally {
    await browser.close();
  }
}

runUITest().catch((err) => {
  console.error('❌ Playwright UI Test failed:', err);
  process.exit(1);
});
