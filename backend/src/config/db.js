/**
 * Database Configuration Utility
 * Instantiates and exports a single PrismaClient instance to be reused across the application.
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 15000,
    timeout: 30000
  }
});
