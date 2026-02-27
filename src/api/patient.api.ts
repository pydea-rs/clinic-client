import { apiClient } from '../lib/api/client';
import { Consultation, PatientSOAP } from '../lib/types/api';

export interface PatientProfile {
  id: string;
  userId: string;
  location?: string;
  bio?: string;
  medicalHistory?: string[];
  allergies?: string[];
  medications?: string[];
  surgeries?: string[];
  familyHistory?: string[];
  createdAt: string;
  updatedAt: string;
}

export const patientApi = {
  // Get patient profile
  getProfile: async (): Promise<PatientProfile> => {
    const response = await apiClient.get('/patient/profile');
    return response.data;
  },

  // Create patient profile
  createProfile: async (payload: Partial<PatientProfile>): Promise<PatientProfile> => {
    const response = await apiClient.post('/patient/profile', payload);
    return response.data;
  },

  // Update patient profile
  updateProfile: async (payload: Partial<PatientProfile>): Promise<PatientProfile> => {
    const response = await apiClient.patch('/patient/profile', payload);
    return response.data;
  },

  // Get patient consultations
  getConsultations: async (page?: number, limit?: number): Promise<{ consultations: Consultation[]; total: number }> => {
    const skip = page ? (page - 1) * (limit || 20) : undefined;
    const response = await apiClient.get('/patient/consultations', {
      params: { skip, take: limit },
    });
    const result = response.data;
    return { consultations: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
  },

  // Get patient SOAPs
  getSOAPs: async (page?: number, limit?: number): Promise<{ soaps: PatientSOAP[]; total: number }> => {
    const skip = page ? (page - 1) * (limit || 20) : undefined;
    const response = await apiClient.get('/patient/soaps', {
      params: { skip, take: limit },
    });
    const result = response.data;
    return { soaps: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
  },

  // Get SOAP detail
  getSOAPDetail: async (soapId: string): Promise<PatientSOAP> => {
    const response = await apiClient.get(`/soap/${soapId}`);
    return response.data;
  },
};
