import { chromium } from 'playwright-core';

async function inspect() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/payment');
  await page.click('button:has-text("Proceed to Pay")');
  await page.waitForSelector('iframe.razorpay-checkout-frame', { state: 'attached' });
  await page.waitForTimeout(4000);
  const frame = page.frameLocator('iframe.razorpay-checkout-frame');

  const buttons = await frame.locator('button').all();
  console.log(`Found ${buttons.length} buttons in frame:`);
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].innerText().catch(() => '');
    const aria = await buttons[i].getAttribute('aria-label').catch(() => '');
    const testid = await buttons[i].getAttribute('data-testid').catch(() => '');
    const cls = await buttons[i].getAttribute('class').catch(() => '');
    console.log(`[${i}] text: "${text}", aria: "${aria}", testid: "${testid}", class: "${cls?.slice(0, 30)}"`);
  }

  const inputs = await frame.locator('input').all();
  console.log(`\nFound ${inputs.length} inputs in frame:`);
  for (let j = 0; j < inputs.length; j++) {
    const name = await inputs[j].getAttribute('name').catch(() => '');
    const placeholder = await inputs[j].getAttribute('placeholder').catch(() => '');
    const type = await inputs[j].getAttribute('type').catch(() => '');
    const testid = await inputs[j].getAttribute('data-testid').catch(() => '');
    console.log(`[${j}] name: "${name}", placeholder: "${placeholder}", type: "${type}", testid: "${testid}"`);
  }

  await browser.close();
}

inspect().catch(console.error);
