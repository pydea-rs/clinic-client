import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, ApiError } from '../types/api';
import { useDiagnosticsStore } from '../stores/diagnostics.store';

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

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Add timestamp for latency tracking
    (config as any).__requestStart = Date.now();
    (config as any).__requestPayload = config.data;
    return config;
  }
);

// Response interceptor - unwrap envelope and normalize errors
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    const latency = Date.now() - (response.config as any).__requestStart;
    const data = response.data as unknown;
    let rawEnvelope = data;
    let unwrappedData = data;

    // Check if response has envelope structure
    if (
      typeof data === 'object' &&
      data !== null &&
      'status' in data &&
      'message' in data &&
      'contents' in data
    ) {
      rawEnvelope = data as ApiResponse;
      unwrappedData = (data as ApiResponse).contents;
    }

    // Log to diagnostics store
    const { debugMode, addRequestLog } = useDiagnosticsStore.getState();
    if (debugMode) {
      addRequestLog({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        method: response.config.method?.toUpperCase() || 'GET',
        url: response.config.url || '',
        status: response.status,
        latency,
        requestPayload: (response.config as any).__requestPayload,
        responsePayload: unwrappedData,
        rawEnvelope,
      });
    }

    // Only log in development console
    if (import.meta.env.DEV) {
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${latency}ms)`);
    }

    // Return unwrapped contents
    return {
      ...response,
      data: unwrappedData,
    };
  },
  (error): Promise<never> => {
    const latency = error.config ? Date.now() - (error.config as any).__requestStart : 0;
    
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

    // Log error to diagnostics store
    const { debugMode, addRequestLog } = useDiagnosticsStore.getState();
    if (debugMode && error.config) {
      addRequestLog({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        method: error.config.method?.toUpperCase() || 'GET',
        url: error.config.url || '',
        status: apiError.status,
        latency,
        requestPayload: (error.config as any).__requestPayload,
        responsePayload: null,
        rawEnvelope: error.response?.data,
      });
    }

    return Promise.reject(apiError);
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
