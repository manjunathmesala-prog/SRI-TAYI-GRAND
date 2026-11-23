import { chromium } from 'playwright-core';
import * as fs from 'fs';
import Razorpay from 'razorpay';

// Load .env.local
if (fs.existsSync('.env.local')) {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_U3aO08c0MEmri7';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'tsYd09xbAxvYpjEp8B3Tnv9z';
const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

async function runTwoTransactions() {
  console.log('===============================================================');
  console.log('🚀 EXECUTING 2 REAL RAZORPAY TEST TRANSACTIONS');
  console.log('===============================================================\n');
  console.log(`Merchant Key ID: ${keyId}`);

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const results: any[] = [];

  // ===========================================================================
  // TRANSACTION 1: TEST CARD (4100 2800 0000 1007)
  // ===========================================================================
  console.log('\n---------------------------------------------------------------');
  console.log('💳 TRANSACTION 1: TEST CARD (₹500.00)');
  console.log('   Card: 4100 2800 0000 1007 | Expiry: 12/26 | CVV: 123');
  console.log('---------------------------------------------------------------');

  await page.goto('http://localhost:3000/payment', { waitUntil: 'networkidle' });
  console.log('Loaded /payment page.');

  // Set customer details
  await page.fill('input[type="number"]', '500');
  console.log('Amount set to ₹500.');

  // Click Proceed to Pay
  const payBtn = page.locator('button:has-text("Proceed to Pay")');
  await payBtn.click();
  console.log('Clicked "Proceed to Pay". Waiting for Razorpay modal...');

  // Wait for Razorpay frame
  await page.waitForSelector('iframe.razorpay-checkout-frame', { timeout: 15000 });
  console.log('Razorpay checkout iframe detected.');

  const rzpFrame = page.frameLocator('iframe.razorpay-checkout-frame');
  await page.waitForTimeout(2000);

  // Take a screenshot of the modal to verify visual state
  await page.screenshot({ path: 'scratch/razorpay-modal-1.png' });

  // Inside the iframe, let's see available selectors
  // Razorpay standard checkout usually has Card, UPI, etc.
  try {
    // If contact/email screen is shown first or directly methods
    const cardOption = rzpFrame.locator('text=Card').or(rzpFrame.locator('[data-testid="card"]')).first();
    if (await cardOption.isVisible({ timeout: 5000 })) {
      await cardOption.click();
      console.log('Selected Card payment method.');
      await page.waitForTimeout(1000);
    }
  } catch (e: any) {
    console.log('Card option selector note:', e.message);
  }

  // Let's dump the frame HTML or interact
  const frameContent = await rzpFrame.locator('body').innerHTML();
  fs.writeFileSync('scratch/frame-content-1.html', frameContent);
  console.log('Saved frame DOM snapshot to scratch/frame-content-1.html');

  await browser.close();
}

runTwoTransactions().catch(console.error);
