import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, ApiError } from '../types/api';

const DEFAULT_API_BASE_URL = 'http://localhost:8080';

const normalizeBaseUrl = (value?: string): string => {
  const candidate = value?.trim() || DEFAULT_API_BASE_URL;
  return candidate.replace(/\/+$/, '');
};

let apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Response interceptor - unwrap envelope and normalize errors
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    const data = response.data as unknown;

    // Check if response has envelope structure
    if (
      typeof data === 'object' &&
      data !== null &&
      'status' in data &&
      'message' in data &&
      'contents' in data
    ) {
      // Return unwrapped contents but keep envelope for diagnostics
      return {
        ...response,
        data: (data as ApiResponse).contents,
        __rawEnvelope: data as ApiResponse,
      };
    }

    return response;
  },
  (error): Promise<never> => {
    const apiError: ApiError = {
      status: error.response?.status || 500,
      message: error.message || 'An error occurred',
      contents: null,
      timestamp: new Date().toISOString(),
      path: error.config?.url || '',
    };

    // Extract backend error envelope if present
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      if (data.status && data.message && data.timestamp && data.path) {
        apiError.status = data.status;
        apiError.message = data.message;
        apiError.timestamp = data.timestamp;
        apiError.path = data.path;
      }
    }

    return Promise.reject(apiError);
  }
);

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Add timestamp for latency tracking
    (config as any).__requestStart = Date.now();
    return config;
  }
);

// Response interceptor for logging
apiClient.interceptors.response.use(
  (response): AxiosResponse => {
    const latency = Date.now() - (response.config as any).__requestStart;
    
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${latency}ms)`);
    }
    
    return response;
  }
);

export const getApiBaseUrl = (): string => apiBaseUrl;

export const setApiBaseUrl = (baseUrl: string): void => {
  apiBaseUrl = normalizeBaseUrl(baseUrl);
  apiClient.defaults.baseURL = apiBaseUrl;
};

export const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
};
