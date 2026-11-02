/**
 * Database Safety & Isolation Validator
 * Strictly enforces that automated tests (NODE_ENV=test) connect only to an isolated test database,
 * preventing any accidental mutation of development or production databases.
 */

/**
 * Normalizes a database connection URL into a canonical target object.
 * Strips credentials, normalizes host aliases (localhost, 127.0.0.1, [::1]),
 * normalizes cloud provider host patterns (e.g., Neon -pooler), canonicalizes ports and paths,
 * and discards non-identifying query parameters.
 *
 * @param {string} rawUrl - Database connection string
 * @returns {object|null} Canonical database target details
 */
export function normalizeDatabaseTarget(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    let hostname = (parsed.hostname || '').toLowerCase();

    // 1. Normalize localhost and loopback IPv4/IPv6 representations
    if (
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname === '0.0.0.0'
    ) {
      hostname = 'localhost';
    }

    // 2. Normalize cloud connection aliases (e.g. Neon connection pooler vs direct connection)
    // Example: ep-xyz-pooler.c-6.neon.tech -> ep-xyz.c-6.neon.tech
    const canonicalHost = hostname.replace(/-pooler(\.[a-z0-9-]+)/i, '$1');

    // 3. Default port for PostgreSQL if unspecified
    const port = parsed.port || '5432';

    // 4. Normalize database name (strip leading and trailing slashes)
    const databaseName = (parsed.pathname || '').replace(/^\/+|\/+$/g, '').toLowerCase();

    return {
      protocol: parsed.protocol.toLowerCase(),
      hostname,
      canonicalHost,
      port,
      databaseName,
      // Canonical key uniquely identifying the physical database storage
      canonicalKey: `${canonicalHost}:${port}/${databaseName}`
    };
  } catch {
    // If not a standard URL (e.g. relative SQLite path or non-standard format), fall back to trimmed lowercase
    return {
      raw: trimmed.toLowerCase(),
      canonicalKey: trimmed.toLowerCase()
    };
  }
}

/**
 * Determines whether two database connection URLs point to the same physical database target.
 *
 * @param {string} urlA - First connection URL
 * @param {string} urlB - Second connection URL
 * @returns {boolean} True if both URLs target the same physical database
 */
export function isSameDatabaseTarget(urlA, urlB) {
  if (!urlA || !urlB) return false;
  if (urlA.trim() === urlB.trim()) return true;

  const targetA = normalizeDatabaseTarget(urlA);
  const targetB = normalizeDatabaseTarget(urlB);

  if (!targetA || !targetB) return false;

  return targetA.canonicalKey === targetB.canonicalKey;
}

/**
 * Validates database isolation for the current environment.
 *
 * Rules:
 * 1. If NODE_ENV !== 'test', returns DATABASE_URL unchanged.
 * 2. If NODE_ENV === 'test':
 *    a. TEST_DATABASE_URL is strictly required. If missing or blank, fails immediately.
 *    b. Never falls back to DATABASE_URL.
 *    c. Validates that TEST_DATABASE_URL does not target the same database as DATABASE_URL or DIRECT_URL.
 *
 * @param {object} [options]
 * @param {string} [options.nodeEnv] - Overrides process.env.NODE_ENV
 * @param {string} [options.testDatabaseUrl] - Overrides process.env.TEST_DATABASE_URL
 * @param {string} [options.databaseUrl] - Overrides process.env.DATABASE_URL
 * @param {string} [options.directUrl] - Overrides process.env.DIRECT_URL
 * @returns {string} The validated, safe datasource URL
 * @throws {Error} If test database configuration is missing, insecure, or collides with production/dev
 */
export function getValidatedDatasourceUrl(options = {}) {
  const nodeEnv = 'nodeEnv' in options ? options.nodeEnv : process.env.NODE_ENV;
  const testDatabaseUrl = 'testDatabaseUrl' in options ? options.testDatabaseUrl : process.env.TEST_DATABASE_URL;
  const databaseUrl = 'databaseUrl' in options ? options.databaseUrl : process.env.DATABASE_URL;
  const directUrl = 'directUrl' in options ? options.directUrl : process.env.DIRECT_URL;

  const isTest = nodeEnv === 'test';

  if (!isTest) {
    // Development or Production runtime: use standard DATABASE_URL
    return databaseUrl;
  }

  // --- STRICT TEST ISOLATION CHECKS ---

  // Check 1: TEST_DATABASE_URL is mandatory in test mode
  if (!testDatabaseUrl || typeof testDatabaseUrl !== 'string' || !testDatabaseUrl.trim()) {
    throw new Error(
      'CRITICAL DATABASE SAFETY ERROR: Automated tests are executing with NODE_ENV=test, ' +
      'but TEST_DATABASE_URL is not set. Tests must NEVER use the default or production DATABASE_URL. ' +
      'Please configure a dedicated TEST_DATABASE_URL pointing to an isolated test database.'
    );
  }

  const cleanTestUrl = testDatabaseUrl.trim();

  // Check 2: Verify TEST_DATABASE_URL does not target DATABASE_URL
  if (databaseUrl && isSameDatabaseTarget(cleanTestUrl, databaseUrl)) {
    throw new Error(
      'CRITICAL DATABASE SAFETY VIOLATION: TEST_DATABASE_URL targets the same database as DATABASE_URL. ' +
      'Automated tests must run against an isolated test database to protect production and development data.'
    );
  }

  // Check 3: Verify TEST_DATABASE_URL does not target DIRECT_URL
  if (directUrl && isSameDatabaseTarget(cleanTestUrl, directUrl)) {
    throw new Error(
      'CRITICAL DATABASE SAFETY VIOLATION: TEST_DATABASE_URL targets the same database as DIRECT_URL. ' +
      'Automated tests must run against an isolated test database to protect production and development data.'
    );
  }

  return cleanTestUrl;
}
