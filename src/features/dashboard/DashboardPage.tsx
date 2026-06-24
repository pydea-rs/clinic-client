import React from 'react';
import { useAuthStore } from '../../lib/stores/auth.store';
import { QuickActions } from './components/QuickActions';
import { ConversationHistory } from './components/ConversationHistory';
import { RecentSOAPs } from './components/RecentSOAPs';
import { ActiveConsultations } from './components/ActiveConsultations';
import { FeaturedDoctors } from './components/FeaturedDoctors';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const isPatient = user?.role === 'PATIENT';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Welcome header */}
      <div className="animate-slide-in-up">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-purple-500 p-6 shadow-soft-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
          <div className="relative">
            <h1 className="text-xl font-bold text-white">
              {greeting}, {user?.firstname || 'User'}
            </h1>
            <p className="text-sm text-white/70 mt-1">
              {isPatient
                ? 'Chat with AI about your symptoms or connect with a doctor.'
                : 'Manage your consultations and schedule.'}
            </p>
          </div>
        </div>
      </div>

      <div className="animate-slide-in-up" style={{ animationDelay: '50ms' }}>
        <QuickActions />
      </div>

      {isPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
          <ConversationHistory />
          <RecentSOAPs />
        </div>
      )}

      <div className="animate-slide-in-up" style={{ animationDelay: '150ms' }}>
        <ActiveConsultations />
      </div>

      {isPatient && (
        <div className="animate-slide-in-up" style={{ animationDelay: '200ms' }}>
          <FeaturedDoctors />
        </div>
      )}
    </div>
  );
};
