import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../../api/notification.api';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Bell, BellRing, CheckCheck, MessageSquare, Calendar, FileText,
  Star, Shield, UserCheck, CreditCard, AlertCircle, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Notification, NotificationType } from '../../lib/types/api';

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  CONSULTATION_REQUEST: { icon: UserCheck, color: 'text-blue-600 bg-blue-100' },
  DOCTOR_DECISION: { icon: UserCheck, color: 'text-indigo-600 bg-indigo-100' },
  PAYMENT_CONFIRMED: { icon: CreditCard, color: 'text-green-600 bg-green-100' },
  APPOINTMENT_REMINDER: { icon: Calendar, color: 'text-amber-600 bg-amber-100' },
  APPOINTMENT_CANCELLED: { icon: Calendar, color: 'text-red-600 bg-red-100' },
  NEW_CHAT_MESSAGE: { icon: MessageSquare, color: 'text-sky-600 bg-sky-100' },
  NEW_REVIEW: { icon: Star, color: 'text-yellow-600 bg-yellow-100' },
  DOCTOR_VERIFIED: { icon: Shield, color: 'text-emerald-600 bg-emerald-100' },
  SOAP_READY: { icon: FileText, color: 'text-purple-600 bg-purple-100' },
  SYSTEM: { icon: Info, color: 'text-gray-600 bg-gray-100' },
};

function getNotificationLink(notification: Notification): string | null {
  const data = notification.data as Record<string, string> | undefined;
  const type = notification.type as NotificationType;

  if (type === 'CONSULTATION_REQUEST' || type === 'DOCTOR_DECISION') {
    return data?.consultationId ? `/consultation/${data.consultationId}` : null;
  }
  if (type === 'NEW_CHAT_MESSAGE') {
    return data?.chatId ? `/chat/${data.chatId}` : null;
  }
  if (type === 'APPOINTMENT_REMINDER' || type === 'APPOINTMENT_CANCELLED') {
    return '/appointments';
  }
  if (type === 'SOAP_READY') {
    return data?.conversationId ? `/ai/${data.conversationId}` : '/patient/soaps';
  }
  if (type === 'DOCTOR_VERIFIED') {
    return '/doctor/workspace';
  }
  if (type === 'NEW_REVIEW') {
    return '/doctor/workspace';
  }
  return null;
}

const NotificationItem: React.FC<{
  notification: Notification;
  onRead: (id: number) => void;
  onClick: (notification: Notification) => void;
}> = ({ notification, onRead, onClick }) => {
  const config = typeConfig[notification.type] || typeConfig.SYSTEM;
  const Icon = config.icon;
  const timeAgo = getTimeAgo(notification.createdAt);

  return (
    <div
      onClick={() => onClick(notification)}
      className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
        notification.isRead ? 'bg-white' : 'bg-brand-50/50'
      } hover:bg-gray-50 border-b border-gray-100 last:border-b-0`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${notification.isRead ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <button
              onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
              className="text-xs text-brand-600 hover:text-brand-700 whitespace-nowrap flex-shrink-0"
            >
              Mark read
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.body}</p>
        <p className="text-[11px] text-gray-400 mt-1">{timeAgo}</p>
      </div>
      {!notification.isRead && (
        <div className="w-2 h-2 bg-brand-500 animate-breathe rounded-full flex-shrink-0 mt-2" />
      )}
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const NotificationPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationApi.list({ skip: (page - 1) * limit, take: limit }),
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationApi.getUnreadCount,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Failed to mark notification as read');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: (result) => {
      toast.success(`Marked ${result?.count ?? 0} notifications as read`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Failed to mark all as read');
    },
  });

  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    const link = getNotificationLink(notification);
    if (link) navigate(link);
  };

  const notifications = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-blue-500 rounded-xl flex items-center justify-center shadow-soft">
            <BellRing className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {(unreadCount ?? 0) > 0 && (
            <span className="badge badge-blue">
              {unreadCount} unread
            </span>
          )}
        </div>
        {(unreadCount ?? 0) > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No Notifications</h3>
            <p className="text-gray-500 text-sm">You're all caught up!</p>
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={(id) => markReadMutation.mutate(id)}
              onClick={handleClick}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
