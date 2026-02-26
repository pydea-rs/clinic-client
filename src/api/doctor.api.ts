import { apiClient } from '../lib/api/client';

export interface DoctorProfile {
  id: string;
  userId: string;
  specialty: string;
  secondarySpecialties?: string[];
  startedAt?: string;
  visitMethods?: string[];
  visitTypes?: string[];
  bio?: string;
  clinicLocation?: string;
  rating?: number;
  totalReviews?: number;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorRating {
  doctorId: string;
  averageRating: number;
  totalReviews: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface DoctorDocument {
  id: string;
  doctorId: string;
  type: string;
  url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const doctorApi = {
  // Get all doctors with filters
  getDoctors: async (params?: {
    specialty?: string;
    visitMethod?: string;
    location?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ doctors: DoctorProfile[]; total: number }> => {
    const response = await apiClient.get('/doctor', { params });
    return response.data;
  },

  // Get doctor by ID
  getDoctorById: async (doctorId: string): Promise<DoctorProfile> => {
    const response = await apiClient.get(`/doctor/${doctorId}`);
    return response.data;
  },

  // Get doctor rating
  getDoctorRating: async (doctorId: string): Promise<DoctorRating> => {
    const response = await apiClient.get(`/doctor/${doctorId}/rating`);
    return response.data;
  },

  // Create doctor profile
  createProfile: async (payload: Partial<DoctorProfile>): Promise<DoctorProfile> => {
    const response = await apiClient.post('/doctor', payload);
    return response.data;
  },

  // Update doctor profile
  updateProfile: async (payload: Partial<DoctorProfile>): Promise<DoctorProfile> => {
    const response = await apiClient.patch('/doctor', payload);
    return response.data;
  },

  // Upload document
  uploadDocument: async (file: File, documentType: string): Promise<DoctorDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', documentType);
    const response = await apiClient.post('/doctor/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Get doctor documents
  getDocuments: async (): Promise<DoctorDocument[]> => {
    const response = await apiClient.get('/doctor/documents');
    return response.data;
  },

  // Delete document
  deleteDocument: async (documentId: string): Promise<void> => {
    await apiClient.delete(`/doctor/documents/${documentId}`);
  },
};
