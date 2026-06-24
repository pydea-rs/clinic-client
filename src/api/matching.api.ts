import { apiClient } from '../lib/api/client';
import { MatchRequest, ScoredDoctor, DoctorSpecialty } from '../lib/types/api';

export interface CreateMatchRequestPayload {
  soapId?: string;
  specialty?: DoctorSpecialty;
}

export interface MatchRequestResponse {
  matchRequest: MatchRequest;
  doctors: ScoredDoctor[];
}

export const matchingApi = {
  createRequest: async (payload: CreateMatchRequestPayload): Promise<MatchRequestResponse> => {
    const response = await apiClient.post('/matching/request', payload);
    return response.data;
  },

  getStatus: async (matchRequestId: string): Promise<MatchRequest> => {
    const response = await apiClient.get(`/matching/status/${matchRequestId}`);
    return response.data;
  },

  getActive: async (): Promise<MatchRequest | null> => {
    const response = await apiClient.get('/matching/active');
    return response.data || null;
  },

  getPending: async (): Promise<MatchRequest[]> => {
    const response = await apiClient.get('/matching/pending');
    return response.data;
  },

  cancel: async (matchRequestId: string): Promise<MatchRequest> => {
    const response = await apiClient.patch(`/matching/${matchRequestId}/cancel`);
    return response.data;
  },

  browse: async (matchRequestId: string): Promise<MatchRequest> => {
    const response = await apiClient.patch(`/matching/${matchRequestId}/browse`);
    return response.data;
  },
};
