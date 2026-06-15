import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Search, Calendar } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const actions = [
    {
      label: 'New AI Chat',
      description: 'Describe your symptoms to our AI assistant',
      icon: Bot,
      to: '/ai/new',
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
    },
    {
      label: 'Find a Doctor',
      description: 'Browse our network of specialists',
      icon: Search,
      to: '/doctors',
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
    },
    {
      label: 'My Appointments',
      description: 'View upcoming and past appointments',
      icon: Calendar,
      to: '/appointments',
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {actions.map((action) => (
        <Link
          key={action.to}
          to={action.to}
          className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${action.color} ${action.hoverColor} p-5 text-white shadow-md transition-all hover:shadow-lg`}
        >
          <action.icon className="w-8 h-8 mb-3 opacity-90" />
          <h3 className="font-semibold text-lg">{action.label}</h3>
          <p className="text-sm opacity-80 mt-1">{action.description}</p>
        </Link>
      ))}
    </div>
  );
};
