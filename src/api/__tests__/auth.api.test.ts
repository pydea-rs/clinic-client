import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from '../auth.api';
import { apiClient } from '../../lib/api/client';
import { mockPatientUser, mockApiResponse } from '../../test/mockData';

vi.mock('../../lib/api/client');

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const credentials = { email: 'test@test.com', password: 'password123' };
      const mockResponse = { data: mockPatientUser };
      
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.login(credentials);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toEqual(mockPatientUser);
    });

    it('should throw error on invalid credentials', async () => {
      const credentials = { email: 'test@test.com', password: 'wrong' };
      const error = { status: 401, message: 'Invalid credentials' };
      
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(authApi.login(credentials)).rejects.toEqual(error);
    });
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const userData = {
        email: 'new@test.com',
        password: 'password123',
        firstname: 'New',
        lastname: 'User',
        role: 'PATIENT' as const,
      };
      const mockResponse = { data: mockPatientUser };
      
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.register(userData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', userData);
      expect(result).toEqual(mockPatientUser);
    });

    it('should throw error on duplicate email', async () => {
      const userData = {
        email: 'existing@test.com',
        password: 'password123',
        firstname: 'New',
        lastname: 'User',
        role: 'PATIENT' as const,
      };
      const error = { status: 409, message: 'Email already exists' };
      
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(authApi.register(userData)).rejects.toEqual(error);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockResponse = { data: { message: 'Logged out' } };
      
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await authApi.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('me', () => {
    it('should get current user successfully', async () => {
      const mockResponse = { data: mockPatientUser };
      
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authApi.me();

      expect(apiClient.get).toHaveBeenCalledWith('/user');
      expect(result).toEqual(mockPatientUser);
    });

    it('should throw error when not authenticated', async () => {
      const error = { status: 401, message: 'Not authenticated' };
      
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(authApi.me()).rejects.toEqual(error);
    });
  });
});
