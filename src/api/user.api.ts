import { apiClient } from '../lib/api/client';
import { User } from '../lib/types/api';

export interface UpdateProfilePayload {
  email?: string;
  firstname?: string;
  lastname?: string;
  isPrivate?: boolean;
  avatar?: string;
}

export const userApi = {
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/user');
    return response.data;
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const response = await apiClient.patch('/user/profile', payload);
    return response.data;
  },

  changePassword: async (payload: { currentPassword: string; newPassword: string }): Promise<void> => {
    await apiClient.patch('/user/change-password', payload);
  },

  uploadAvatar: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/user/avatar', formData);
    return response.data;
  },

  getUserById: async (userId: string): Promise<User> => {
    const response = await apiClient.get(`/user/${userId}`);
    return response.data;
  },

  getAllUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/user/all');
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  },
};
