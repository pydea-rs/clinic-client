import { apiClient } from '../lib/api/client';
import { Payment, PaymentStatus } from '../lib/types/api';

export interface CreatePaymentPayload {
  amount: number;
  currency?: string;
  consultationId?: string;
  method?: string;
}

export const paymentApi = {
  create: async (payload: CreatePaymentPayload): Promise<Payment> => {
    const response = await apiClient.post('/payment', payload);
    return response.data;
  },

  list: async (params?: { skip?: number; take?: number; status?: PaymentStatus }): Promise<{ data: Payment[]; total: number }> => {
    const response = await apiClient.get('/payment', { params });
    return response.data;
  },

  getById: async (paymentId: number): Promise<Payment> => {
    const response = await apiClient.get(`/payment/${paymentId}`);
    return response.data;
  },

  confirm: async (paymentId: number): Promise<Payment> => {
    const response = await apiClient.post(`/payment/${paymentId}/confirm`);
    return response.data;
  },
};
