import React, { useState, useEffect, useCallback } from 'react';
import { schedulingApi } from '../../api/scheduling.api';
import { useAuthStore } from '../../lib/stores/auth.store';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Appointment } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';
import { formatStatus, formatVisitMethod } from '../../lib/format';

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { user } = useAuthStore();

  const loadAppointments = useCallback(async () => {
    try {
      const data = await schedulingApi.getAppointments(page, 10);
      setAppointments(data.appointments || []);
      setTotal(data.total || 0);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load appointments'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }
    try {
      await schedulingApi.cancelAppointment(id);
      toast.success('Appointment cancelled');
      loadAppointments();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to cancel appointment'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'badge badge-yellow';
      case 'CONFIRMED': return 'badge badge-green';
      case 'CANCELLED': return 'badge badge-red';
      case 'COMPLETED': return 'badge badge-gray';
      case 'NO_SHOW': return 'badge badge-red';
      default: return 'badge badge-gray';
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="shimmer h-8 w-48 mb-6" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="shimmer h-5 w-40 mb-2" />
                  <div className="shimmer h-4 w-28" />
                </div>
                <div className="shimmer h-6 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="shimmer h-10 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 animate-slide-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white shadow-soft">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Appointments</h1>
            <p className="text-gray-500 text-sm">Manage and track your appointments</p>
          </div>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="card text-center py-16 animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <p className="text-gray-500 font-medium">No appointments found</p>
          <p className="text-gray-400 text-sm mt-1">Your appointments will appear here once booked</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 stagger-children">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="card card-hover p-6 animate-slide-in-up">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Appointment #{appointment.id}</h3>
                    <p className="text-sm text-gray-500">
                      Doctor ID: {appointment.doctorId}
                    </p>
                  </div>
                  <span className={getStatusColor(appointment.status)}>
                    {formatStatus(appointment.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Date & Time:</span>
                    <p className="font-medium">{new Date(appointment.dateTime).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <p className="font-medium">{appointment.durationMinutes} minutes</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Price:</span>
                    <p className="font-medium">${appointment.price}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Method:</span>
                    <p className="font-medium">{formatVisitMethod(appointment.method)}</p>
                  </div>
                </div>

                {user?.role === 'PATIENT' && appointment.status === 'PENDING' && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
                    <Link
                      to={`/appointments/${appointment.id}`}
                      className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleCancel(appointment.id)}
                      className="text-red-600 hover:text-red-700 font-medium transition-colors"
                    >
                      Cancel Appointment
                    </button>
                  </div>
                )}

                {!(user?.role === 'PATIENT' && appointment.status === 'PENDING') && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link
                      to={`/appointments/${appointment.id}`}
                      className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-4 py-2 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary px-4 py-2 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
