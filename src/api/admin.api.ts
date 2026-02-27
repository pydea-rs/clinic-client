import { apiClient } from '../lib/api/client';
import { User, PlatformStats } from '../lib/types/api';

// Admin API Adapter
export const adminApi = {
  // User management
  users: {
    list: async (params?: { skip?: number; take?: number; role?: string; search?: string; isActive?: boolean; isAdmin?: boolean }): Promise<{ data: User[]; total: number }> => {
      const response = await apiClient.get('/admin/users', { params });
      return response.data;
    },
    update: async (id: string, payload: {
      firstname?: string;
      lastname?: string;
      email?: string;
      role?: string;
      isActive?: boolean;
    }): Promise<User> => {
      const response = await apiClient.patch(`/admin/users/${id}`, payload);
      return response.data;
    },
    deactivate: async (id: string): Promise<User> => {
      const response = await apiClient.patch(`/admin/users/${id}/deactivate`);
      return response.data;
    },
  },

  // Doctor verification
  verifications: {
    listPending: async (): Promise<Array<{ doctorId: number; userId: string; documents: Array<{ id: number; type: string; fileUrl: string; status: string }> }>> => {
      const response = await apiClient.get('/admin/doctors/pending');
      return response.data;
    },
    getDocuments: async (doctorId: number): Promise<Array<{ id: number; type: string; fileUrl: string; fileName: string; status: string }>> => {
      const response = await apiClient.get(`/admin/doctors/${doctorId}/documents`);
      return response.data;
    },
    verify: async (doctorId: number, approved: boolean, reason?: string): Promise<{ verified: boolean; verifiedAt?: string; verifiedBy?: string; rejectionReason?: string }> => {
      const response = await apiClient.patch(`/admin/doctors/${doctorId}/verify`, { approved, reason });
      return response.data;
    },
  },

  // Superadmin actions
  adminActions: {
    promote: async (id: string): Promise<User> => {
      const response = await apiClient.patch(`/admin/users/${id}/promote`);
      return response.data;
    },
    demote: async (id: string): Promise<User> => {
      const response = await apiClient.patch(`/admin/users/${id}/demote`);
      return response.data;
    },
  },

  // Review moderation (delete only - no list endpoint exists)
  reviews: {
    delete: async (reviewId: number): Promise<void> => {
      await apiClient.delete(`/admin/reviews/${reviewId}`);
    },
  },

  // Platform stats
  stats: async (): Promise<PlatformStats> => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },
};
