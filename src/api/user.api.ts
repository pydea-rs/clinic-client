import { apiClient } from '../lib/api/client';
import { User } from '../lib/types/api';

// User API Adapter
export const userApi = {
  // Get current user
  getCurrent: async (): Promise<User> => {
    const response = await apiClient.get('/user');
    return response.data;
  },

  // Update own profile
  updateProfile: async (payload: {
    firstname?: string;
    lastname?: string;
    email?: string;
    isPrivate?: boolean;
    avatar?: string;
  }): Promise<User> => {
    const response = await apiClient.patch('/user/profile', payload);
    return response.data;
  },

  // Upload avatar
  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Get user by ID
  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/user/${id}`);
    return response.data;
  },

  // Get all users (admin only)
  getAll: async (params?: { page?: number; limit?: number; role?: string }): Promise<User[]> => {
    const response = await apiClient.get('/user/all', { params });
    return response.data;
  },
};
