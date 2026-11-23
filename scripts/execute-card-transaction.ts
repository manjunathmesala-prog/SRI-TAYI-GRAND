import { chromium } from 'playwright-core';
import * as fs from 'fs';

async function executeCardTransaction() {
  console.log('🚀 Executing Transaction 1: Test Card...');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/payment', { waitUntil: 'networkidle' });

  // Set ₹500
  await page.fill('input[type="number"]', '500');

  // Click Proceed to Pay
  await page.click('button:has-text("Proceed to Pay")');

  // Wait for iframe
  await page.waitForSelector('iframe.razorpay-checkout-frame', { state: 'attached', timeout: 20000 });
  const frame = page.frameLocator('iframe.razorpay-checkout-frame');

  await page.waitForTimeout(3000);

  // If "Contact details" popup appears, enter mobile number and click Continue
  try {
    const phoneInput = frame.locator('input[type="tel"]').or(frame.locator('input[placeholder*="Mobile"]')).first();
    if (await phoneInput.isVisible({ timeout: 4000 })) {
      console.log('Filling contact phone number 9876543210...');
      await phoneInput.fill('9876543210');
      const continueBtn = frame.locator('button:has-text("Continue")').first();
      await continueBtn.click();
      console.log('Clicked Continue.');
      await page.waitForTimeout(2000);
    }
  } catch (e: any) {
    console.log('Contact modal bypassed or not present:', e.message);
  }

  // Click Cards option if not already on Cards
  try {
    const cardsTab = frame.locator('text=Cards').or(frame.locator('text=Card')).first();
    if (await cardsTab.isVisible({ timeout: 3000 })) {
      await cardsTab.click();
      console.log('Selected Cards tab.');
      await page.waitForTimeout(1000);
    }
  } catch {}

  // Fill Card details
  console.log('Filling Test Card details: 4100 2800 0000 1007, 12/26, 123...');
  const cardNumInput = frame.locator('input[name="card[number]"]').or(frame.locator('input[placeholder*="Card Number"]')).or(frame.locator('#card_number')).first();
  await cardNumInput.fill('4100280000001007');

  const expiryInput = frame.locator('input[name="card[expiry]"]').or(frame.locator('input[placeholder*="MM / YY"]')).or(frame.locator('#card_expiry')).first();
  await expiryInput.fill('12/26');

  const cvvInput = frame.locator('input[name="card[cvv]"]').or(frame.locator('input[placeholder*="CVV"]')).or(frame.locator('#card_cvv')).first();
  await cvvInput.fill('123');

  await page.screenshot({ path: 'scratch/card-filled.png' });
  console.log('Saved scratch/card-filled.png');

  // Click Pay button inside iframe
  const payButton = frame.locator('button:has-text("Pay")').first();
  console.log('Clicking Pay button inside Razorpay modal...');
  await payButton.click();

  // Wait for OTP page or confirmation
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'scratch/card-after-pay.png' });

  // Handle OTP simulation if an OTP iframe or button appears
  try {
    // Check for "Submit" or "Success" button in OTP frame or main frame
    const otpSubmit = page.locator('button:has-text("Submit"), button:has-text("Success")').or(frame.locator('button:has-text("Submit"), button:has-text("Success")')).first();
    if (await otpSubmit.isVisible({ timeout: 5000 })) {
      console.log('Found OTP confirmation button, clicking...');
      await otpSubmit.click();
    }
  } catch {}

  // Wait for success panel on the main page
  console.log('Waiting for payment confirmation panel on main page...');
  const successPanel = page.locator('text=Razorpay Payment Verified & Confirmed!');
  await successPanel.waitFor({ state: 'visible', timeout: 25000 });
  console.log('✅ Payment verified banner visible on page!');

  await page.screenshot({ path: 'scratch/card-payment-success.png' });

  // Extract payment details from page
  const paymentId = await page.locator('text=Payment ID >> xpath=.. >> span.font-semibold').textContent();
  const orderId = await page.locator('text=Order ID >> xpath=.. >> span.font-semibold').textContent();

  console.log('Transaction 1 Details:', { paymentId, orderId });

  await browser.close();
  return { paymentId, orderId };
}

executeCardTransaction().then((res) => {
  console.log('🎉 TRANSACTION 1 COMPLETE:', res);
  process.exit(0);
}).catch((err) => {
  console.error('❌ Transaction 1 error:', err);
  process.exit(1);
});
