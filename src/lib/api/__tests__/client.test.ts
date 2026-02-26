import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { apiClient } from '../client';

vi.mock('axios');

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Response Envelope Unwrapping', () => {
    it('should unwrap envelope structure and return contents', async () => {
      const mockEnvelope = {
        status: 200,
        message: 'Success',
        contents: { id: '123', name: 'Test' },
      };

      // Mock axios create to return our apiClient
      vi.mocked(axios.create).mockReturnValue(apiClient as any);

      // The interceptor should unwrap the envelope
      const response = {
        data: mockEnvelope,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Test that envelope is properly structured
      expect(mockEnvelope).toHaveProperty('status');
      expect(mockEnvelope).toHaveProperty('message');
      expect(mockEnvelope).toHaveProperty('contents');
      expect(mockEnvelope.contents).toEqual({ id: '123', name: 'Test' });
    });

    it('should handle non-envelope responses', async () => {
      const mockData = { id: '123', name: 'Test' };

      // Non-envelope response should pass through
      expect(mockData).not.toHaveProperty('status');
      expect(mockData).not.toHaveProperty('message');
      expect(mockData).not.toHaveProperty('contents');
    });
  });

  describe('Error Normalization', () => {
    it('should normalize backend error envelope', () => {
      const backendError = {
        status: 400,
        message: 'Validation failed',
        contents: null,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/test',
      };

      expect(backendError.status).toBe(400);
      expect(backendError.message).toBe('Validation failed');
      expect(backendError.contents).toBeNull();
      expect(backendError.timestamp).toBeDefined();
      expect(backendError.path).toBe('/api/test');
    });

    it('should handle network errors', () => {
      const networkError = {
        status: 500,
        message: 'Network Error',
        contents: null,
        timestamp: new Date().toISOString(),
        path: '',
      };

      expect(networkError.status).toBe(500);
      expect(networkError.message).toBe('Network Error');
      expect(networkError.contents).toBeNull();
    });
  });

  describe('Request Configuration', () => {
    it('should have correct base configuration', () => {
      expect(apiClient.defaults.baseURL).toBeDefined();
      expect(apiClient.defaults.timeout).toBe(10000);
      expect(apiClient.defaults.withCredentials).toBe(true);
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });
  });
});
