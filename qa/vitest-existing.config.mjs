import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve('src') } },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/*.test.ts', 'tests/integration/*.test.ts', 'tests/e2e/*.spec.ts'],
    exclude: ['tests/unit/rfid-production-hardening.test.ts'],
    setupFiles: ['qa/isolated-setup.ts'],
    env: {
      ADMIN_JWT_SECRET: 'isolated-qa-signing-secret-at-least-32-characters',
      RAZORPAY_KEY_SECRET: 'isolated-payment-secret',
      RAZORPAY_WEBHOOK_SECRET: 'isolated-webhook-secret',
    },
  },
});
