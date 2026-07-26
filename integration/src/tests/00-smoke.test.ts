import { describe, it, expect } from 'vitest';
import { getServerUrl, getPrisma } from '../helpers/server.js';
import axios from 'axios';

describe('Smoke Test', () => {
  it('should have the test server running', () => {
    const url = getServerUrl();
    expect(url).toBeTruthy();
    expect(url).toMatch(/^http:\/\//);
  });

  it('should respond to a health-check GET request', async () => {
    const url = getServerUrl();
    const response = await axios.get(url, { validateStatus: () => true });
    expect([200, 404]).toContain(response.status);
    expect(response.headers['content-type']).toContain('application/json');
  });

  it('should have a working database connection', async () => {
    const prisma = getPrisma();
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return correct security headers (Helmet)', async () => {
    const url = getServerUrl();
    const response = await axios.get(`${url}/doctor`, { validateStatus: () => true });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
  });
});
