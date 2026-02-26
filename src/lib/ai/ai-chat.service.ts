import { ApiService } from '../api/client';

export class AiChatService {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.get();
  }

  // Start a new conversation
  async startConversation(): Promise<string> {
    return await this.apiService.startConversation();
  }

  // Send a message
  async sendMessage(conversationId: string, text: string): Promise<any> {
    return await this.apiService.sendMessage({ conversationId, text });
  }

  // Get messages for a conversation (polling fallback)
  async getMessages(conversationId: string): Promise<any[]> {
    const response = await this.apiService.getAxiosInstance().get(`/ai-agents/messages/${conversationId}`);
    return response.data;
  }

  // Get stream URL for SSE
  getStreamUrl(conversationId: string): string {
    return this.apiService.getStreamUrl(conversationId);
  }

  // Set base URL
  setBaseURL(baseURL: string): void {
    this.apiService.setBaseURL(baseURL);
  }

  // Get base URL
  getBaseURL(): string {
    return this.apiService.getBaseURL();
  }
}

export const aiChatService = new AiChatService();
