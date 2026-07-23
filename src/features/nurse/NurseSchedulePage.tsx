import React, { useState } from 'react';
import { CalendarClock, Loader2, Clock, CalendarOff, Timer } from 'lucide-react';
import { useNurseAssignments } from './useNurseAssignments';
import { AvailabilityPanel } from '../scheduling/AvailabilityPanel';
import { SlotDurationsPanel } from '../scheduling/SlotDurationsPanel';
import { ExceptionsPanel } from '../scheduling/ExceptionsPanel';

type Tab = 'availability' | 'durations' | 'exceptions';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'availability', label: 'Availability', icon: <Clock className="w-4 h-4" /> },
  { key: 'durations', label: 'Slot Durations', icon: <Timer className="w-4 h-4" /> },
  { key: 'exceptions', label: 'Exceptions', icon: <CalendarOff className="w-4 h-4" /> },
];

export const NurseSchedulePage: React.FC = () => {
  const { assignments, isLoading } = useNurseAssignments();
  const hasPermission = assignments.some((a) => a.permissions.includes('MANAGE_SCHEDULE'));
  const [activeTab, setActiveTab] = useState<Tab>('availability');

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

  const doctorAssignment = assignments.find((a) => a.permissions.includes('MANAGE_SCHEDULE'));
  const doctorName = doctorAssignment?.doctor?.user
    ? `Dr. ${doctorAssignment.doctor.user.firstname} ${doctorAssignment.doctor.user.lastname}`
    : 'Assigned Doctor';

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-soft">
          <CalendarClock className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Schedule Management</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-[52px]">Managing schedule for {doctorName}</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'availability' && <AvailabilityPanel doctorId={doctorAssignment?.doctorId} />}
      {activeTab === 'durations' && <SlotDurationsPanel doctorId={doctorAssignment?.doctorId} />}
      {activeTab === 'exceptions' && <ExceptionsPanel doctorId={doctorAssignment?.doctorId} />}
    </div>
  );
};
