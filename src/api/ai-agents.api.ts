import type { AxiosInstance } from 'axios';

export interface AiConversationSoap {
  id: string;
  suggestedSpecialty: string | null;
  triageLevel: string | null;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  userId: string;
  topic: string | null;
  agentType: string;
  createdAt: string;
  soap: AiConversationSoap | null;
}

export interface AiConversationList {
  data: AiConversation[];
  total: number;
  skip: number;
  take: number;
}

const AI_TIMEOUT_MS = 60_000;

export function createAiAgentsApi(client: AxiosInstance) {
  return {
    listConversations: async (params?: {
      skip?: number;
      take?: number;
    }): Promise<AiConversationList> => {
      const response = await client.get('/ai-agents/conversations', {
        params,
      });
      return response.data;
    },

    startNewConversation: async (): Promise<AiConversation> => {
      const response = await client.post(
        '/ai-agents/start/new',
        {},
        { timeout: AI_TIMEOUT_MS },
      );
      return response.data;
    },

    resumeConversation: async (
      conversationId: string,
    ): Promise<AiConversation> => {
      const response = await client.post(
        `/ai-agents/start/${conversationId}`,
        {},
        { timeout: AI_TIMEOUT_MS },
      );
      return response.data;
    },

    renameConversation: async (
      conversationId: string,
      topic: string,
    ): Promise<AiConversation> => {
      const response = await client.patch(
        `/ai-agents/conversations/${conversationId}/rename`,
        { topic },
      );
      return response.data;
    },

    sendMessage: async (conversationId: string, text: string): Promise<unknown> => {
      const response = await client.post('/ai-agents/message', { conversationId, text });
      return response.data;
    },

    getMessages: async (conversationId: string, dateOffset?: string): Promise<unknown> => {
      const response = await client.get(`/ai-agents/messages/${conversationId}`, { params: { dateOffset } });
      return response.data;
    },

    getHistory: async (conversationId: string): Promise<unknown> => {
      const response = await client.get(`/ai-agents/history/${conversationId}`);
      return response.data;
    },

    startConversation: async (): Promise<AiConversation> => {
      const response = await client.post('/ai-agents/start', {}, { timeout: AI_TIMEOUT_MS });
      return response.data;
    },

    openaiChat: async (message: string): Promise<unknown> => {
      const response = await client.post('/ai-agents/openai', { message });
      return response.data;
    },
  };
}

export type AiAgentsApi = ReturnType<typeof createAiAgentsApi>;
