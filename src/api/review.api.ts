import { apiClient } from '../lib/api/client';
import { DoctorReview } from '../lib/types/api';

// Review API Adapter
export const reviewApi = {
  // Create review
  create: async (doctorId: number, payload: {
    title?: string;
    overview?: string;
    rating: number;
  }): Promise<DoctorReview> => {
    const response = await apiClient.post(`/review`, { doctorId, ...payload });
    return response.data;
  },

  // Update own review
  update: async (reviewId: number, payload: {
    title?: string;
    overview?: string;
    rating?: number;
  }): Promise<DoctorReview> => {
    const response = await apiClient.patch(`/review/${reviewId}`, payload);
    return response.data;
  },

  // Delete review
  delete: async (reviewId: number): Promise<void> => {
    await apiClient.delete(`/review/${reviewId}`);
  },

  // List reviews for doctor (public)
  listByDoctor: async (doctorId: number, params?: { page?: number; limit?: number }): Promise<{ data: DoctorReview[]; total: number }> => {
    const response = await apiClient.get(`/review/doctor/${doctorId}`, { params });
    return response.data;
  },

  // Get aggregate rating (public)
  getRating: async (doctorId: number): Promise<{ averageRating: number; totalReviews: number; distribution: Record<number, number> }> => {
    const response = await apiClient.get(`/review/doctor/${doctorId}/rating`);
    return response.data;
  },
};
