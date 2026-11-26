import type { AxiosInstance } from 'axios';
import type { PatientSOAP } from '../lib/types/api';

export function createSoapApi(client: AxiosInstance) {
  return {
    list: async (params?: { skip?: number; take?: number }): Promise<{ data: PatientSOAP[]; total: number; skip: number; take: number }> => {
      const response = await client.get('/soap', { params });
      return response.data;
    },

    getById: async (id: string): Promise<PatientSOAP> => {
      const response = await client.get(`/soap/${id}`);
      return response.data;
    },

    getByConversation: async (conversationId: string): Promise<PatientSOAP | null> => {
      const response = await client.get(`/soap/conversation/${encodeURIComponent(conversationId)}`);
      return response.data ?? null;
    },
  };
}

export type SoapApi = ReturnType<typeof createSoapApi>;
