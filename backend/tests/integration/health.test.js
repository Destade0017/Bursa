/**
 * Health Endpoint Integration Test
 * Verifies that the Express application responds to GET /api/health with status 200
 * and matches the existing API contract.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('GET /api/health', () => {
  it('should respond with status 200 and health status payload', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    // Verify existing response contract
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toEqual({
      status: 'ok',
      message: 'Bursar API is running'
    });
  });

  it('should respond with status 200 on root path /', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      message: 'BURSA API Server is running live.'
    });
  });

  it('should respond with status 404 on unmapped endpoints', async () => {
    const response = await request(app)
      .get('/api/unmapped-endpoint-route')
      .expect(404);

    expect(response.body).toEqual({
      error: 'Endpoint not found on BURSA API.'
    });
  });
});

