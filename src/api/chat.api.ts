import { apiClient } from '../lib/api/client';
import { Chat, Message } from '../lib/types/api';

// Chat API Adapter
export const chatApi = {
  // Create chat
  create: async (payload: {
    participantId: string;
    topic?: string;
    consultationId?: string;
  }): Promise<Chat> => {
    const response = await apiClient.post('/chat', payload);
    return response.data;
  },

  // List user's chats
  list: async (): Promise<{ chats: Chat[]; total: number }> => {
    const response = await apiClient.get('/chat');
    const result = response.data;
    // Server returns { chats: [...], total: N }
    if (result?.chats) return result;
    // Fallback if server returns array directly
    if (Array.isArray(result)) return { chats: result, total: result.length };
    return { chats: [], total: 0 };
  },

  // Get single chat
  getById: async (id: string): Promise<Chat & { participants?: Array<{ userId: string; joinedAt: string; lastSeenAt?: string }> }> => {
    const response = await apiClient.get(`/chat/${id}`);
    return response.data;
  },

  // Get chat messages
  getMessages: async (id: string, params?: { page?: number; limit?: number }): Promise<{ messages: Message[]; total: number }> => {
    const skip = params?.page ? (params.page - 1) * (params.limit || 20) : undefined;
    const response = await apiClient.get(`/chat/${id}/messages`, { params: { skip, take: params?.limit } });
    const result = response.data;
    return { messages: result?.messages || result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
  },

  // Send message
  sendMessage: async (chatId: string, payload: {
    content: string;
    type?: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';
    fileUrl?: string;
  }): Promise<Message> => {
    const response = await apiClient.post(`/chat/${chatId}/message`, payload);
    return response.data;
  },
};
