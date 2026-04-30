import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { schedulingApi } from '../../api/scheduling.api';
import toast from 'react-hot-toast';

export const AppointmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);

  const loadAppointment = useCallback(async () => {
    if (!id) return;
    try {
      const data = await schedulingApi.getAppointmentById(Number(id));
      setAppointment(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load appointment');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!appointment) {
    return <div className="flex items-center justify-center min-h-screen">Appointment not found</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="bg-white rounded-lg shadow p-6 animate-slide-in-up">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Appointment #{appointment.id}</h1>
          <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
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
            <span className="text-gray-500">Method:</span>
            <p className="font-medium">{appointment.method}</p>
          </div>
          <div>
            <span className="text-gray-500">Price:</span>
            <p className="font-medium">{appointment.price}</p>
          </div>
          <div>
            <span className="text-gray-500">Doctor ID:</span>
            <p className="font-medium">{appointment.doctorId}</p>
          </div>
          <div>
            <span className="text-gray-500">Patient ID:</span>
            <p className="font-medium">{appointment.patientId}</p>
          </div>
        </div>

        {appointment.notes && (
          <div className="mt-4">
            <span className="text-gray-500 text-sm">Notes:</span>
            <p className="font-medium mt-1">{appointment.notes}</p>
          </div>
        )}

        <button
          onClick={() => navigate('/appointments')}
          className="mt-6 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-all-smooth btn-press"
        >
          Back to Appointments
        </button>
      </div>
    </div>
  );
};
