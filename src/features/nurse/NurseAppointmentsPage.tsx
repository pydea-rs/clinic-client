import React, { useState } from 'react';
import { Calendar, Loader2, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '../../api';
import { useNurseAssignments } from './useNurseAssignments';
import { formatStatus, formatVisitMethod } from '../../lib/format';
import { Appointment, AppointmentStatus } from '../../lib/types/api';

const STATUS_OPTIONS: { value: '' | AppointmentStatus; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
];

export const NurseAppointmentsPage: React.FC = () => {
  const { assignments, isLoading: assignLoading } = useNurseAssignments();
  const hasPermission = assignments.some((a) => a.permissions.includes('MANAGE_APPOINTMENTS'));
  const [statusFilter, setStatusFilter] = useState<'' | AppointmentStatus>('');

  const filters = statusFilter ? { status: statusFilter } : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['nurse-appointments', filters],
    queryFn: () => schedulingApi.getAppointments(undefined, undefined, filters),
    enabled: hasPermission,
  });

  if (assignLoading || isLoading) {
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
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">No Permission</h2>
          <p className="text-sm text-gray-500 mt-1">You don't have the Manage Appointments permission.</p>
        </div>
      </div>
    );
  }

  const appointments: Appointment[] = data?.appointments || [];

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-soft">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Appointments</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 dark:text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '' | AppointmentStatus)}
            className="input-focus py-1.5 px-3 text-sm w-40"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="card p-12 text-center animate-scale-in">
          <Calendar className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3 animate-float" />
          <p className="text-gray-500 dark:text-slate-400">
            {statusFilter ? 'No appointments match the selected filter.' : 'No appointments found.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Patient</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Doctor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Date & Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Duration</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Visit Method</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="table-row-hover transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {appt.patient?.firstname} {appt.patient?.lastname}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300 whitespace-nowrap">
                      {appt.doctor?.user
                        ? `Dr. ${appt.doctor.user.firstname} ${appt.doctor.user.lastname}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(appt.dateTime).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{appt.durationMinutes} min</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{formatVisitMethod(appt.method || '')}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${
                        appt.status === 'CONFIRMED' ? 'badge-green' :
                        appt.status === 'CANCELLED' ? 'badge-red' :
                        appt.status === 'COMPLETED' ? 'badge-blue' : 'badge-yellow'
                      }`}>
                        {formatStatus(appt.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
