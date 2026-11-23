const { chromium } = require('playwright-core');
const Razorpay = require('razorpay');

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_U3aO08c0MEmri7',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'tsYd09xbAxvYpjEp8B3Tnv9z',
});

async function runTransaction(browser, amountRupees, bankName, testNum) {
  console.log(`\n========================================`);
  console.log(`💳 EXECUTING TRANSACTION ${testNum}: ₹${amountRupees} via ${bankName}`);
  console.log(`========================================`);

  const context = await browser.newContext();
  const page = await context.newPage();

  let popupResolve;
  const popupPromise = new Promise(resolve => { popupResolve = resolve; });
  context.on('page', p => popupResolve(p));

  await page.goto('http://localhost:3000/payment');
  await page.waitForTimeout(1500);

  // Set amount
  const amountInput = page.locator('input[type="number"]');
  await amountInput.fill(String(amountRupees));
  await page.waitForTimeout(500);

  // Click Proceed to Pay
  console.log('Clicking "Proceed to Pay"...');
  await page.click('button:has-text("Proceed to Pay")');
  await page.waitForSelector('iframe.razorpay-checkout-frame', { timeout: 20000 });
  await page.waitForTimeout(3000);

  const frame = page.frameLocator('iframe.razorpay-checkout-frame');

  // Select Netbanking
  console.log('Selecting Netbanking...');
  await frame.locator('text=Netbanking').first().click();
  await page.waitForTimeout(1500);

  // Select Bank
  console.log(`Selecting ${bankName}...`);
  await frame.locator(`text=${bankName}`).first().click();

  // Wait for simulator popup
  console.log('Waiting for Bank Simulator popup...');
  const popup = await popupPromise;
  console.log('Popup connected!');

  // Wait for Success button inside popup
  const successBtn = popup.locator('button:has-text("Success"), input[value="Success"], .btn-success, a:has-text("Success")').first();
  await successBtn.waitFor({ state: 'visible', timeout: 25000 });
  await popup.screenshot({ path: `scratch/tx${testNum}-bank-simulator.png` });
  console.log(`Clicking "Success" button in bank simulator for TX ${testNum}...`);
  await successBtn.click();
  console.log('Clicked Success button in bank simulator!');

  // Wait on host page for confirmation
  console.log('Waiting for host page to complete verification & show confirmation...');
  const successBanner = page.locator('text=Razorpay Payment Verified & Confirmed!');
  await successBanner.waitFor({ state: 'visible', timeout: 35000 });

  await page.screenshot({ path: `scratch/tx${testNum}-completed.png` });
  console.log(`🎉 TRANSACTION ${testNum} COMPLETED SUCCESSFULLY!`);

  const mainText = await page.locator('main').innerText();
  const lines = mainText.split('\n').filter(l => l.includes('pay_') || l.includes('order_'));
  console.log('Payment details:', lines.join(' | '));

  await context.close();
  return lines;
}

async function main() {
  console.log('🚀 Launching automated execution of 2 live Razorpay test transactions...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    // Transaction 1: ₹500 via Bank of Baroda
    await runTransaction(browser, 500, 'Bank of Baroda', 1);

    // Wait 3 seconds between transactions
    await new Promise(r => setTimeout(r, 3000));

    // Transaction 2: ₹100 via Canara Bank
    await runTransaction(browser, 100, 'Canara Bank', 2);

    console.log('\n========================================');
    console.log('🔍 VERIFYING DIRECTLY VIA RAZORPAY API');
    console.log('========================================');
    const payments = await rzp.payments.all({ count: 10 });
    console.log(`Total live payments recorded in Razorpay account: ${payments.items.length}`);
    payments.items.slice(0, 5).forEach((p, idx) => {
      console.log(`[${idx + 1}] ID: ${p.id} | Amount: ₹${p.amount / 100} | Status: ${p.status} | Method: ${p.method} | Bank: ${p.bank || 'N/A'} | Contact: ${p.contact} | Created: ${new Date(p.created_at * 1000).toLocaleString()}`);
    });

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
