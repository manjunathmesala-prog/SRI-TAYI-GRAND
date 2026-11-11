import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Explicit isolated configuration: never load .env.local or live services.
export default defineConfig({
  resolve: { alias: { '@': path.resolve('src') } },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['qa/isolated-setup.ts'],
    include: ['qa/**/*.test.ts'],
    env: { ADMIN_JWT_SECRET: 'isolated-qa-signing-secret-at-least-32-characters' },
  },
});
