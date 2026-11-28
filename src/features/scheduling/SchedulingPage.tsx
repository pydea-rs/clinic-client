import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../lib/stores/auth.store';

export const SchedulingPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const schedulePath = user?.role === 'DOCTOR' ? '/doctor/scheduling' : user?.role === 'NURSE' ? '/nurse/schedule' : '/doctors';

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8 animate-slide-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white shadow-soft">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Scheduling & Booking</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm">Manage availability and book appointments</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children">
        <div className="card card-hover p-6 animate-slide-in-up" style={{ animationDelay: '50ms' }}>
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center mb-4">
            <Clock className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <h2 className="font-bold text-gray-900 dark:text-white mb-2">Doctor Availability</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-5">Manage weekly schedule, slot durations, and blocked dates or custom exceptions.</p>
          <Link to={schedulePath} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 group">
            Manage Schedule
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="card card-hover p-6 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-4">
            <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="font-bold text-gray-900 dark:text-white mb-2">Book Appointment</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-5">Select a verified specialist, browse UTC and local time slots, and book your visit.</p>
          <Link to="/doctors" className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 group">
            Book Appointment
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};
