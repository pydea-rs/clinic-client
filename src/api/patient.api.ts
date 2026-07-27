import type { AxiosInstance } from 'axios';
import type { Consultation, PatientSOAP, VisitMethod } from '../lib/types/api';

export interface PatientProfile {
  id: string;
  userId: string;
  location?: string;
  bio?: string;
  visitMethods?: VisitMethod[];
  medicalHistory?: string[];
  allergies?: string[];
  medications?: string[];
  surgeries?: string[];
  familyHistory?: string[];
  createdAt: string;
  updatedAt: string;
}

export function createPatientApi(client: AxiosInstance) {
  return {
    getProfile: async (): Promise<PatientProfile> => {
      const response = await client.get('/patient/profile');
      return response.data;
    },

    createProfile: async (payload: Partial<PatientProfile>): Promise<PatientProfile> => {
      const response = await client.post('/patient/profile', payload);
      return response.data;
    },

    updateProfile: async (payload: Partial<PatientProfile>): Promise<PatientProfile> => {
      const response = await client.patch('/patient/profile', payload);
      return response.data;
    },

    getConsultations: async (page?: number, limit?: number, status?: string): Promise<{ consultations: Consultation[]; total: number }> => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/patient/consultations', {
        params: { skip, take: limit, status: status || undefined },
      });
      const result = response.data;
      return { consultations: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },

    getSOAPs: async (page?: number, limit?: number): Promise<{ soaps: PatientSOAP[]; total: number }> => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/patient/soaps', {
        params: { skip, take: limit },
      });
      const result = response.data;
      return { soaps: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },

    getSOAPDetail: async (soapId: string): Promise<PatientSOAP> => {
      const response = await client.get(`/soap/${soapId}`);
      return response.data;
    },
  };
}

export type PatientApi = ReturnType<typeof createPatientApi>;
