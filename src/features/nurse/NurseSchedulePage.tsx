import React from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { useNurseAssignments } from './useNurseAssignments';

export const NurseSchedulePage: React.FC = () => {
  const { assignments, isLoading } = useNurseAssignments();
  const hasPermission = assignments.some((a) => a.permissions.includes('MANAGE_SCHEDULE'));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="text-center">
          <CalendarClock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">No Permission</h2>
          <p className="text-sm text-gray-500 mt-1">You don't have the Manage Schedule permission.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-soft">
          <CalendarClock className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Schedule Management</h1>
      </div>

      <div className="card p-8 text-center">
        <CalendarClock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Schedule management will be available after backend integration.</p>
        <p className="text-sm text-gray-400 mt-1">Pending N-08 implementation.</p>
      </div>
    </div>
  );
};
