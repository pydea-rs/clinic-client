import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../../api/doctor.api';
import { useAuthStore } from '../../lib/stores/auth.store';
import {
  Calendar, MessageSquare, Zap, Users, ClipboardList,
  Bot, Clock, UserPlus, ArrowRight, Activity, Loader2, Stethoscope,
  Sparkles, Heart,
} from 'lucide-react';

export const DoctorDashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['doctor-stats'],
    queryFn: () => doctorApi.getStats(),
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    {
      label: 'Upcoming Appointments',
      value: stats?.upcomingAppointments ?? 0,
      icon: Calendar,
      gradient: 'from-blue-500 to-brand-600',
      badgeClass: 'badge-blue',
    },
    {
      label: 'Active Consultations',
      value: stats?.activeConsultations ?? 0,
      icon: ClipboardList,
      gradient: 'from-emerald-500 to-green-600',
      badgeClass: 'badge-green',
    },
    {
      label: 'Pending Match Requests',
      value: stats?.pendingMatchRequests ?? 0,
      icon: Zap,
      gradient: 'from-amber-500 to-orange-600',
      badgeClass: 'badge-yellow',
    },
    {
      label: 'Patients Seen',
      value: stats?.totalPatientsSeen ?? 0,
      icon: Users,
      gradient: 'from-purple-500 to-violet-600',
      badgeClass: 'badge-purple',
    },
    {
      label: 'Completed Consultations',
      value: stats?.completedConsultations ?? 0,
      icon: Activity,
      gradient: 'from-teal-500 to-cyan-600',
      badgeClass: 'badge-blue',
    },
    {
      label: 'Total Appointments',
      value: stats?.totalAppointments ?? 0,
      icon: Clock,
      gradient: 'from-rose-500 to-pink-600',
      badgeClass: 'badge-red',
    },
  ];

  const quickActions = [
    {
      label: 'View Appointments',
      description: 'Manage your upcoming schedule',
      to: '/doctor/appointments',
      icon: Calendar,
      gradient: 'from-blue-500 to-brand-600',
    },
    {
      label: 'Consultations',
      description: 'Review patient consultations',
      to: '/doctor/consultations',
      icon: ClipboardList,
      gradient: 'from-emerald-500 to-green-600',
    },
    {
      label: 'Match Requests',
      description: 'Accept new patient matches',
      to: '/doctor/matching',
      icon: UserPlus,
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      label: 'AI Assistant',
      description: 'Chat with the AI assistant',
      to: '/ai',
      icon: Bot,
      gradient: 'from-purple-500 to-violet-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-gray-700 font-medium mb-1">Failed to load dashboard</p>
          <p className="text-sm text-gray-500 mb-4">Something went wrong while fetching your stats.</p>
          <button onClick={() => refetch()} className="btn-primary px-5 py-2.5">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 bg-mesh">
      {/* Welcome Banner */}
      <div className="animate-slide-up-spring">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-purple-500 p-6 shadow-soft-lg animate-gradient">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />

          {/* Morphing blob */}
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 blob animate-morph" />

          {/* Floating icons */}
          <Sparkles className="absolute top-4 right-20 w-5 h-5 text-white/20 animate-drift" style={{ animationDelay: '0s' }} />
          <Heart className="absolute bottom-3 right-36 w-4 h-4 text-white/20 animate-float-slow" style={{ animationDelay: '1.5s' }} />
          <Stethoscope className="absolute top-6 right-48 w-5 h-5 text-white/20 animate-drift" style={{ animationDelay: '3s' }} />

          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {greeting}, Dr. {user?.firstname || 'Doctor'}
              </h1>
              <p className="text-base text-white/70 mt-1">
                Here is an overview of your practice today.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="card p-6 animate-slide-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl shadow-soft flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className={`badge ${card.badgeClass} text-xs`}>
                  {card.value}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="animate-slide-up-spring" style={{ animationDelay: '200ms' }}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.to}
                className="card-interactive p-5 animate-slide-in-up group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`w-10 h-10 bg-gradient-to-br ${action.gradient} rounded-xl shadow-soft flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-1">
                  {action.label}
                  <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
