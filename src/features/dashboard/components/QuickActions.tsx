import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Search, Calendar } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const actions = [
    {
      label: 'New AI Chat',
      description: 'Describe your symptoms',
      icon: Bot,
      to: '/ai/new',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      label: 'Find a Doctor',
      description: 'Browse specialists',
      icon: Search,
      to: '/doctors',
      color: 'bg-emerald-600 hover:bg-emerald-700',
    },
    {
      label: 'Appointments',
      description: 'View your schedule',
      icon: Calendar,
      to: '/appointments',
      color: 'bg-violet-600 hover:bg-violet-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {actions.map((action) => (
        <Link
          key={action.to}
          to={action.to}
          className={`${action.color} rounded-xl p-4 text-white transition-colors`}
        >
          <action.icon className="w-6 h-6 mb-2 opacity-90" />
          <div className="font-medium text-sm">{action.label}</div>
          <div className="text-xs opacity-70 mt-0.5">{action.description}</div>
        </Link>
      ))}
    </div>
  );
};
