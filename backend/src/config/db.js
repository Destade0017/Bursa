/**
 * Database Configuration Utility
 * Instantiates and exports a single PrismaClient instance to be reused across the application.
 * In test mode (NODE_ENV=test), strictly enforces isolated TEST_DATABASE_URL before Prisma client initialization.
 */

import { PrismaClient } from '@prisma/client';
import { getValidatedDatasourceUrl } from './dbSafety.js';

// Validates database isolation immediately upon module evaluation
const datasourceUrl = getValidatedDatasourceUrl();

export const prisma = new PrismaClient({
  datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
  transactionOptions: {
    maxWait: 15000,
    timeout: 30000
  }
});
