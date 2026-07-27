import type { AxiosInstance } from 'axios';
import type { User, PlatformStats } from '../lib/types/api';

export function createAdminApi(client: AxiosInstance) {
  return {
    users: {
      list: async (params?: { skip?: number; take?: number; role?: string; search?: string; isActive?: boolean; isAdmin?: boolean; isBanned?: boolean }): Promise<{ data: User[]; total: number }> => {
        const response = await client.get('/admin/users', { params });
        return response.data;
      },
      update: async (id: string, payload: {
        firstname?: string;
        lastname?: string;
        email?: string;
        role?: string;
        isActive?: boolean;
        isPrivate?: boolean;
      }): Promise<User> => {
        const response = await client.patch(`/admin/users/${id}`, payload);
        return response.data;
      },
      deactivate: async (id: string): Promise<User> => {
        const response = await client.patch(`/admin/users/${id}/deactivate`);
        return response.data;
      },
      ban: async (id: string, reason: string): Promise<User> => {
        const response = await client.patch(`/admin/users/${id}/ban`, { reason });
        return response.data;
      },
      unban: async (id: string): Promise<User> => {
        const response = await client.patch(`/admin/users/${id}/unban`);
        return response.data;
      },
    },

    verifications: {
      listPending: async (): Promise<Array<{ doctorId: number; userId: string; documents: Array<{ id: number; type: string; fileUrl: string; status: string }> }>> => {
        const response = await client.get('/admin/doctors/pending');
        return response.data;
      },
      getDocuments: async (doctorId: number): Promise<Array<{ id: number; type: string; fileUrl: string; fileName: string; status: string }>> => {
        const response = await client.get(`/admin/doctors/${doctorId}/documents`);
        return response.data;
      },
      verify: async (doctorId: number, approved: boolean, reason?: string): Promise<{ verified: boolean; verifiedAt?: string; verifiedBy?: string; rejectionReason?: string }> => {
        const response = await client.patch(`/admin/doctors/${doctorId}/verify`, { approved, reason });
        return response.data;
      },
    },

    adminActions: {
      promote: async (id: string): Promise<User> => {
        const response = await client.patch(`/admin/users/${id}/promote`);
        return response.data;
      },
      demote: async (id: string): Promise<User> => {
        const response = await client.patch(`/admin/users/${id}/demote`);
        return response.data;
      },
    },

    reviews: {
      delete: async (reviewId: number): Promise<void> => {
        await client.delete(`/admin/reviews/${reviewId}`);
      },
    },

    stats: async (): Promise<PlatformStats> => {
      const response = await client.get('/admin/stats');
      return response.data;
    },
  };
}

export type AdminApi = ReturnType<typeof createAdminApi>;
