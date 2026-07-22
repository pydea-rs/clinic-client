import React from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '../../api/scheduling.api';
import { useNurseAssignments } from './useNurseAssignments';
import { formatStatus, formatVisitMethod } from '../../lib/format';
import { Link } from 'react-router-dom';

export const NurseAppointmentsPage: React.FC = () => {
  const { assignments, isLoading: assignLoading } = useNurseAssignments();
  const hasPermission = assignments.some((a) => a.permissions.includes('MANAGE_APPOINTMENTS'));

  const { data, isLoading } = useQuery({
    queryKey: ['nurse-appointments'],
    queryFn: () => schedulingApi.getAppointments(),
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

  const appointments = data?.data || [];

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-soft">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
      </div>

      {appointments.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No appointments found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Visit Method</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {appointments.map((appt: any) => (
                <tr key={appt.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {appt.patient?.user?.firstname} {appt.patient?.user?.lastname}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(appt.startTime).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{appt.durationMinutes} min</td>
                  <td className="px-4 py-3 text-gray-600">{formatVisitMethod(appt.visitMethod || '')}</td>
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
      )}
    </div>
  );
};
