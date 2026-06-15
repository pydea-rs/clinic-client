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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Welcome back, {user?.firstname || 'User'}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {isPatient
            ? 'Chat with AI about your symptoms or connect with a doctor.'
            : 'Manage your consultations and schedule.'}
        </p>
      </div>

      <QuickActions />

      {isPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConversationHistory />
          <RecentSOAPs />
        </div>
      )}

      <ActiveConsultations />

      {isPatient && <FeaturedDoctors />}
    </div>
  );
};
