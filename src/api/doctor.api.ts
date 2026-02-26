import { apiClient } from '../lib/api/client';
import { DoctorProfile, DoctorReview } from '../lib/types/api';

// Doctor API Adapter
export const doctorApi = {
  // Create doctor profile
  createProfile: async (payload: {
    specialty: string;
    secondarySpecialties?: string[];
    startedAt: string;
    university?: string;
    location?: string;
    clinicLocation?: string;
    bio?: string;
    visitMethods: string[];
    visitTypes: string[];
  }): Promise<DoctorProfile> => {
    const response = await apiClient.post('/doctor', payload);
    return response.data;
  },

  // Update own profile
  updateProfile: async (payload: {
    specialty?: string;
    secondarySpecialties?: string[];
    startedAt?: string;
    university?: string;
    location?: string;
    clinicLocation?: string;
    bio?: string;
    visitMethods?: string[];
    visitTypes?: string[];
  }): Promise<DoctorProfile> => {
    const response = await apiClient.patch('/doctor/profile', payload);
    return response.data;
  },

  // Upload document
  uploadDocument: async (file: File, type: 'LICENSE' | 'ID_CARD' | 'CERTIFICATION' | 'PHOTO' | 'OTHER'): Promise<{ url: string; fileName: string; mimeType: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const response = await apiClient.post('/doctor/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Get own documents
  getDocuments: async (): Promise<Array<{ id: number; type: string; fileUrl: string; fileName: string; status: string }>> => {
    const response = await apiClient.get('/doctor/documents');
    return response.data;
  },

  // List verified doctors (public)
  list: async (params?: {
    specialty?: string;
    visitMethods?: string[];
    location?: string;
    name?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: DoctorProfile[]; total: number }> => {
    const response = await apiClient.get('/doctor', { params });
    return response.data;
  },

  // Get single doctor profile (public)
  getById: async (id: number): Promise<DoctorProfile & { rating?: { average: number; count: number } }> => {
    const response = await apiClient.get(`/doctor/${id}`);
    return response.data;
  },

  // Get doctor rating (public)
  getRating: async (id: number): Promise<{ averageRating: number; totalReviews: number; distribution: Record<number, number> }> => {
    const response = await apiClient.get(`/doctor/${id}/rating`);
    return response.data;
  },
};
