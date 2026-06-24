import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Search, Calendar, ArrowRight } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const actions = [
    {
      label: 'New AI Chat',
      description: 'Describe your symptoms',
      icon: Bot,
      to: '/ai/new',
      gradient: 'from-blue-600 to-indigo-600',
      glow: 'hover:shadow-blue-500/25',
    },
    {
      label: 'Find a Doctor',
      description: 'Browse specialists',
      icon: Search,
      to: '/doctors',
      gradient: 'from-emerald-600 to-teal-600',
      glow: 'hover:shadow-emerald-500/25',
    },
    {
      label: 'Appointments',
      description: 'View your schedule',
      icon: Calendar,
      to: '/appointments',
      gradient: 'from-violet-600 to-purple-600',
      glow: 'hover:shadow-violet-500/25',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {actions.map((action) => (
        <Link
          key={action.to}
          to={action.to}
          className={`group relative overflow-hidden bg-gradient-to-br ${action.gradient} rounded-2xl p-5 text-white transition-all duration-300 ease-spring hover:shadow-xl ${action.glow} hover:-translate-y-1 btn-press`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 transition-transform duration-500 group-hover:scale-150" />
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110">
            <action.icon className="w-5 h-5" />
          </div>
          <div className="font-semibold text-sm">{action.label}</div>
          <div className="text-xs opacity-70 mt-0.5">{action.description}</div>
          <ArrowRight className="w-4 h-4 absolute bottom-4 right-4 opacity-0 translate-x-2 transition-all duration-300 group-hover:opacity-70 group-hover:translate-x-0" />
        </Link>
      ))}
    </div>
  );
};
