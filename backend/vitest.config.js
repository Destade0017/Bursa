import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/envSetup.js', './tests/setup.js'],
    testTimeout: 10000,
    include: ['tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      PORT: '5099',
      JWT_SECRET: 'test_super_secret_jwt_key_for_automated_testing_only_32_chars'
    }
  }
});
