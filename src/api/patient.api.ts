import { apiClient } from '../lib/api/client';

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

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface SOAP {
  id: string;
  conversationId: string;
  patientId: string;
  doctorId?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  triage?: string;
  specialty?: string;
  rawNote?: string;
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
    const response = await apiClient.get('/patient/consultations', {
      params: { page, limit },
    });
    return response.data;
  },

  // Get patient SOAPs
  getSOAPs: async (page?: number, limit?: number): Promise<{ soaps: SOAP[]; total: number }> => {
    const response = await apiClient.get('/patient/soaps', {
      params: { page, limit },
    });
    return response.data;
  },

  // Get SOAP detail
  getSOAPDetail: async (soapId: string): Promise<SOAP> => {
    const response = await apiClient.get(`/patient/soaps/${soapId}`);
    return response.data;
  },
};
