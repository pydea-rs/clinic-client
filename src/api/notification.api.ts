import type { AxiosInstance } from 'axios';
import type { Notification, PaginatedResponse } from '../lib/types/api';

export function createNotificationApi(client: AxiosInstance) {
  return {
    list: async (params?: { skip?: number; take?: number }): Promise<PaginatedResponse<Notification>> => {
      const response = await client.get('/notification', { params });
      return response.data;
    },

    getUnreadCount: async (): Promise<number> => {
      const response = await client.get('/notification/unread-count');
      return response.data?.count ?? 0;
    },

    markAsRead: async (notificationId: number): Promise<Notification> => {
      const response = await client.patch(`/notification/${notificationId}/read`);
      return response.data;
    },

    markAllAsRead: async (): Promise<{ count: number }> => {
      const response = await client.patch('/notification/read-all');
      return response.data;
    },

    subscribePush: async (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void> => {
      await client.post('/notification/subscribe', subscription);
    },

    unsubscribePush: async (endpoint: string): Promise<void> => {
      await client.delete('/notification/unsubscribe', { data: { endpoint } });
    },
  };
}

export type NotificationApi = ReturnType<typeof createNotificationApi>;
