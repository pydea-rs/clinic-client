import { apiClient } from '../lib/api/client';

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

export const aiAgentsApi = {
  listConversations: async (params?: {
    skip?: number;
    take?: number;
  }): Promise<AiConversationList> => {
    const response = await apiClient.get('/ai-agents/conversations', {
      params,
    });
    return response.data;
  },

  startNewConversation: async (): Promise<AiConversation> => {
    const response = await apiClient.post(
      '/ai-agents/start/new',
      {},
      { timeout: AI_TIMEOUT_MS },
    );
    return response.data;
  },

  resumeConversation: async (
    conversationId: string,
  ): Promise<AiConversation> => {
    const response = await apiClient.post(
      `/ai-agents/start/${conversationId}`,
      {},
      { timeout: AI_TIMEOUT_MS },
    );
    return response.data;
  },
};
