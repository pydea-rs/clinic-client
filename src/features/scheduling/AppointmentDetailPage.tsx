import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { schedulingApi } from '../../api/scheduling.api';
import toast from 'react-hot-toast';
import { Appointment } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';

export const AppointmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  const loadAppointment = useCallback(async () => {
    if (!id) return;
    try {
      const data = await schedulingApi.getAppointmentById(Number(id));
      setAppointment(data);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load appointment'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  const getStatusBadge = (status: string) => {
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
      <div className="p-6 max-w-3xl mx-auto">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="shimmer h-7 w-48" />
            <div className="shimmer h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <div className="shimmer h-4 w-24 mb-1" />
                <div className="shimmer h-5 w-32" />
              </div>
            ))}
          </div>
          <div className="shimmer h-10 w-48 mt-6" />
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>
        </div>
        <p className="text-gray-500 font-medium">Appointment not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8 animate-slide-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-soft">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          </div>
          <h1 className="text-2xl font-bold gradient-text">Appointment #{appointment.id}</h1>
        </div>
      </div>

      <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '50ms' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Details</h2>
          <span className={getStatusBadge(appointment.status)}>
            {appointment.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-gray-50/80">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Date & Time</span>
            <p className="font-medium mt-0.5">{new Date(appointment.dateTime).toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50/80">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Duration</span>
            <p className="font-medium mt-0.5">{appointment.durationMinutes} minutes</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50/80">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Method</span>
            <p className="font-medium mt-0.5">{appointment.method}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50/80">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Price</span>
            <p className="font-medium mt-0.5">{appointment.price}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50/80">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Doctor ID</span>
            <p className="font-medium mt-0.5">{appointment.doctorId}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50/80">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Patient ID</span>
            <p className="font-medium mt-0.5">{appointment.patientId}</p>
          </div>
        </div>

        {appointment.notes && (
          <div className="mt-5 p-4 rounded-xl bg-gray-50/80 border border-gray-100">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Notes</span>
            <p className="font-medium mt-1">{appointment.notes}</p>
          </div>
        )}

        <button
          onClick={() => navigate('/appointments')}
          className="btn-secondary mt-6 px-5 py-2.5"
        >
          Back to Appointments
        </button>
      </div>
    </div>
  );
};
