import { apiClient } from '../lib/api/client';
import { User } from '../lib/types/api';

// Auth API Adapter
export const authApi = {
  // Login
  login: async (email: string, password: string): Promise<void> => {
    await apiClient.post('/auth/login', { email, password });
  },

  // Register
  register: async (payload: {
    firstname: string;
    lastname?: string;
    email: string;
    password: string;
    role?: 'PATIENT' | 'DOCTOR';
  }): Promise<void> => {
    await apiClient.post('/auth/register', payload);
  },

  // Get current user
  me: async (): Promise<User> => {
    const response = await apiClient.get('/user');
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
