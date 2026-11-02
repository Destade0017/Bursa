/**
 * Database Safety & Isolation Unit Tests
 * Verifies that automated tests fail safely and closed whenever an isolated
 * test database is not explicitly configured or collides with production/dev targets.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeDatabaseTarget,
  isSameDatabaseTarget,
  getValidatedDatasourceUrl
} from '../../src/config/dbSafety.js';

describe('Database Safety Validator: normalizeDatabaseTarget', () => {
  it('normalizes localhost and 127.0.0.1 to canonical localhost target', () => {
    const target1 = normalizeDatabaseTarget('postgresql://user:pass@localhost:5432/bursaros');
    const target2 = normalizeDatabaseTarget('postgresql://user:pass@127.0.0.1:5432/bursaros');
    const target3 = normalizeDatabaseTarget('postgresql://user:pass@[::1]:5432/bursaros');

    expect(target1.canonicalKey).toBe('localhost:5432/bursaros');
    expect(target2.canonicalKey).toBe('localhost:5432/bursaros');
    expect(target3.canonicalKey).toBe('localhost:5432/bursaros');
  });

  it('normalizes cloud connection poolers (Neon -pooler) to canonical host', () => {
    const pooler = normalizeDatabaseTarget(
      'postgresql://neondb_owner:pass@ep-crimson-dew-b2l89yb7-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require'
    );
    const direct = normalizeDatabaseTarget(
      'postgresql://neondb_owner:pass@ep-crimson-dew-b2l89yb7.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require'
    );

    expect(pooler.canonicalHost).toBe('ep-crimson-dew-b2l89yb7.c-6.eu-central-1.aws.neon.tech');
    expect(direct.canonicalHost).toBe('ep-crimson-dew-b2l89yb7.c-6.eu-central-1.aws.neon.tech');
    expect(pooler.canonicalKey).toBe(direct.canonicalKey);
  });

  it('ignores trailing slashes and query parameter variations', () => {
    const urlA = normalizeDatabaseTarget('postgresql://user:pass@localhost:5432/bursaros?sslmode=require&connect_timeout=15');
    const urlB = normalizeDatabaseTarget('postgresql://user:pass@localhost:5432/bursaros/');

    expect(urlA.canonicalKey).toBe('localhost:5432/bursaros');
    expect(urlB.canonicalKey).toBe('localhost:5432/bursaros');
  });

  it('correctly distinguishes different database names on the same host', () => {
    const prodTarget = normalizeDatabaseTarget('postgresql://user:pass@localhost:5432/bursaros');
    const testTarget = normalizeDatabaseTarget('postgresql://user:pass@localhost:5432/bursaros_test');

    expect(prodTarget.canonicalKey).not.toBe(testTarget.canonicalKey);
  });
});

describe('Database Safety Validator: isSameDatabaseTarget', () => {
  it('detects identical connection strings', () => {
    const url = 'postgresql://user:pass@localhost:5432/bursaros';
    expect(isSameDatabaseTarget(url, url)).toBe(true);
  });

  it('detects equivalence despite parameter or casing differences', () => {
    const prodUrl = 'postgresql://user:pass@ep-prod-pooler.neon.tech/neondb?sslmode=require';
    const testUrl = 'postgresql://user:pass@EP-PROD.neon.tech:5432/neondb?connect_timeout=30';

    expect(isSameDatabaseTarget(testUrl, prodUrl)).toBe(true);
  });

  it('recognizes isolated, distinct test databases as safe', () => {
    const prodUrl = 'postgresql://user:pass@localhost:5432/bursaros';
    const testUrl = 'postgresql://user:pass@localhost:5432/bursaros_test';

    expect(isSameDatabaseTarget(testUrl, prodUrl)).toBe(false);
  });
});

describe('Database Safety Validator: getValidatedDatasourceUrl (Fail-Safe Verification)', () => {
  const prodUrl = 'postgresql://neondb_owner:secret@ep-crimson-dew-b2l89yb7-pooler.neon.tech/neondb?sslmode=require';
  const directUrl = 'postgresql://neondb_owner:secret@ep-crimson-dew-b2l89yb7.neon.tech/neondb?sslmode=require';
  const safeTestUrl = 'postgresql://bursar_test_user:test_pass@localhost:5432/bursaros_test';

  it('FAILS if NODE_ENV=test and TEST_DATABASE_URL is missing', () => {
    expect(() => {
      getValidatedDatasourceUrl({
        nodeEnv: 'test',
        testDatabaseUrl: undefined,
        databaseUrl: prodUrl
      });
    }).toThrowError(/CRITICAL DATABASE SAFETY ERROR: Automated tests are executing with NODE_ENV=test, but TEST_DATABASE_URL is not set/);
  });

  it('FAILS if NODE_ENV=test and TEST_DATABASE_URL is empty string or whitespace', () => {
    expect(() => {
      getValidatedDatasourceUrl({
        nodeEnv: 'test',
        testDatabaseUrl: '   ',
        databaseUrl: prodUrl
      });
    }).toThrowError(/CRITICAL DATABASE SAFETY ERROR/);
  });

  it('NEVER falls back to DATABASE_URL in test mode', () => {
    // Even if DATABASE_URL is set, missing TEST_DATABASE_URL must throw, not fall back
    expect(() => {
      getValidatedDatasourceUrl({
        nodeEnv: 'test',
        testDatabaseUrl: null,
        databaseUrl: prodUrl
      });
    }).toThrowError(/CRITICAL DATABASE SAFETY ERROR/);
  });

  it('FAILS if TEST_DATABASE_URL targets the same database as DATABASE_URL', () => {
    expect(() => {
      getValidatedDatasourceUrl({
        nodeEnv: 'test',
        testDatabaseUrl: prodUrl,
        databaseUrl: prodUrl
      });
    }).toThrowError(/CRITICAL DATABASE SAFETY VIOLATION: TEST_DATABASE_URL targets the same database as DATABASE_URL/);
  });

  it('FAILS if TEST_DATABASE_URL bypasses string comparison by pointing to direct host alias', () => {
    // Pooler in DATABASE_URL, direct in TEST_DATABASE_URL pointing to same database
    expect(() => {
      getValidatedDatasourceUrl({
        nodeEnv: 'test',
        testDatabaseUrl: directUrl,
        databaseUrl: prodUrl
      });
    }).toThrowError(/CRITICAL DATABASE SAFETY VIOLATION/);
  });

  it('FAILS if TEST_DATABASE_URL matches DIRECT_URL', () => {
    expect(() => {
      getValidatedDatasourceUrl({
        nodeEnv: 'test',
        testDatabaseUrl: directUrl,
        databaseUrl: 'postgresql://other:pass@otherhost:5432/db',
        directUrl: directUrl
      });
    }).toThrowError(/CRITICAL DATABASE SAFETY VIOLATION: TEST_DATABASE_URL targets the same database as DIRECT_URL/);
  });

  it('SUCCEEDS in test mode when an isolated test database is provided', () => {
    const result = getValidatedDatasourceUrl({
      nodeEnv: 'test',
      testDatabaseUrl: safeTestUrl,
      databaseUrl: prodUrl,
      directUrl: directUrl
    });

    expect(result).toBe(safeTestUrl);
  });

  it('SUCCEEDS in development mode using DATABASE_URL without requiring TEST_DATABASE_URL', () => {
    const result = getValidatedDatasourceUrl({
      nodeEnv: 'development',
      testDatabaseUrl: undefined,
      databaseUrl: prodUrl
    });

    expect(result).toBe(prodUrl);
  });

  it('SUCCEEDS in production mode using DATABASE_URL without requiring TEST_DATABASE_URL', () => {
    const result = getValidatedDatasourceUrl({
      nodeEnv: 'production',
      testDatabaseUrl: undefined,
      databaseUrl: prodUrl
    });

    expect(result).toBe(prodUrl);
  });
});
