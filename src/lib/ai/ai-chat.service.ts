import { apiClient, getApiBaseUrl } from '../api/client';

interface BotpressPayload {
  type?: string;
  text?: string;
  markdown?: string;
}

export interface AiAgentMessage {
  id?: string;
  text?: string;
  markdown?: string;
  title?: string;
  audioUrl?: string;
  fileUrl?: string;
  payload?: BotpressPayload;
  createdAt?: string;
}

interface AiAgentSendResponse {
  ok?: boolean;
  [key: string]: unknown;
}

export class AiChatService {
  // Start a new conversation
  async startConversation(): Promise<string> {
    const response = await apiClient.post<{ id: string }>('/ai-agents/start', {});
    const id = response.data?.id;
    if (!id) {
      throw new Error('Server did not return a conversation ID. Please try again.');
    }
    return id;
  }

  // Send a message
  async sendMessage(conversationId: string, text: string): Promise<AiAgentSendResponse> {
    const response = await apiClient.post('/ai-agents/message', {
      conversationId,
      text,
    });
    return response.data;
  }

  // Get messages for a conversation (polling fallback)
  async getMessages(conversationId: string, since?: Date): Promise<AiAgentMessage[]> {
    const response = await apiClient.get<AiAgentMessage[]>(
      `/ai-agents/messages/${conversationId}`,
      since ? { params: { dateOffset: since.toISOString() } } : {},
    );
    return Array.isArray(response.data) ? response.data : [];
  }

  // Get stream URL for SSE
  getStreamUrl(conversationId: string): string {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/ai-agents/stream/${conversationId}`;
  }
}

export const aiChatService = new AiChatService();
