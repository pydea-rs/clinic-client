import React, { useState } from 'react';
import { AvailabilityPanel } from '../scheduling/AvailabilityPanel';
import { SlotDurationsPanel } from '../scheduling/SlotDurationsPanel';
import { ExceptionsPanel } from '../scheduling/ExceptionsPanel';
import { Calendar, Clock, CalendarX } from 'lucide-react';

type ScheduleTab = 'availability' | 'durations' | 'exceptions';

const TABS: Array<{ value: ScheduleTab; label: string; icon: React.FC<{ className?: string }>; description: string }> = [
  {
    value: 'availability',
    label: 'Availability',
    icon: Calendar,
    description: 'Set your weekly schedule',
  },
  {
    value: 'durations',
    label: 'Slot Durations',
    icon: Clock,
    description: 'Define appointment lengths and pricing',
  },
  {
    value: 'exceptions',
    label: 'Exceptions',
    icon: CalendarX,
    description: 'Block days or override hours',
  },
];

export const DoctorSchedulingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ScheduleTab>('availability');

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-soft">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Schedule Management</h1>
          <p className="text-sm text-gray-500">Configure your availability, durations, and exceptions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 animate-slide-in-up">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                isActive
                  ? 'border-brand-500 bg-brand-50/50 shadow-soft'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className={`font-semibold text-sm ${isActive ? 'text-brand-900' : 'text-gray-700'}`}>
                    {tab.label}
                  </h3>
                  <p className={`text-xs mt-0.5 ${isActive ? 'text-brand-600' : 'text-gray-400'}`}>
                    {tab.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="animate-slide-in-up" style={{ animationDelay: '50ms' }}>
        <div className="card overflow-hidden">
          {activeTab === 'availability' && <AvailabilityPanel />}
          {activeTab === 'durations' && <SlotDurationsPanel />}
          {activeTab === 'exceptions' && <ExceptionsPanel />}
        </div>
      </div>
    </div>
  );
};
