import { apiClient } from '../lib/api/client';
import { Notification, PaginatedResponse } from '../lib/types/api';

export const notificationApi = {
  list: async (params?: { skip?: number; take?: number }): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get('/notification', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/notification/unread-count');
    return response.data?.count ?? 0;
  },

  markAsRead: async (notificationId: number): Promise<Notification> => {
    const response = await apiClient.patch(`/notification/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await apiClient.patch('/notification/read-all');
    return response.data;
  },

  subscribePush: async (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void> => {
    await apiClient.post('/notification/subscribe', subscription);
  },

  unsubscribePush: async (endpoint: string): Promise<void> => {
    await apiClient.delete('/notification/unsubscribe', { data: { endpoint } });
  },
};
