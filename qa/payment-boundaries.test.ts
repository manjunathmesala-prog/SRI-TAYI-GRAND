import { describe, it, expect, vi } from 'vitest';
import { createRazorpayOrder, inrToPaise, paiseToInr } from '../src/lib/razorpay';

describe('Payment configuration and numeric boundaries', () => {
  it('rejects non-finite and unsafe payment amounts', () => {
    expect(() => inrToPaise(Infinity)).toThrow();
    expect(() => inrToPaise(Number.MAX_SAFE_INTEGER)).toThrow();
    expect(() => paiseToInr(Infinity)).toThrow();
  });
  it('does not fabricate a provider order when production credentials are missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RAZORPAY_KEY_ID', '');
    vi.stubEnv('NEXT_PUBLIC_RAZORPAY_KEY_ID', '');
    vi.stubEnv('RAZORPAY_KEY_SECRET', '');
    try {
      await expect(createRazorpayOrder({ amount: 1, receipt: 'isolated-config-check' })).rejects.toThrow();
    } finally { vi.unstubAllEnvs(); }
  });
});
