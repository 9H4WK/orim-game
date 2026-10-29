import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The real package throws outside React Server Components; tests call server modules directly
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Each file gets its own in-memory Postgres; never a real provider
    env: {
      NODE_ENV: 'test',
      ORIM_DB: 'memory',
      AT_PROVIDER: 'mock',
      AT_USERNAME: 'sandbox',
      AT_ENVIRONMENT: 'sandbox',
      ORIM_SECRET: 'test-secret-test-secret-test-secret-1234',
      APP_BASE_URL: 'https://orim.test',
    },
  },
});
