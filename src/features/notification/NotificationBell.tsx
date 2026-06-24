import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { notificationApi } from '../../api/notification.api';

export const NotificationBell: React.FC = () => {
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationApi.getUnreadCount,
    refetchInterval: 30000,
  });

  const count = unreadCount ?? 0;

  return (
    <Link
      to="/notifications"
      className="group relative p-2 hover:bg-brand-50 rounded-xl transition-colors"
      title="Notifications"
    >
      <Bell className="w-5 h-5 text-gray-600 group-hover:text-brand-600 transition-colors" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-rose-500 shadow-sm text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pop-in">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
};
