import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { 
  StartConversationResponse, 
  SendMessageRequest, 
  SendMessageResponse, 
  ApiError 
} from '../types/chat';

export class ApiService {
  private api: AxiosInstance;
  private static instance: ApiService;

  public static get() {
    if(ApiService.instance) {
      return ApiService.instance
    }
    return new ApiService();
  }

  private constructor(private baseURL: string = 'http://localhost:8080') {
    if(ApiService.instance) {
      return ApiService.instance;
    }
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message || 'An error occurred',
          status: error.response?.status,
        };

        if (error.response?.data && typeof error.response.data === 'object') {
          const data = error.response.data as any;
          apiError.message = data.message || data.error || apiError.message;
        }

        return Promise.reject(apiError);
      }
    );
    ApiService.instance = this;
  }

  async startConversation(): Promise<string> {
      const response: AxiosResponse<StartConversationResponse> = await this.api.post('/ai-agents/start');
      return response.data.conversationId;
  }

  async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
      const response: AxiosResponse<SendMessageResponse> = await this.api.post('/ai-agents/message', data);
      return response.data;

  }

  getStreamUrl(conversationId: string): string {
    return `${this.baseURL}/ai-agents/stream/${conversationId}`;
  }

  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
    this.api.defaults.baseURL = baseURL;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  setAuthToken(token: string): void {
    this.api.defaults.headers.Authorization = `Bearer ${token}`;
  }

  clearAuthToken(): void {
    delete this.api.defaults.headers.Authorization;
  }

  getAxiosInstance(): AxiosInstance {
    return this.api;
  }
}
