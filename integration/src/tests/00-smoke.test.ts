import { describe, it, expect } from 'vitest';
import { getServerUrl } from '../helpers/server.js';
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
    // The root route should respond (200 or 404 depending on whether AppController has a root handler)
    expect(response.status).toBeLessThan(500);
  });
});
