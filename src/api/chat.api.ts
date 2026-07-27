import type { AxiosInstance } from 'axios';
import type { Chat, Message } from '../lib/types/api';

export function createChatApi(client: AxiosInstance) {
  return {
    create: async (payload: {
      participantId: string;
      topic?: string;
      consultationId?: string;
    }): Promise<Chat> => {
      const response = await client.post('/chat', payload);
      return response.data;
    },

    list: async (): Promise<{ chats: Chat[]; total: number }> => {
      const response = await client.get('/chat');
      const result = response.data;
      if (result?.chats) return result;
      if (Array.isArray(result)) return { chats: result, total: result.length };
      return { chats: [], total: 0 };
    },

    getById: async (id: string): Promise<Chat & { participants?: Array<{ userId: string; joinedAt: string; lastSeenAt?: string }> }> => {
      const response = await client.get(`/chat/${id}`);
      return response.data;
    },

    getMessages: async (id: string, params?: { page?: number; limit?: number }): Promise<{ messages: Message[]; total: number }> => {
      const skip = params?.page ? (params.page - 1) * (params.limit || 20) : undefined;
      const response = await client.get(`/chat/${id}/messages`, { params: { skip, take: params?.limit } });
      const result = response.data;
      return { messages: result?.messages || result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },

    sendMessage: async (chatId: string, payload: {
      content: string;
      type?: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';
      fileUrl?: string;
      repliedToId?: string;
    }): Promise<Message> => {
      const response = await client.post(`/chat/${chatId}/message`, payload);
      return response.data;
    },
  };
}

export type ChatApi = ReturnType<typeof createChatApi>;
