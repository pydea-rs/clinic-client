import React, { useState, useEffect } from 'react';
import { schedulingApi } from '../../api/scheduling.api';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export const BookingPage: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const locationState = useLocationState();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    doctorId: Number(doctorId),
    dateTime: locationState?.slot || '',
    durationMinutes: locationState?.duration || 30,
    consultationId: '',
  });

  const useLocationState = () => {
    const location = window.location as any;
    return location.state || {};
  };

  useEffect(() => {
    if (!locationState?.slot) {
      navigate(`/slots/${doctorId}`);
    }
  }, [locationState, doctorId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await schedulingApi.bookAppointment(formData);
      toast.success('Appointment booked successfully');
      navigate('/appointments');
    } catch (error: any) {
      toast.error(error.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  if (!locationState?.slot) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Confirm Booking</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Booking Details</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Doctor ID:</span>
            <span className="font-medium">{formData.doctorId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Date & Time:</span>
            <span className="font-medium">{formData.dateTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Duration:</span>
            <span className="font-medium">{formData.durationMinutes} minutes</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Consultation ID (Optional)
          </label>
          <input
            type="text"
            value={formData.consultationId}
            onChange={(e) => setFormData({ ...formData, consultationId: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Enter consultation ID if applicable"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Booking...' : 'Confirm Booking'}
        </button>
      </form>

      <button
        onClick={() => navigate(-1)}
        className="mt-4 w-full px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        Back
      </button>
    </div>
  );
};
