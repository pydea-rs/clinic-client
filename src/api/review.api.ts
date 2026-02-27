import { apiClient } from '../lib/api/client';
import { DoctorReview } from '../lib/types/api';
import { DoctorRating } from './doctor.api';

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

export const reviewApi = {
  // Create review
  createReview: async (payload: CreateReviewPayload): Promise<DoctorReview> => {
    const response = await apiClient.post('/review', payload);
    return response.data;
  },

  // Update review
  updateReview: async (reviewId: number, payload: UpdateReviewPayload): Promise<DoctorReview> => {
    const response = await apiClient.patch(`/review/${reviewId}`, payload);
    return response.data;
  },

  // Delete review
  deleteReview: async (reviewId: number): Promise<void> => {
    await apiClient.delete(`/review/${reviewId}`);
  },

  // Get doctor reviews
  getDoctorReviews: async (
    doctorId: number,
    page?: number,
    limit?: number
  ): Promise<{ reviews: DoctorReview[]; total: number }> => {
    const skip = page ? (page - 1) * (limit || 20) : undefined;
    const response = await apiClient.get(`/review/doctor/${doctorId}`, {
      params: { skip, take: limit },
    });
    const result = response.data;
    return { reviews: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
  },

  // Get doctor rating
  getDoctorRating: async (doctorId: number): Promise<DoctorRating> => {
    const response = await apiClient.get(`/review/doctor/${doctorId}/rating`);
    return response.data;
  },
};
