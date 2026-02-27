import { apiClient } from '../lib/api/client';
import { PatientSOAP } from '../lib/types/api';

// SOAP API Adapter
export const soapApi = {
  // Get own SOAPs (GET /soap with skip/take pagination)
  list: async (params?: { skip?: number; take?: number }): Promise<{ data: PatientSOAP[]; total: number }> => {
    const response = await apiClient.get('/soap', { params });
    return response.data;
  },

  // Get single SOAP by ID (GET /soap/:id)
  getById: async (id: string): Promise<PatientSOAP> => {
    const response = await apiClient.get(`/soap/${id}`);
    return response.data;
  },
};
