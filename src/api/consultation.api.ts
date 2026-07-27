import type { AxiosInstance } from 'axios';
import type { Consultation } from '../lib/types/api';

export interface CreateConsultationPayload {
  doctorId: number;
  soapId?: string;
}

export interface DecideConsultationPayload {
  doctorDecision: 'ASYNC' | 'ONLINE' | 'IN_PERSON';
  visitMethod?: 'CHAT' | 'VOICE_CALL' | 'VIDEO_CALL' | 'ON_SITE';
}

export interface CompleteConsultationPayload {
  notes?: string;
  summary?: string;
  followUpNeeded?: boolean;
}

export function createConsultationApi(client: AxiosInstance) {
  return {
    create: async (payload: CreateConsultationPayload): Promise<Consultation> => {
      const response = await client.post('/consultation', payload);
      return response.data;
    },

    getConsultations: async (page?: number, limit?: number, status?: string): Promise<{ consultations: Consultation[]; total: number }> => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/consultation', {
        params: { skip, take: limit, status },
      });
      const result = response.data;
      return { consultations: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },

    getConsultationById: async (consultationId: string): Promise<Consultation> => {
      const response = await client.get(`/consultation/${consultationId}`);
      return response.data;
    },

    decide: async (consultationId: string, payload: DecideConsultationPayload): Promise<Consultation> => {
      const response = await client.patch(`/consultation/${consultationId}/decide`, payload);
      return response.data;
    },

    complete: async (consultationId: string, payload: CompleteConsultationPayload): Promise<Consultation> => {
      const response = await client.patch(`/consultation/${consultationId}/complete`, payload);
      return response.data;
    },

    advancePayment: async (consultationId: string): Promise<Consultation> => {
      const response = await client.patch(`/consultation/${consultationId}/advance-payment`);
      return response.data;
    },

    confirmPayment: async (consultationId: string): Promise<Consultation> => {
      const response = await client.patch(`/consultation/${consultationId}/confirm-payment`);
      return response.data;
    },

    start: async (consultationId: string): Promise<Consultation> => {
      const response = await client.patch(`/consultation/${consultationId}/start`);
      return response.data;
    },

    cancel: async (consultationId: string): Promise<Consultation> => {
      const response = await client.patch(`/consultation/${consultationId}/cancel`);
      return response.data;
    },
  };
}

export type ConsultationApi = ReturnType<typeof createConsultationApi>;
