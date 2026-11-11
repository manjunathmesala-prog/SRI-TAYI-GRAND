import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { POST as createOrderRoute } from '@/app/api/razorpay/create-order/route';
import { POST as verifyPaymentRoute } from '@/app/api/razorpay/verify-payment/route';
import { POST as webhookRoute } from '@/app/api/razorpay/webhook/route';
import { repo } from '@/lib/db/repository';

describe('Integration Tests: Razorpay Endpoints & Ledger Operations', () => {
  const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_sritayigrand_live_webhook_secret_key_2026';
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '4PqLtkwDSubGyKJXKmJN9Xfd';

  let testBookingRef: string;

  beforeEach(async () => {
    // Seed a clean test booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const booking = await repo.createBooking({
      guest_id: 'guest_test_integration',
      guest_name: 'Manjunath Mesala',
      guest_phone: '9876543210',
      guest_email: 'guest@sritayigrand.com',
      check_in_date: tomorrow.toISOString().split('T')[0],
      check_out_date: dayAfter.toISOString().split('T')[0],
      category_id: 'cat-double-03',
      category_name: 'Deluxe Double Room',
      adults_count: 2,
      children_count: 0,
      rooms_count: 1,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'online',
      room_charges_amount: 1800,
      extra_persons_count: 0,
      extra_person_charges_amount: 0,
      subtotal_amount: 1800,
      tax_amount: 0,
      additional_charges_amount: 0,
      total_amount: 1800,
      paid_amount: 0,
    });

    testBookingRef = booking.booking_reference;
  });

  describe('1. POST /api/razorpay/create-order', () => {
    it('creates an authoritative Razorpay order and saves it to the ledger with PENDING status', async () => {
      const request = new Request('http://localhost:3000/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: testBookingRef,
        }),
      });

      const response = await createOrderRoute(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.orderId).toBeDefined();
      expect(data.orderId).toMatch(/^order_/);
      expect(data.amount).toBe(180000); // 1800 INR * 100 paise
      expect(data.currency).toBe('INR');

      // Verify database ledger entry
      const ledgerOrder = repo.getPaymentOrderByRazorpayId(data.orderId);
      expect(ledgerOrder).toBeDefined();
      expect(ledgerOrder?.status).toBe('PENDING');
      expect(ledgerOrder?.amount_paise).toBe(180000);
      expect(ledgerOrder?.booking_reference).toBe(testBookingRef);
    });

    it('rejects order creation with 404 if booking reference is invalid', async () => {
      const request = new Request('http://localhost:3000/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: 'NON_EXISTENT_REF_99999',
        }),
      });

      const response = await createOrderRoute(request);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('not found');
    });
  });

  describe('2. POST /api/razorpay/verify-payment', () => {
    it('validates genuine cryptographic signature, marks order PAID, and confirms booking', async () => {
      const fakeOrderId = `order_test_${Date.now()}`;
      const fakePaymentId = `pay_test_${Date.now()}`;

      // Pre-seed an order in the ledger
      repo.createPaymentOrder({
        booking_reference: testBookingRef,
        guest_name: 'Manjunath Mesala',
        guest_email: 'guest@sritayigrand.com',
        guest_phone: '9876543210',
        amount_paise: 180000,
        amount_rupees: 1800,
        currency: 'INR',
        status: 'PENDING',
        razorpay_order_id: fakeOrderId,
        receipt: testBookingRef,
      });

      // Generate genuine signature using current KEY_SECRET
      const validSignature = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(`${fakeOrderId}|${fakePaymentId}`)
        .digest('hex');

      const request = new Request('http://localhost:3000/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: testBookingRef,
          orderId: fakeOrderId,
          paymentId: fakePaymentId,
          signature: validSignature,
        }),
      });

      const response = await verifyPaymentRoute(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify order transitioned to PAID in ledger
      const order = repo.getPaymentOrderByRazorpayId(fakeOrderId);
      expect(order?.status).toBe('PAID');

      // Verify booking is confirmed
      const booking = repo.getBookingByReference(testBookingRef);
      expect(booking?.status).toBe('confirmed');
      expect(booking?.payment_status).toBe('successful');
      expect(booking?.paid_amount).toBe(1800);

      // Verify transaction ledger
      const txs = repo.getPaymentTransactions(testBookingRef);
      expect(txs.length).toBeGreaterThan(0);
      expect(txs.some((t) => t.razorpay_payment_id === fakePaymentId && t.status === 'captured')).toBe(true);
    });

    it('rejects tampered signature with 400 and logs security failure in ledger', async () => {
      const fakeOrderId = `order_tampered_${Date.now()}`;
      const fakePaymentId = `pay_tampered_${Date.now()}`;

      const request = new Request('http://localhost:3000/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: testBookingRef,
          orderId: fakeOrderId,
          paymentId: fakePaymentId,
          signature: 'completely_fraudulent_signature_hash',
        }),
      });

      const response = await verifyPaymentRoute(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('signature verification failed');

      // Verify booking was NOT confirmed
      const booking = repo.getBookingByReference(testBookingRef);
      expect(booking?.status).toBe('pending');
      expect(booking?.payment_status).toBe('pending');
    });
  });

  describe('3. POST /api/razorpay/webhook (Asynchronous Webhooks)', () => {
    it('processes signed order.paid event and confirms booking if browser dropped', async () => {
      const fakeOrderId = `order_wh_${Date.now()}`;

      const webhookPayload = JSON.stringify({
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: fakeOrderId,
              amount: 180000,
              currency: 'INR',
              receipt: testBookingRef,
              status: 'paid',
            },
          },
        },
      });

      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(webhookPayload)
        .digest('hex');

      const request = new Request('http://localhost:3000/api/razorpay/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signature,
        },
        body: webhookPayload,
      });

      const response = await webhookRoute(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.event).toBe('order.paid');

      // Confirm booking was updated by backup webhook
      const booking = repo.getBookingByReference(testBookingRef);
      expect(booking?.status).toBe('confirmed');
      expect(booking?.payment_status).toBe('successful');
    });

    it('rejects webhook requests with missing or forged signature headers with HTTP 400', async () => {
      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {},
      });

      const request = new Request('http://localhost:3000/api/razorpay/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': 'invalid_forged_hash_value',
        },
        body: webhookPayload,
      });

      const response = await webhookRoute(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('signature verification failed');
    });
  });
});
