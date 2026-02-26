import { apiClient } from '../lib/api/client';
import { Consultation } from '../lib/types/api';

export interface CreateConsultationPayload {
  doctorId: number;
  soapId?: string;
}

export interface DecideConsultationPayload {
  doctorDecision: 'ASYNC' | 'ONLINE' | 'IN_PERSON';
  visitMethod: 'CHAT' | 'VOICE_CALL' | 'VIDEO_CALL' | 'ON_SITE';
}

export interface CompleteConsultationPayload {
  notes?: string;
  summary?: string;
  followUpNeeded: boolean;
}

export const consultationApi = {
  // Create consultation
  create: async (payload: CreateConsultationPayload): Promise<Consultation> => {
    const response = await apiClient.post('/consultation', payload);
    return response.data;
  },

  // Get consultations (role-aware)
  getConsultations: async (page?: number, limit?: number): Promise<{ consultations: Consultation[]; total: number }> => {
    const response = await apiClient.get('/consultation', {
      params: { page, limit },
    });
    return response.data;
  },

  // Get consultation by ID
  getConsultationById: async (consultationId: string): Promise<Consultation> => {
    const response = await apiClient.get(`/consultation/${consultationId}`);
    return response.data;
  },

  // Doctor decides on consultation
  decide: async (consultationId: string, payload: DecideConsultationPayload): Promise<Consultation> => {
    const response = await apiClient.patch(`/consultation/${consultationId}/decide`, payload);
    return response.data;
  },

  // Doctor completes consultation
  complete: async (consultationId: string, payload: CompleteConsultationPayload): Promise<Consultation> => {
    const response = await apiClient.patch(`/consultation/${consultationId}/complete`, payload);
    return response.data;
  },

  // Cancel consultation
  cancel: async (consultationId: string): Promise<Consultation> => {
    const response = await apiClient.patch(`/consultation/${consultationId}/cancel`);
    return response.data;
  },
};
