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
      gradient: 'from-blue-600 to-indigo-600',
    },
    {
      label: 'Find a Doctor',
      description: 'Browse specialists',
      icon: Search,
      to: '/doctors',
      gradient: 'from-emerald-600 to-teal-600',
    },
    {
      label: 'Appointments',
      description: 'View your schedule',
      icon: Calendar,
      to: '/appointments',
      gradient: 'from-violet-600 to-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {actions.map((action) => (
        <Link
          key={action.to}
          to={action.to}
          className={`bg-gradient-to-br ${action.gradient} rounded-xl p-4 text-white transition-all hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5 btn-press`}
        >
          <action.icon className="w-5 h-5 mb-2.5 opacity-90" />
          <div className="font-medium text-sm">{action.label}</div>
          <div className="text-xs opacity-70 mt-0.5">{action.description}</div>
        </Link>
      ))}
    </div>
  );
};
