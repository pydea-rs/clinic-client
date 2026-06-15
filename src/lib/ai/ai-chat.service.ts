import { apiClient, getApiBaseUrl } from '../api/client';

// AI endpoints involve Botpress cloud round-trips that are
// significantly slower than local DB-backed endpoints.
const AI_TIMEOUT_MS = 60_000;

interface BotpressPayload {
  type?: string;
  text?: string;
  markdown?: string;
}

export interface ConversationHistoryMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  createdAt: string;
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

export class AiChatService {
  // Start a new conversation
  async startConversation(): Promise<string> {
    const response = await apiClient.post<{ id: string }>(
      '/ai-agents/start',
      {},
      { timeout: AI_TIMEOUT_MS },
    );
    const id = response.data?.id;
    if (!id) {
      throw new Error('Server did not return a conversation ID. Please try again.');
    }
    return id;
  }

  // Send a message
  async sendMessage(conversationId: string, text: string): Promise<void> {
    await apiClient.post(
      '/ai-agents/message',
      { conversationId, text },
      { timeout: AI_TIMEOUT_MS },
    );
  }

  // Get messages for a conversation (polling fallback — bot messages only)
  async getMessages(conversationId: string, since?: Date): Promise<AiAgentMessage[]> {
    const response = await apiClient.get<AiAgentMessage[]>(
      `/ai-agents/messages/${conversationId}`,
      {
        timeout: AI_TIMEOUT_MS,
        ...(since ? { params: { dateOffset: since.toISOString() } } : {}),
      },
    );
    return Array.isArray(response.data) ? response.data : [];
  }

  // Get full conversation history (user + bot messages, chronological)
  async getConversationHistory(conversationId: string): Promise<ConversationHistoryMessage[]> {
    const response = await apiClient.get<ConversationHistoryMessage[]>(
      `/ai-agents/history/${conversationId}`,
      { timeout: AI_TIMEOUT_MS },
    );
    return Array.isArray(response.data) ? response.data : [];
  }

  // Start a brand-new conversation (ignore existing)
  async startNewConversation(): Promise<string> {
    const response = await apiClient.post<{ id: string }>(
      '/ai-agents/start/new',
      {},
      { timeout: AI_TIMEOUT_MS },
    );
    const id = response.data?.id;
    if (!id) {
      throw new Error('Server did not return a conversation ID.');
    }
    return id;
  }

  // Resume a specific conversation by ID
  async resumeConversation(conversationId: string): Promise<string> {
    const response = await apiClient.post<{ id: string }>(
      `/ai-agents/start/${conversationId}`,
      {},
      { timeout: AI_TIMEOUT_MS },
    );
    const id = response.data?.id;
    if (!id) {
      throw new Error('Server did not return a conversation ID.');
    }
    return id;
  }

  // Get stream URL for SSE
  getStreamUrl(conversationId: string): string {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/ai-agents/stream/${conversationId}`;
  }
}

export const aiChatService = new AiChatService();
