import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { apiClient as baseApiClient } from './http-client';
import { ApiError, ApiResponse } from '../lib/types/api';
import { useDiagnosticsStore } from '../lib/stores/diagnostics.store';

export class ApiClient {
  private static instance: ApiClient;
  private api: AxiosInstance;
  private interceptorRegistered = false;

  private constructor() {
    this.api = baseApiClient;
    this.registerInterceptors();
  }

  public static get(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private registerInterceptors(): void {
    if (this.interceptorRegistered) return;

    // Response interceptor - unwrap envelope and normalize errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => this.handleResponse(response),
      (error: AxiosError) => this.handleError(error),
    );

    this.interceptorRegistered = true;
  }

  private handleResponse(response: AxiosResponse): AxiosResponse {
    const data = response.data;

    // Check if response has envelope structure
    if (data && typeof data === 'object' && 'contents' in data) {
      const envelope = data as any;
      
      // Log to diagnostics
      this.logRequest({
        method: response.config.method?.toUpperCase() || 'GET',
        url: response.config.url || '',
        status: response.status,
        latency: 0,
        requestPayload: response.config.data,
        responsePayload: envelope.contents,
      });

      // Return unwrapped response
      return {
        ...response,
        data: envelope.contents,
      };
    }

    // Log non-envelope responses too
    this.logRequest({
      method: response.config.method?.toUpperCase() || 'GET',
      url: response.config.url || '',
      status: response.status,
      latency: 0,
      requestPayload: response.config.data,
      responsePayload: data,
    });

    return response;
  }

  private handleError(error: AxiosError): Promise<never> {
    const apiError: ApiError = {
      status: error.response?.status || 500,
      message: error.message || 'An error occurred',
      contents: null,
      timestamp: new Date().toISOString(),
      path: error.config?.url || '',
    };

    // Extract backend error envelope if available
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      if (data.status) apiError.status = data.status;
      if (data.message) apiError.message = data.message;
      if (data.timestamp) apiError.timestamp = data.timestamp;
      if (data.path) apiError.path = data.path;
    }

    // Log error to diagnostics
    this.logRequest({
      method: error.config?.method?.toUpperCase() || 'GET',
      url: error.config?.url || '',
      status: apiError.status,
      latency: 0,
      requestPayload: error.config?.data,
      responsePayload: error.response?.data,
    });

    return Promise.reject(apiError);
  }

  private logRequest(entry: any): void {
    try {
      const store = useDiagnosticsStore.getState();
      store.addRequestLog(entry);
    } catch {
      // Ignore logging errors
    }
  }

  public getAxiosInstance(): AxiosInstance {
    return this.api;
  }
}

export const apiClient = ApiClient.get();
