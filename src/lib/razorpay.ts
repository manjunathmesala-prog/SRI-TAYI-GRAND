import crypto from 'crypto';
import Razorpay from 'razorpay';

export interface RazorpayOrderOptions {
  amount: number; // in INR (Rupees)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number; // in paise
  currency: string;
  receipt: string;
  status: string;
}

/**
 * Converts INR (Rupees) to subunits (Paise) using safe integer arithmetic.
 * Mitigates IEEE 754 floating-point rounding errors (e.g. 10.50 -> 1050, 1800 -> 180000).
 */
export function inrToPaise(amountInRupees: number): number {
  if (typeof amountInRupees !== 'number' || !Number.isFinite(amountInRupees) || amountInRupees < 0 ||
      !Number.isSafeInteger(Math.round(amountInRupees * 100))) {
    throw new Error(`[FINTECH INTEGRITY ERROR] Invalid amount in Rupees: ${amountInRupees}`);
  }
  return Math.round(Number((amountInRupees * 100).toFixed(2)));
}

/**
 * Converts subunits (Paise) back to INR (Rupees).
 */
export function paiseToInr(amountInPaise: number): number {
  if (typeof amountInPaise !== 'number' || !Number.isFinite(amountInPaise) || amountInPaise < 0 ||
      !Number.isSafeInteger(Math.round(amountInPaise))) {
    throw new Error(`[FINTECH INTEGRITY ERROR] Invalid amount in Paise: ${amountInPaise}`);
  }
  return Math.round(amountInPaise) / 100;
}

let razorpayClientInstance: Razorpay | null = null;

/**
 * Lazily initializes and returns the authoritative server-side Razorpay SDK client.
 */
export function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      '[RAZORPAY CONFIG ERROR] Missing credentials. Define RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment.'
    );
  }

  if (!razorpayClientInstance) {
    razorpayClientInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }
  return razorpayClientInstance;
}

/**
 * Creates an authorized server-side Razorpay order.
 * Strictly calculates amount in paise using integer math.
 */
export async function createRazorpayOrder(
  options: RazorpayOrderOptions
): Promise<RazorpayOrderResult> {
  const amountInPaise = inrToPaise(options.amount);

  if (amountInPaise <= 0) {
    throw new Error('[FINTECH INTEGRITY ERROR] Order amount in paise must be strictly positive.');
  }

  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const isPlaceholderOrTest = process.env.NODE_ENV === 'test';

  if (isPlaceholderOrTest) {
    return {
      id: `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      amount: amountInPaise,
      currency: options.currency || 'INR',
      receipt: options.receipt.substring(0, 40),
      status: 'created',
    };
  }

  if (!key_id || key_id.startsWith('rzp_test_placeholder')) {
    throw new Error('[RAZORPAY CONFIG ERROR] A configured provider key is required to create an order.');
  }

  const razorpay = getRazorpayClient();

  try {
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: options.currency || 'INR',
      receipt: options.receipt.substring(0, 40), // Razorpay receipt max 40 chars
      notes: options.notes || {},
    });

    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      receipt: String(order.receipt || options.receipt),
      status: String(order.status),
    };
  } catch (err: unknown) {
    console.error('Razorpay SDK Order Creation Failed:', err);
    throw new Error(
      `Razorpay order creation failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Cryptographically validates customer checkout authorization response.
 * Uses HMAC-SHA256 and constant-time comparison to prevent timing attacks.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  customSecret?: string
): boolean {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const secret = customSecret || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error('[SECURITY ERROR] RAZORPAY_KEY_SECRET is not configured for signature verification.');
    return false;
  }

  try {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch (err) {
    console.error('Error verifying Razorpay payment signature:', err);
    return false;
  }
}

/**
 * Cryptographically validates asynchronous incoming Razorpay webhook payloads.
 * Strictly verifies raw payload buffer against RAZORPAY_WEBHOOK_SECRET.
 */
export function verifyWebhookSignature(
  rawPayload: string | Buffer,
  signature: string | null | undefined,
  customWebhookSecret?: string
): boolean {
  if (!rawPayload || !signature) {
    return false;
  }

  const webhookSecret = customWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[SECURITY ERROR] RAZORPAY_WEBHOOK_SECRET is not configured.');
    return false;
  }

  try {
    const payloadString = Buffer.isBuffer(rawPayload) ? rawPayload.toString('utf8') : rawPayload;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadString)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch (err) {
    console.error('Error verifying Razorpay webhook signature:', err);
    return false;
  }
}
