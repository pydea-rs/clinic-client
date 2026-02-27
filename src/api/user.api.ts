import { apiClient } from '../lib/api/client';

export interface UserProfile {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: 'NONE' | 'DOCTOR' | 'NURSE' | 'PATIENT';
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPrivate: boolean;
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  email?: string;
  firstname?: string;
  lastname?: string;
  isPrivate?: boolean;
  avatar?: string;
}

export const userApi = {
  // Get current user (GET /user)
  getCurrentUser: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/user');
    return response.data;
  },

  // Update user profile (PATCH /user/profile)
  updateProfile: async (payload: UpdateProfilePayload): Promise<UserProfile> => {
    const response = await apiClient.patch('/user/profile', payload);
    return response.data;
  },

  // Upload avatar (POST /user/avatar)
  uploadAvatar: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Get user by ID (GET /user/:id)
  getUserById: async (userId: string): Promise<UserProfile> => {
    const response = await apiClient.get(`/user/${userId}`);
    return response.data;
  },

  // Get all users - admin only (GET /user/all) - returns plain array
  getAllUsers: async (): Promise<UserProfile[]> => {
    const response = await apiClient.get('/user/all');
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  },
};
