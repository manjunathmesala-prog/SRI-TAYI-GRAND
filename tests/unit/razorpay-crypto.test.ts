import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  inrToPaise,
  paiseToInr,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '@/lib/razorpay';

describe('Unit Tests: Razorpay Financial & Cryptographic Pipeline', () => {
  const TEST_SECRET = '4PqLtkwDSubGyKJXKmJN9Xfd';
  const TEST_WEBHOOK_SECRET = 'whsec_sritayigrand_live_webhook_secret_key_2026';

  describe('1. Currency Subunit Integrity (INR <-> Paise)', () => {
    it('accurately converts standard integer Rupee values to Paise without precision loss', () => {
      expect(inrToPaise(1800)).toBe(180000);
      expect(inrToPaise(2500)).toBe(250000);
      expect(inrToPaise(4500)).toBe(450000);
      expect(inrToPaise(0)).toBe(0);
    });

    it('accurately converts fractional decimal amounts without IEEE 754 floating-point inaccuracies', () => {
      expect(inrToPaise(10.5)).toBe(1050);
      expect(inrToPaise(10.55)).toBe(1055);
      expect(inrToPaise(99.99)).toBe(9999);
      expect(inrToPaise(0.01)).toBe(1);
    });

    it('rejects negative numbers, NaN, or non-number inputs with fintech integrity error', () => {
      expect(() => inrToPaise(-50)).toThrow(/Invalid amount in Rupees/);
      expect(() => inrToPaise(NaN)).toThrow(/Invalid amount in Rupees/);
      // @ts-expect-error Testing invalid runtime input
      expect(() => inrToPaise('1800')).toThrow(/Invalid amount in Rupees/);
    });

    it('accurately reverses Paise to Rupees', () => {
      expect(paiseToInr(180000)).toBe(1800);
      expect(paiseToInr(1050)).toBe(10.5);
      expect(paiseToInr(1)).toBe(0.01);
      expect(paiseToInr(0)).toBe(0);
    });
  });

  describe('2. Client Payment Signature Verification (HMAC-SHA256 & Timing-Safe Comparison)', () => {
    const orderId = 'order_test_1001';
    const paymentId = 'pay_test_9001';

    it('validates a genuine cryptographic signature generated with the server secret', () => {
      const payload = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(payload)
        .digest('hex');

      const isVerified = verifyPaymentSignature(
        orderId,
        paymentId,
        validSignature,
        TEST_SECRET
      );
      expect(isVerified).toBe(true);
    });

    it('rejects a signature if the order ID has been tampered with', () => {
      const payload = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(payload)
        .digest('hex');

      const tamperedOrderId = 'order_test_tampered';
      const isVerified = verifyPaymentSignature(
        tamperedOrderId,
        paymentId,
        validSignature,
        TEST_SECRET
      );
      expect(isVerified).toBe(false);
    });

    it('rejects a signature if the payment ID has been tampered with', () => {
      const payload = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(payload)
        .digest('hex');

      const tamperedPaymentId = 'pay_test_tampered';
      const isVerified = verifyPaymentSignature(
        orderId,
        tamperedPaymentId,
        validSignature,
        TEST_SECRET
      );
      expect(isVerified).toBe(false);
    });

    it('rejects arbitrary or forged signature strings', () => {
      const forgedSignature = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const isVerified = verifyPaymentSignature(
        orderId,
        paymentId,
        forgedSignature,
        TEST_SECRET
      );
      expect(isVerified).toBe(false);
    });

    it('rejects empty or missing parameters gracefully without throwing uncaught exceptions', () => {
      expect(verifyPaymentSignature('', paymentId, 'sig', TEST_SECRET)).toBe(false);
      expect(verifyPaymentSignature(orderId, '', 'sig', TEST_SECRET)).toBe(false);
      expect(verifyPaymentSignature(orderId, paymentId, '', TEST_SECRET)).toBe(false);
    });
  });

  describe('3. Asynchronous Webhook Signature Verification', () => {
    const samplePayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_capture_test_555',
            amount: 180000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });

    it('validates a valid signed raw webhook body', () => {
      const validSignature = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(samplePayload)
        .digest('hex');

      const isVerified = verifyWebhookSignature(
        samplePayload,
        validSignature,
        TEST_WEBHOOK_SECRET
      );
      expect(isVerified).toBe(true);
    });

    it('rejects webhook payload if body contents were modified in-transit', () => {
      const validSignature = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(samplePayload)
        .digest('hex');

      const tamperedPayload = samplePayload.replace('180000', '100');
      const isVerified = verifyWebhookSignature(
        tamperedPayload,
        validSignature,
        TEST_WEBHOOK_SECRET
      );
      expect(isVerified).toBe(false);
    });

    it('rejects missing or empty webhook signatures', () => {
      expect(verifyWebhookSignature(samplePayload, null, TEST_WEBHOOK_SECRET)).toBe(false);
      expect(verifyWebhookSignature(samplePayload, '', TEST_WEBHOOK_SECRET)).toBe(false);
      expect(verifyWebhookSignature('', 'sig', TEST_WEBHOOK_SECRET)).toBe(false);
    });
  });
});
