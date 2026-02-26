import { apiClient } from '../lib/api/client';
import { PatientProfile, Consultation, PatientSOAP } from '../lib/types/api';

// Patient API Adapter
export const patientApi = {
  // Create patient profile
  createProfile: async (payload: {
    location?: string;
    visitMethods?: string[];
    bio?: string;
    medicalHistory?: string[];
    allergies?: string[];
    medications?: string[];
    surgeries?: string[];
    familyHistory?: string[];
  }): Promise<PatientProfile> => {
    const response = await apiClient.post('/patient/profile', payload);
    return response.data;
  },

  // Update patient profile
  updateProfile: async (payload: {
    location?: string;
    visitMethods?: string[];
    bio?: string;
    medicalHistory?: string[];
    allergies?: string[];
    medications?: string[];
    surgeries?: string[];
    familyHistory?: string[];
  }): Promise<PatientProfile> => {
    const response = await apiClient.patch('/patient/profile', payload);
    return response.data;
  },

  // Get own patient profile
  getProfile: async (): Promise<PatientProfile> => {
    const response = await apiClient.get('/patient/profile');
    return response.data;
  },

  // Get own consultations
  getConsultations: async (params?: { page?: number; limit?: number; status?: string }): Promise<{ data: Consultation[]; total: number }> => {
    const response = await apiClient.get('/patient/consultations', { params });
    return response.data;
  },

  // Get own SOAPs
  getSoaps: async (params?: { page?: number; limit?: number }): Promise<{ data: PatientSOAP[]; total: number }> => {
    const response = await apiClient.get('/patient/soaps', { params });
    return response.data;
  },
};
