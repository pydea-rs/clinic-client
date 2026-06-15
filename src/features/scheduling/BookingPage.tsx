import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { schedulingApi } from '../../api/scheduling.api';
import { consultationApi } from '../../api/consultation.api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';

interface BookingLocationState {
  slot?: {
    date: string;
    startTime: string;
    endTime: string;
  };
  duration?: number;
  price?: number;
  soapId?: string | null;
}

export const BookingPage: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    doctorId: Number(doctorId),
    dateTime: '',
    durationMinutes: 30,
    price: 0,
    method: 'CHAT' as 'CHAT' | 'VOICE_CALL' | 'VIDEO_CALL' | 'ON_SITE',
    consultationId: '',
    notes: '',
  });
  const [slotDisplay, setSlotDisplay] = useState('');

  useEffect(() => {
    const state = location.state as BookingLocationState | null;
    if (!state?.slot) {
      navigate(`/slots/${doctorId}`);
      return;
    }
    setFormData({
      doctorId: Number(doctorId),
      dateTime: `${state.slot.date}T${state.slot.startTime}:00.000Z`,
      durationMinutes: state.duration || 30,
      price: Number(state.price || 0),
      method: 'CHAT',
      consultationId: '',
      notes: '',
    });
    setSlotDisplay(`${state.slot.date} ${state.slot.startTime} - ${state.slot.endTime}`);
  }, [location.state, doctorId, navigate]);

  const soapId = (location.state as BookingLocationState | null)?.soapId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await schedulingApi.bookAppointment(formData);

      // If SOAP context exists, auto-create a consultation linking it
      if (soapId) {
        try {
          const consultation = await consultationApi.create({
            doctorId: formData.doctorId,
            soapId,
          });
          toast.success('Appointment booked and consultation created!');
          navigate(`/consultation/${consultation.id}`);
          return;
        } catch {
          // Consultation link failed — still show appointment success
          toast.success('Appointment booked! (Could not auto-link consultation)');
        }
      } else {
        toast.success('Appointment booked successfully');
      }

      navigate('/appointments');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to book appointment'));
    } finally {
      setLoading(false);
    }
  };

  if (!formData.dateTime) {
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
            <span className="font-medium">{slotDisplay || new Date(formData.dateTime).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Duration:</span>
            <span className="font-medium">{formData.durationMinutes} minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Price:</span>
            <span className="font-medium">{formData.price} USD</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visit Method</label>
          <select
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value as 'CHAT' | 'VOICE_CALL' | 'VIDEO_CALL' | 'ON_SITE' })}
            className="w-full px-4 py-2 border rounded-lg"
            required
          >
            <option value="CHAT">Chat</option>
            <option value="VOICE_CALL">Voice Call</option>
            <option value="VIDEO_CALL">Video Call</option>
            <option value="ON_SITE">On Site</option>
          </select>
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            rows={3}
            placeholder="Any additional notes"
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
