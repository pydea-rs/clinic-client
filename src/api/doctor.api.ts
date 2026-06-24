import { apiClient } from '../lib/api/client';
import { DoctorProfile, DoctorRating, DoctorDocument } from '../lib/types/api';

export type { DoctorProfile, DoctorRating, DoctorDocument };

export const doctorApi = {
  getDoctors: async (params?: {
    specialty?: string;
    visitMethod?: string;
    location?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ doctors: DoctorProfile[]; total: number }> => {
    const { page, limit, ...rest } = params || {};
    const skip = page ? (page - 1) * (limit || 20) : undefined;
    const response = await apiClient.get('/doctor', { params: { ...rest, skip, take: limit } });
    const result = response.data;
    return { doctors: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
  },

  getDoctorById: async (doctorId: number | string): Promise<DoctorProfile> => {
    const response = await apiClient.get(`/doctor/${doctorId}`);
    return response.data;
  },

  getDoctorRating: async (doctorId: number | string): Promise<DoctorRating> => {
    const response = await apiClient.get(`/doctor/${doctorId}/rating`);
    return response.data;
  },

  createProfile: async (payload: Partial<DoctorProfile>): Promise<DoctorProfile> => {
    const response = await apiClient.post('/doctor', payload);
    return response.data;
  },

  updateProfile: async (payload: Partial<DoctorProfile>): Promise<DoctorProfile> => {
    const response = await apiClient.patch('/doctor/profile', payload);
    return response.data;
  },

  uploadDocument: async (file: File, documentType: string): Promise<DoctorDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', documentType);
    const response = await apiClient.post('/doctor/documents', formData);
    return response.data;
  },

  getDocuments: async (): Promise<DoctorDocument[]> => {
    const response = await apiClient.get('/doctor/documents');
    return response.data;
  },

  deleteDocument: async (documentId: number): Promise<void> => {
    await apiClient.delete(`/doctor/documents/${documentId}`);
  },
};
