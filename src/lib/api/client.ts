import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, ApiError } from '../types/api';
import { useDiagnosticsStore } from '../stores/diagnostics.store';

type TrackedRequestConfig = InternalAxiosRequestConfig & {
  __requestStart?: number;
  __requestPayload?: unknown;
};

const DEFAULT_API_BASE_URL = 'http://localhost:8080';

const normalizeBaseUrl = (value?: string): string => {
  const candidate = value?.trim() || DEFAULT_API_BASE_URL;
  return candidate.replace(/\/+$/, '');
};

let apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

function getCsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match?.[1];
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const trackedConfig = config as TrackedRequestConfig;
    trackedConfig.__requestStart = Date.now();
    trackedConfig.__requestPayload = config.data;

    const method = config.method?.toUpperCase();
    if (method && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      const token = getCsrfToken();
      if (token) {
        config.headers.set('X-CSRF-Token', token);
      }
    }

    return config;
  }
);

// Response interceptor - unwrap envelope and normalize errors
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    const responseConfig = response.config as TrackedRequestConfig;
    const latency = Date.now() - (responseConfig.__requestStart ?? Date.now());
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
        requestPayload: responseConfig.__requestPayload,
        responsePayload: unwrappedData,
        rawEnvelope,
      });
    }

    // Return unwrapped contents
    return {
      ...response,
      data: unwrappedData,
    };
  },
  (error): Promise<never> => {
    const errorConfig = (error?.config as TrackedRequestConfig | undefined);
    const latency = errorConfig ? Date.now() - (errorConfig.__requestStart ?? Date.now()) : 0;
    
    const apiError: ApiError = {
      status: error.response?.status || 500,
      message: error.message || 'An error occurred',
      contents: null,
      timestamp: new Date().toISOString(),
      path: error.config?.url || '',
    };

    // Extract backend error envelope if present
    if (error.response?.data && typeof error.response.data === 'object' && error.response.data !== null) {
      const data = error.response.data as Record<string, unknown>;
      if (typeof data.status === 'number' && typeof data.message === 'string' && typeof data.timestamp === 'string' && typeof data.path === 'string') {
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
        requestPayload: errorConfig?.__requestPayload,
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
