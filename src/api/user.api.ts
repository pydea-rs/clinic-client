import type { AxiosInstance } from 'axios';
import type { User } from '../lib/types/api';

export interface UpdateProfilePayload {
  email?: string;
  firstname?: string;
  lastname?: string;
  isPrivate?: boolean;
  avatar?: string;
}

export function createUserApi(client: AxiosInstance) {
  return {
    getCurrentUser: async (): Promise<User> => {
      const response = await client.get('/user');
      return response.data;
    },

    updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
      const response = await client.patch('/user/profile', payload);
      return response.data;
    },

    changePassword: async (payload: { currentPassword: string; newPassword: string }): Promise<void> => {
      await client.patch('/user/change-password', payload);
    },

    uploadAvatar: async (file: File): Promise<{ id: string; avatar: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await client.post('/user/avatar', formData, {
        headers: { 'Content-Type': undefined },
      });
      return response.data;
    },

    getUserById: async (userId: string): Promise<User> => {
      const response = await client.get(`/user/${userId}`);
      return response.data;
    },

    getAllUsers: async (): Promise<User[]> => {
      const response = await client.get('/user/all');
      return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
    },

    searchUsers: async (query: string): Promise<Pick<User, 'id' | 'firstname' | 'lastname' | 'email' | 'role' | 'avatar'>[]> => {
      const response = await client.get('/user/search', { params: { q: query } });
      return response.data;
    },
  };
}

export type UserApi = ReturnType<typeof createUserApi>;
