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
  list: async (): Promise<Chat[]> => {
    const response = await apiClient.get('/chat');
    return response.data;
  },

  // Get single chat
  getById: async (id: string): Promise<Chat & { participants?: Array<{ userId: string; joinedAt: string; lastSeenAt?: string }> }> => {
    const response = await apiClient.get(`/chat/${id}`);
    return response.data;
  },

  // Get chat messages
  getMessages: async (id: string, params?: { page?: number; limit?: number }): Promise<{ data: Message[]; total: number }> => {
    const response = await apiClient.get(`/chat/${id}/messages`, { params });
    return response.data;
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
