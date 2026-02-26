import { apiClient } from '../lib/api/client';
import { Consultation } from '../lib/types/api';

// Consultation API Adapter
export const consultationApi = {
  // Create consultation
  create: async (payload: {
    doctorId: number;
    soapId?: string;
  }): Promise<Consultation> => {
    const response = await apiClient.post('/consultation', payload);
    return response.data;
  },

  // List consultations (role-aware)
  list: async (params?: { page?: number; limit?: number; status?: string }): Promise<{ data: Consultation[]; total: number }> => {
    const response = await apiClient.get('/consultation', { params });
    return response.data;
  },

  // Get single consultation
  getById: async (id: string): Promise<Consultation> => {
    const response = await apiClient.get(`/consultation/${id}`);
    return response.data;
  },

  // Doctor decides consultation mode
  decide: async (id: string, payload: {
    doctorDecision: 'ASYNC' | 'ONLINE' | 'IN_PERSON';
    visitMethod?: 'CHAT' | 'VOICE_CALL' | 'VIDEO_CALL' | 'ON_SITE';
  }): Promise<Consultation> => {
    const response = await apiClient.patch(`/consultation/${id}/decide`, payload);
    return response.data;
  },

  // Complete consultation
  complete: async (id: string, payload: {
    notes?: string;
    summary?: string;
    followUpNeeded?: boolean;
  }): Promise<Consultation> => {
    const response = await apiClient.patch(`/consultation/${id}/complete`, payload);
    return response.data;
  },

  // Cancel consultation
  cancel: async (id: string, reason?: string): Promise<Consultation> => {
    const response = await apiClient.patch(`/consultation/${id}/cancel`, { reason });
    return response.data;
  },
};
