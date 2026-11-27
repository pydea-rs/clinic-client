import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { notificationApi } from '../../api';

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
      className="group relative p-2 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-xl transition-all duration-200"
      title="Notifications"
      aria-label="Notifications"
    >
      <Bell className={`w-5 h-5 text-gray-500 dark:text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors ${count > 0 ? 'group-hover:animate-wiggle' : ''}`} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-rose-500 shadow-sm ring-2 ring-white dark:ring-slate-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-notification-pulse">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
};
