import { apiClient, getApiBaseUrl } from '../api/client';

interface AiAgentMessage {
  id?: string;
  text?: string;
  markdown?: string;
  title?: string;
  audioUrl?: string;
  fileUrl?: string;
  createdAt?: string;
}

interface AiAgentSendResponse {
  ok?: boolean;
  message?: AiAgentMessage;
  [key: string]: unknown;
}

export class AiChatService {
  // Start a new conversation
  async startConversation(): Promise<string> {
    const response = await apiClient.post('/ai-agents/start', {});
    return response.data.id;
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
  async getMessages(conversationId: string): Promise<AiAgentMessage[]> {
    const response = await apiClient.get(`/ai-agents/messages/${conversationId}`);
    return response.data;
  }

  // Get stream URL for SSE
  getStreamUrl(conversationId: string): string {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/ai-agents/stream/${conversationId}`;
  }
}

export const aiChatService = new AiChatService();
