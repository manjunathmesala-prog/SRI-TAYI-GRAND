import { chromium } from 'playwright-core';

async function testCheckout() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const page = await browser.newPage();
  console.log('Navigating to http://localhost:3000/payment...');
  await page.goto('http://localhost:3000/payment', { waitUntil: 'networkidle' });

  console.log('Clicking Proceed to Pay...');
  await page.click('button:has-text("Proceed to Pay")');

  console.log('Waiting for razorpay iframe to attach...');
  const frameElement = await page.waitForSelector('iframe.razorpay-checkout-frame', {
    state: 'attached',
    timeout: 20000,
  });

  const src = await frameElement.getAttribute('src');
  console.log('Razorpay Iframe SRC found:', src?.substring(0, 80) + '...');

  // Wait a few seconds for the modal content to fully render
  await page.waitForTimeout(5000);

  // Take screenshot of the page with the modal
  await page.screenshot({ path: 'scratch/payment-modal-visible.png' });
  console.log('Saved screenshot to scratch/payment-modal-visible.png');

  await browser.close();
  console.log('Test completed successfully.');
}

testCheckout().catch(console.error);
