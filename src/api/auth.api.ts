import type { AxiosInstance } from 'axios';
import type { User } from '../lib/types/api';

export function createAuthApi(client: AxiosInstance) {
  return {
    login: async (email: string, password: string): Promise<void> => {
      await client.post('/auth/login', { email, password });
    },

    register: async (payload: {
      firstname: string;
      lastname: string;
      email: string;
      password: string;
      role?: 'PATIENT' | 'DOCTOR';
    }): Promise<void> => {
      await client.post('/auth/register', payload);
    },

    me: async (): Promise<User> => {
      const response = await client.get('/user');
      return response.data;
    },

    logout: async (): Promise<void> => {
      await client.post('/auth/logout');
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
