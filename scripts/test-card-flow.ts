import { chromium } from 'playwright-core';

async function testCardFlow() {
  console.log('🚀 Starting Test Card Flow automation...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/payment');

  await page.fill('input[type="number"]', '500');
  await page.click('button:has-text("Proceed to Pay")');

  await page.waitForSelector('iframe.razorpay-checkout-frame', { state: 'attached' });
  await page.waitForTimeout(3000);
  const frame = page.frameLocator('iframe.razorpay-checkout-frame');

  // Handle contact popup if present
  try {
    const contactInput = frame.locator('input[data-testid="contactNumber"]');
    if (await contactInput.isVisible({ timeout: 4000 })) {
      console.log('Entering contact number 9876543210...');
      await contactInput.click();
      await contactInput.pressSequentially('9876543210', { delay: 50 });
      await page.waitForTimeout(500);

      const continueBtn = frame.locator('button:has-text("Continue")').last();
      await continueBtn.click();
      console.log('Clicked Continue.');
      await page.waitForTimeout(2000);
    }
  } catch (err: any) {
    console.log('Contact modal handling note:', err.message);
  }

  // Fill Card details
  console.log('Entering card details...');
  const cardNum = frame.locator('input[name="card.number"]');
  await cardNum.click();
  await cardNum.pressSequentially('4100280000001007', { delay: 40 });

  const expiry = frame.locator('input[name="card.expiry"]');
  await expiry.click();
  await expiry.pressSequentially('1226', { delay: 40 });

  const cvv = frame.locator('input[name="card.cvv"]');
  await cvv.click();
  await cvv.pressSequentially('123', { delay: 40 });

  await page.screenshot({ path: 'scratch/card-entered-ready.png' });
  console.log('Card details entered. Saved scratch/card-entered-ready.png');

  // Find and click the Pay button
  const payBtn = frame.locator('button').filter({ hasText: /Pay/i }).first();
  console.log('Clicking Pay button:', await payBtn.innerText());
  await payBtn.click();

  // Wait 5 seconds for payment processing / OTP
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'scratch/after-card-pay.png' });
  console.log('Saved scratch/after-card-pay.png');

  // Check if test OTP bank page appeared (Razorpay test bank iframe or submit button)
  try {
    // Razorpay test card usually shows an OTP page with "Success" button or auto-approves
    const successBtn = page.locator('button:has-text("Success"), button:has-text("Submit")')
      .or(frame.locator('button:has-text("Success"), button:has-text("Submit")'))
      .first();
    if (await successBtn.isVisible({ timeout: 5000 })) {
      console.log('Found Test Bank OTP screen, clicking Success...');
      await successBtn.click();
    }
  } catch {}

  // Wait for success confirmation on main page
  console.log('Waiting for payment confirmation on main page...');
  const successNotice = page.locator('text=Razorpay Payment Verified & Confirmed!');
  await successNotice.waitFor({ state: 'visible', timeout: 20000 });
  console.log('🎉 SUCCESS! Payment verified on server!');

  await page.screenshot({ path: 'scratch/card-transaction-verified.png' });

  // Get details
  const textContent = await page.locator('main').innerText();
  console.log('\n--- PAGE CONFIRMATION OUTPUT ---');
  console.log(textContent.split('\n').filter(l => l.includes('pay_') || l.includes('order_') || l.includes('Verified')).join('\n'));

  await browser.close();
}

testCardFlow().catch(console.error);
