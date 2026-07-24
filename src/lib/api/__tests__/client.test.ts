import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient, getApiBaseUrl, setApiBaseUrl, buildApiUrl } from '../client';

vi.mock('../../stores/diagnostics.store', () => ({
  useDiagnosticsStore: {
    getState: () => ({
      debugMode: false,
      addRequestLog: vi.fn(),
    }),
  },
}));

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request Configuration', () => {
    it('should have correct base configuration', () => {
      expect(apiClient.defaults.baseURL).toBeDefined();
      expect(apiClient.defaults.timeout).toBe(30000);
      expect(apiClient.defaults.withCredentials).toBe(true);
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('normalizeBaseUrl (via setApiBaseUrl)', () => {
    const originalBaseUrl = getApiBaseUrl();

    afterEach(() => {
      setApiBaseUrl(originalBaseUrl);
    });

    it('should strip trailing slashes', () => {
      setApiBaseUrl('http://example.com///');
      expect(getApiBaseUrl()).toBe('http://example.com');
      expect(apiClient.defaults.baseURL).toBe('http://example.com');
    });

    it('should trim whitespace', () => {
      setApiBaseUrl('  http://example.com  ');
      expect(getApiBaseUrl()).toBe('http://example.com');
    });

    it('should default to localhost:8080 for empty string', () => {
      setApiBaseUrl('');
      expect(getApiBaseUrl()).toBe('http://localhost:8080');
    });

    it('should default to localhost:8080 for whitespace-only', () => {
      setApiBaseUrl('   ');
      expect(getApiBaseUrl()).toBe('http://localhost:8080');
    });

    it('should leave valid URL unchanged', () => {
      setApiBaseUrl('https://api.clinic.com');
      expect(getApiBaseUrl()).toBe('https://api.clinic.com');
    });
  });

  describe('buildApiUrl', () => {
    const originalBaseUrl = getApiBaseUrl();

    afterEach(() => {
      setApiBaseUrl(originalBaseUrl);
    });

    it('should concatenate base URL with path', () => {
      setApiBaseUrl('http://localhost:8080');
      expect(buildApiUrl('/api/test')).toBe('http://localhost:8080/api/test');
    });

    it('should add leading slash if missing', () => {
      setApiBaseUrl('http://localhost:8080');
      expect(buildApiUrl('api/test')).toBe('http://localhost:8080/api/test');
    });

    it('should not double-slash when path starts with /', () => {
      setApiBaseUrl('http://localhost:8080');
      expect(buildApiUrl('/test')).toBe('http://localhost:8080/test');
    });
  });

  describe('Response Envelope Unwrapping (response interceptor)', () => {
    it('should unwrap envelope structure and return contents', () => {
      const handlers = apiClient.interceptors.response as unknown as {
        handlers: Array<{ fulfilled: (r: unknown) => unknown }>;
      };

      const interceptor = handlers.handlers[0].fulfilled;

      const mockResponse = {
        data: {
          status: 200,
          message: 'Success',
          contents: { id: '123', name: 'Test' },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      const result = interceptor(mockResponse) as { data: unknown };
      expect(result.data).toEqual({ id: '123', name: 'Test' });
    });

    it('should pass through non-envelope responses as-is', () => {
      const handlers = apiClient.interceptors.response as unknown as {
        handlers: Array<{ fulfilled: (r: unknown) => unknown }>;
      };

      const interceptor = handlers.handlers[0].fulfilled;

      const mockResponse = {
        data: { id: '123', name: 'Test' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      const result = interceptor(mockResponse) as { data: unknown };
      expect(result.data).toEqual({ id: '123', name: 'Test' });
    });

    it('should handle null contents in envelope', () => {
      const handlers = apiClient.interceptors.response as unknown as {
        handlers: Array<{ fulfilled: (r: unknown) => unknown }>;
      };

      const interceptor = handlers.handlers[0].fulfilled;

      const mockResponse = {
        data: {
          status: 200,
          message: 'Success',
          contents: null,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      const result = interceptor(mockResponse) as { data: unknown };
      expect(result.data).toBeNull();
    });
  });

  describe('CSRF Token (request interceptor)', () => {
    it('should attach CSRF token for POST requests', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrf-token=abc123',
      });

      const handlers = apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (c: unknown) => unknown }>;
      };

      const interceptor = handlers.handlers[0].fulfilled;

      const mockConfig = {
        method: 'post',
        headers: {
          set: vi.fn(),
        },
        data: {},
      };

      interceptor(mockConfig);
      expect(mockConfig.headers.set).toHaveBeenCalledWith('X-CSRF-Token', 'abc123');
    });

    it('should not attach CSRF token for GET requests', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrf-token=abc123',
      });

      const handlers = apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (c: unknown) => unknown }>;
      };

      const interceptor = handlers.handlers[0].fulfilled;

      const mockConfig = {
        method: 'get',
        headers: {
          set: vi.fn(),
        },
      };

      interceptor(mockConfig);
      expect(mockConfig.headers.set).not.toHaveBeenCalled();
    });

    it('should not attach CSRF token when cookie is absent', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });

      const handlers = apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (c: unknown) => unknown }>;
      };

      const interceptor = handlers.handlers[0].fulfilled;

      const mockConfig = {
        method: 'put',
        headers: {
          set: vi.fn(),
        },
        data: {},
      };

      interceptor(mockConfig);
      expect(mockConfig.headers.set).not.toHaveBeenCalled();
    });
  });

  describe('Error Normalization (error interceptor)', () => {
    it('should normalize backend error envelope', async () => {
      const handlers = apiClient.interceptors.response as unknown as {
        handlers: Array<{ rejected: (e: unknown) => Promise<never> }>;
      };

      const errorInterceptor = handlers.handlers[0].rejected;

      const mockError = {
        config: { url: '/api/test', method: 'get' },
        message: 'Request failed',
        response: {
          status: 400,
          data: {
            status: 400,
            message: 'Validation failed',
            timestamp: '2024-01-01T00:00:00.000Z',
            path: '/api/test',
          },
        },
      };

      await expect(errorInterceptor(mockError)).rejects.toMatchObject({
        status: 400,
        message: 'Validation failed',
        path: '/api/test',
      });
    });

    it('should handle network errors without response', async () => {
      const handlers = apiClient.interceptors.response as unknown as {
        handlers: Array<{ rejected: (e: unknown) => Promise<never> }>;
      };

      const errorInterceptor = handlers.handlers[0].rejected;

      const mockError = {
        config: { url: '/api/test', method: 'get' },
        message: 'Network Error',
        response: undefined,
      };

      await expect(errorInterceptor(mockError)).rejects.toMatchObject({
        status: 500,
        message: 'Network Error',
      });
    });

    it('should always set contents to null on error', async () => {
      const handlers = apiClient.interceptors.response as unknown as {
        handlers: Array<{ rejected: (e: unknown) => Promise<never> }>;
      };

      const errorInterceptor = handlers.handlers[0].rejected;

      const mockError = {
        config: { url: '/api/test', method: 'post' },
        message: 'Error',
        response: { status: 422, data: null },
      };

      await expect(errorInterceptor(mockError)).rejects.toMatchObject({
        contents: null,
      });
    });
  });
});
