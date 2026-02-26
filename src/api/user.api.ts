import { apiClient } from '../lib/api/client';

export interface UserProfile {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'SUPERADMIN';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  firstname?: string;
  lastname?: string;
  avatar?: string;
}

export const userApi = {
  // Get current user
  getCurrentUser: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/user');
    return response.data;
  },

  // Get user profile
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/user/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (payload: UpdateProfilePayload): Promise<UserProfile> => {
    const response = await apiClient.patch('/user/profile', payload);
    return response.data;
  },

  // Upload avatar
  uploadAvatar: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<UserProfile> => {
    const response = await apiClient.get(`/user/${userId}`);
    return response.data;
  },

  // Get all users (admin only)
  getAllUsers: async (page?: number, limit?: number): Promise<{ users: UserProfile[]; total: number }> => {
    const response = await apiClient.get('/user/all', {
      params: { page, limit },
    });
    return response.data;
  },
};
