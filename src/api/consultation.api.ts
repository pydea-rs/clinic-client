import { apiClient } from '../lib/api/client';

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  soapId?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  doctorDecision?: 'ACCEPT' | 'REJECT';
  visitMethod?: string;
  notes?: string;
  summary?: string;
  followUpNeeded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsultationPayload {
  doctorId: string;
  soapId?: string;
}

export interface DoctorDecisionPayload {
  doctorDecision: 'ACCEPT' | 'REJECT';
  visitMethod?: string;
}

export interface CompleteConsultationPayload {
  notes?: string;
  summary?: string;
  followUpNeeded?: boolean;
}

export const consultationApi = {
  // Create consultation
  create: async (payload: CreateConsultationPayload): Promise<Consultation> => {
    const response = await apiClient.post('/consultation', payload);
    return response.data;
  },

  // Get consultation by ID
  getById: async (consultationId: string): Promise<Consultation> => {
    const response = await apiClient.get(`/consultation/${consultationId}`);
    return response.data;
  },

  // Get all consultations (role-aware)
  getAll: async (page?: number, limit?: number): Promise<{ consultations: Consultation[]; total: number }> => {
    const response = await apiClient.get('/consultation', {
      params: { page, limit },
    });
    return response.data;
  },

  // Doctor decision on consultation
  decide: async (consultationId: string, payload: DoctorDecisionPayload): Promise<Consultation> => {
    const response = await apiClient.post(`/consultation/${consultationId}/decide`, payload);
    return response.data;
  },

  // Complete consultation
  complete: async (consultationId: string, payload: CompleteConsultationPayload): Promise<Consultation> => {
    const response = await apiClient.post(`/consultation/${consultationId}/complete`, payload);
    return response.data;
  },

  // Cancel consultation
  cancel: async (consultationId: string): Promise<Consultation> => {
    const response = await apiClient.post(`/consultation/${consultationId}/cancel`, {});
    return response.data;
  },
};
