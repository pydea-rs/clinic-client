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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstname || 'User'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isPatient
            ? 'Chat with AI about your symptoms or connect with a doctor.'
            : 'Manage your consultations and schedule.'}
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Two-column layout for conversations and SOAPs */}
      {isPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConversationHistory />
          <RecentSOAPs />
        </div>
      )}

      {/* Active Consultations */}
      <ActiveConsultations />

      {/* Featured Doctors (patient only) */}
      {isPatient && <FeaturedDoctors />}
    </div>
  );
};
