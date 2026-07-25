import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { getServerUrl } from './server.js';

export interface TestClient {
  axios: AxiosInstance;
  jar: CookieJar;
  csrfToken: string | null;
}

export function createTestClient(): TestClient {
  const jar = new CookieJar();
  const client: TestClient = { axios: null as any, jar, csrfToken: null };

  const instance = wrapper(
    axios.create({
      baseURL: getServerUrl(),
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
      jar,
      validateStatus: () => true,
    }),
  );

  // Request interceptor: attach CSRF token on mutating requests
  // and remove Content-Type for bodyless requests (Fastify rejects empty JSON body)
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const method = config.method?.toUpperCase();
    if (method && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      if (client.csrfToken) {
        config.headers.set('X-CSRF-Token', client.csrfToken);
      }
      if (config.data === undefined || config.data === null) {
        config.headers.delete('Content-Type');
      }
    }
    return config;
  });

  // Response interceptor: capture CSRF token from set-cookie + unwrap envelope
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      extractCsrfToken(response, client);
      return unwrapEnvelope(response);
    },
    (error) => {
      if (error.response) {
        extractCsrfToken(error.response, client);
      }
      return Promise.reject(normalizeError(error));
    },
  );

  client.axios = instance;
  return client;
}

function extractCsrfToken(response: AxiosResponse, client: TestClient) {
  const setCookieHeaders = response.headers['set-cookie'];
  if (!setCookieHeaders) return;

  const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const cookie of cookies) {
    const match = cookie.match(/csrf-token=([^;]+)/);
    if (match) {
      client.csrfToken = match[1];
      break;
    }
  }
}

function unwrapEnvelope(response: AxiosResponse): AxiosResponse {
  const data = response.data;

  if (
    response.status >= 200 &&
    response.status < 300 &&
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    'message' in data &&
    'contents' in data
  ) {
    return { ...response, data: data.contents };
  }

  return response;
}

function normalizeError(error: any) {
  const apiError: any = {
    status: error.response?.status || 500,
    message: error.message || 'An error occurred',
    contents: null,
    timestamp: new Date().toISOString(),
    path: error.config?.url || '',
    response: error.response,
  };

  if (error.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data;
    if (typeof data.status === 'number' && typeof data.message === 'string') {
      apiError.status = data.status;
      apiError.message = data.message;
    }
  }

  return apiError;
}

export function createRawClient(): AxiosInstance {
  const jar = new CookieJar();
  return wrapper(
    axios.create({
      baseURL: getServerUrl(),
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
      jar,
      validateStatus: () => true,
    }),
  );
}
