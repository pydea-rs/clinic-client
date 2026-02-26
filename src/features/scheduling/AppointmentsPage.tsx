import React, { useState, useEffect, useCallback } from 'react';
import { schedulingApi } from '../../api/scheduling.api';
import { useAuthStore } from '../../lib/stores/auth.store';
import toast from 'react-hot-toast';

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { user } = useAuthStore();

  const loadAppointments = useCallback(async () => {
    try {
      const data = await schedulingApi.getAppointments(page, 10);
      setAppointments(data.appointments || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load appointments');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel appointment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'NO_SHOW': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Appointments</h1>
      
      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No appointments found</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Appointment #{appointment.id}</h3>
                    <p className="text-sm text-gray-500">
                      Doctor ID: {appointment.doctorId}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
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
                    <p className="font-medium">{appointment.price}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Method:</span>
                    <p className="font-medium">{appointment.method}</p>
                  </div>
                </div>

                {user?.role === 'PATIENT' && appointment.status === 'PENDING' && (
                  <div className="mt-4 pt-4 border-t">
                    <button
                      onClick={() => handleCancel(appointment.id)}
                      className="text-red-600 hover:underline"
                    >
                      Cancel Appointment
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
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
