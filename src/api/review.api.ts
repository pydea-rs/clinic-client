import type { AxiosInstance } from 'axios';
import type { DoctorReview, DoctorRating } from '../lib/types/api';

export interface CreateReviewPayload {
  doctorId: number;
  title?: string;
  overview?: string;
  rating: number;
}

export interface UpdateReviewPayload {
  title?: string;
  overview?: string;
  rating?: number;
}

export function createReviewApi(client: AxiosInstance) {
  return {
    createReview: async (payload: CreateReviewPayload): Promise<DoctorReview> => {
      const response = await client.post('/review', payload);
      return response.data;
    },

    updateReview: async (reviewId: number, payload: UpdateReviewPayload): Promise<DoctorReview> => {
      const response = await client.patch(`/review/${reviewId}`, payload);
      return response.data;
    },

    deleteReview: async (reviewId: number): Promise<void> => {
      await client.delete(`/review/${reviewId}`);
    },

    getDoctorReviews: async (
      doctorId: number,
      page?: number,
      limit?: number
    ): Promise<{ reviews: DoctorReview[]; total: number }> => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get(`/review/doctor/${doctorId}`, {
        params: { skip, take: limit },
      });
      const result = response.data;
      return { reviews: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },

    getAllReviews: async (
      page?: number,
      limit?: number,
    ): Promise<{ reviews: DoctorReview[]; total: number }> => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/review/admin/all', {
        params: { skip, take: limit },
      });
      const result = response.data;
      return { reviews: result?.data || [], total: result?.total || 0 };
    },

    getDoctorRating: async (doctorId: number): Promise<DoctorRating> => {
      const response = await client.get(`/review/doctor/${doctorId}/rating`);
      return response.data;
    },
  };
}

export type ReviewApi = ReturnType<typeof createReviewApi>;
