/**
 * Vitest Global Setup & Database Safety Guard
 * Ensures automated tests run with NODE_ENV=test and enforces database isolation.
 */

import { beforeAll, afterAll } from 'vitest';
import { getValidatedDatasourceUrl } from '../src/config/dbSafety.js';
import { prisma } from '../src/config/db.js';

beforeAll(async () => {
  // Enforce test environment
  process.env.NODE_ENV = 'test';

  // Run database safety guard to ensure TEST_DATABASE_URL is set and isolated
  getValidatedDatasourceUrl();
});

afterAll(async () => {
  try {
    if (prisma && typeof prisma.$disconnect === 'function') {
      await prisma.$disconnect();
    }
  } catch (err) {
    // Graceful disconnect fallback
  }
});
