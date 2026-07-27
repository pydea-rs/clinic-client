import type { AxiosInstance } from 'axios';
import type { Payment, PaymentStatus } from '../lib/types/api';

export interface CreatePaymentPayload {
  amount: number;
  currency?: string;
  consultationId?: string;
  method?: string;
}

export function createPaymentApi(client: AxiosInstance) {
  return {
    create: async (payload: CreatePaymentPayload): Promise<Payment> => {
      const response = await client.post('/payment', payload);
      return response.data;
    },

    list: async (params?: { skip?: number; take?: number; status?: PaymentStatus }): Promise<{ data: Payment[]; total: number }> => {
      const response = await client.get('/payment', { params });
      return response.data;
    },

    getById: async (paymentId: number): Promise<Payment> => {
      const response = await client.get(`/payment/${paymentId}`);
      return response.data;
    },

    confirm: async (paymentId: number): Promise<Payment> => {
      const response = await client.post(`/payment/${paymentId}/confirm`);
      return response.data;
    },
  };
}

export type PaymentApi = ReturnType<typeof createPaymentApi>;
