import crypto from 'crypto';
import * as fs from 'fs';

// Load .env.local into process.env before executing
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

import { POST as createOrderHandler } from '../src/app/api/create-order/route';
import { POST as verifyPaymentHandler } from '../src/app/api/verify-payment/route';
import { POST as razorpayCreateOrderHandler } from '../src/app/api/razorpay/create-order/route';
import { POST as razorpayVerifyPaymentHandler } from '../src/app/api/razorpay/verify-payment/route';

async function runRazorpayStandardCheckoutTests() {
  console.log('====================================================');
  console.log('💳 SRI TAYI GRAND - RAZORPAY STANDARD CHECKOUT E2E TEST');
  console.log('====================================================\n');

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const keyId = process.env.RAZORPAY_KEY_ID;
  console.log(`Configured Key ID: ${keyId}`);
  console.log(`Secret configured: ${Boolean(keySecret)}`);

  // ---------------------------------------------------------------------------
  // TEST 1: POST /api/create-order - Valid Order Creation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 1: POST /api/create-order (Valid Order: 50,000 paise = ₹500.00) ---');
  const validOrderReq = new Request('http://localhost:3000/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 50000, // 50000 paise = ₹500.00
      currency: 'INR',
      receipt: `rcpt_test_${Date.now()}`,
      notes: {
        customer_name: 'Test Customer',
        room: 'Deluxe Suite',
      },
    }),
  });

  const orderRes = await createOrderHandler(validOrderReq);
  const orderData = await orderRes.json();
  console.log('Create Order Status:', orderRes.status);
  console.log('Create Order Response:', orderData);

  if (orderRes.status !== 200 || !orderData.order_id) {
    throw new Error(`Failed to create order. Status: ${orderRes.status}, Error: ${JSON.stringify(orderData)}`);
  }
  if (orderData.amount !== 50000) {
    throw new Error(`Expected amount 50000, got ${orderData.amount}`);
  }
  if (orderData.currency !== 'INR') {
    throw new Error(`Expected currency INR, got ${orderData.currency}`);
  }
  console.log('✅ TEST 1 PASSED: Order created successfully on live Razorpay API:', orderData.order_id);

  // ---------------------------------------------------------------------------
  // TEST 2: POST /api/create-order - Amount < 100 paise Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: POST /api/create-order (Amount < 100 paise rejection) ---');
  const underAmountReq = new Request('http://localhost:3000/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 50, // 50 paise is under minimum 100 paise
      currency: 'INR',
    }),
  });

  const underRes = await createOrderHandler(underAmountReq);
  const underData = await underRes.json();
  console.log('Under Amount Status:', underRes.status);
  console.log('Under Amount Response:', underData);

  if (underRes.status !== 400 || underData.success !== false) {
    throw new Error('Expected 400 Bad Request for amount < 100 paise!');
  }
  console.log('✅ TEST 2 PASSED: Minimum 100 paise validation enforced correctly.');

  // ---------------------------------------------------------------------------
  // TEST 3: POST /api/verify-payment - Cryptographic HMAC-SHA256 Valid Signature
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: POST /api/verify-payment (Valid Signature Verification) ---');
  const mockPaymentId = `pay_test_${Date.now()}`;
  const validSignature = crypto
    .createHmac('sha256', keySecret!)
    .update(`${orderData.order_id}|${mockPaymentId}`)
    .digest('hex');

  const validVerifyReq = new Request('http://localhost:3000/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: orderData.order_id,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: validSignature,
    }),
  });

  const verifyRes = await verifyPaymentHandler(validVerifyReq);
  const verifyData = await verifyRes.json();
  console.log('Verify Payment Status:', verifyRes.status);
  console.log('Verify Payment Response:', verifyData);

  if (verifyRes.status !== 200 || !verifyData.success) {
    throw new Error(`Expected 200 OK for valid signature, got status: ${verifyRes.status}`);
  }
  console.log('✅ TEST 3 PASSED: HMAC-SHA256 signature correctly verified.');

  // ---------------------------------------------------------------------------
  // TEST 4: POST /api/verify-payment - Cryptographic Signature Mismatch Rejection
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: POST /api/verify-payment (Signature Mismatch Rejection) ---');
  const fraudulentSignature = 'fraudulent_signature_hash_00000000000000000000000000000000';
  const invalidVerifyReq = new Request('http://localhost:3000/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: orderData.order_id,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: fraudulentSignature,
    }),
  });

  const invalidRes = await verifyPaymentHandler(invalidVerifyReq);
  const invalidData = await invalidRes.json();
  console.log('Invalid Signature Status:', invalidRes.status);
  console.log('Invalid Signature Response:', invalidData);

  if (invalidRes.status !== 400 || invalidData.success !== false) {
    throw new Error('Expected 400 Bad Request for mismatched signature!');
  }
  console.log('✅ TEST 4 PASSED: Signature mismatch rejected with HTTP 400.');

  // ---------------------------------------------------------------------------
  // TEST 5: POST /api/verify-payment - Missing Fields Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: POST /api/verify-payment (Missing fields rejection) ---');
  const missingReq = new Request('http://localhost:3000/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: orderData.order_id,
      // missing payment_id and signature
    }),
  });

  const missingRes = await verifyPaymentHandler(missingReq);
  const missingData = await missingRes.json();
  console.log('Missing Fields Status:', missingRes.status);
  console.log('Missing Fields Response:', missingData);

  if (missingRes.status !== 400 || missingData.success !== false) {
    throw new Error('Expected 400 Bad Request for missing fields!');
  }
  console.log('✅ TEST 5 PASSED: Missing fields rejected with HTTP 400.');

  // ---------------------------------------------------------------------------
  // TEST 6: Compatibility test with /api/razorpay/create-order & verify
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Compatibility test with /api/razorpay/create-order ---');
  const compatReq = new Request('http://localhost:3000/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 180000, // 180000 paise = ₹1800.00
      receipt: `rcpt_compat_${Date.now()}`,
    }),
  });

  const compatRes = await razorpayCreateOrderHandler(compatReq);
  const compatData = await compatRes.json();
  console.log('Compat Order Status:', compatRes.status);
  console.log('Compat Order Response:', compatData);

  if (compatRes.status !== 200 || !compatData.order_id) {
    throw new Error('Compatibility order creation failed!');
  }
  console.log('✅ TEST 6 PASSED: Compatibility routes operating seamlessly.');

  console.log('\n====================================================');
  console.log('🎉 ALL 6 RAZORPAY STANDARD CHECKOUT TESTS PASSED!');
  console.log('====================================================\n');
}

runRazorpayStandardCheckoutTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ TEST SUITE FAILED:', err);
    process.exit(1);
  });
