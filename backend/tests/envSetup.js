/**
 * Test Environment Loader
 * Loads .env.test into process.env before any test suite or database module is imported.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envTestPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
}

