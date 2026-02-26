import { apiClient } from '../lib/api/client';
import { PatientSOAP } from '../lib/types/api';

// SOAP API Adapter
export const soapApi = {
  // Get own SOAPs
  list: async (params?: { page?: number; limit?: number }): Promise<{ data: PatientSOAP[]; total: number }> => {
    const response = await apiClient.get('/soap', { params });
    return response.data;
  },

  // Get single SOAP by ID
  getById: async (id: string): Promise<PatientSOAP> => {
    const response = await apiClient.get(`/soap/${id}`);
    return response.data;
  },
};
