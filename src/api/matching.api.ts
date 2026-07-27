import type { AxiosInstance } from 'axios';
import type { MatchRequest, ScoredDoctor, DoctorSpecialty } from '../lib/types/api';

export interface CreateMatchRequestPayload {
  soapId?: string;
  specialty?: DoctorSpecialty;
}

export interface MatchRequestResponse {
  matchRequest: MatchRequest;
  doctors: ScoredDoctor[];
}

export function createMatchingApi(client: AxiosInstance) {
  return {
    createRequest: async (payload: CreateMatchRequestPayload): Promise<MatchRequestResponse> => {
      const response = await client.post('/matching/request', payload);
      return response.data;
    },

    getStatus: async (matchRequestId: string): Promise<MatchRequest> => {
      const response = await client.get(`/matching/status/${matchRequestId}`);
      return response.data;
    },

    getActive: async (): Promise<MatchRequest | null> => {
      const response = await client.get('/matching/active');
      return response.data || null;
    },

    getPending: async (): Promise<MatchRequest[]> => {
      const response = await client.get('/matching/pending');
      return response.data;
    },

    cancel: async (matchRequestId: string): Promise<MatchRequest> => {
      const response = await client.patch(`/matching/${matchRequestId}/cancel`);
      return response.data;
    },

    browse: async (matchRequestId: string): Promise<MatchRequest> => {
      const response = await client.patch(`/matching/${matchRequestId}/browse`);
      return response.data;
    },
  };
}

export type MatchingApi = ReturnType<typeof createMatchingApi>;
