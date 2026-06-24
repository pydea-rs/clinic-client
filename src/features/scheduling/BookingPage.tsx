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
      dateTime: new Date(`${state.slot.date}T${state.slot.startTime}`).toISOString(),
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
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="shimmer h-8 w-48 mb-6" />
        <div className="card p-6 mb-6">
          <div className="shimmer h-5 w-36 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="shimmer h-4 w-24" />
                <div className="shimmer h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="shimmer h-12 w-full" />
          ))}
          <div className="shimmer h-11 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8 animate-slide-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-brand-600 flex items-center justify-center text-white shadow-soft">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Confirm Booking</h1>
            <p className="text-gray-500 text-sm">Review details and complete your appointment</p>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6 animate-slide-in-up" style={{ animationDelay: '50ms' }}>
        <h2 className="text-lg font-semibold mb-4">Booking Details</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Doctor ID:</span>
            <span className="font-medium">{formData.doctorId}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Date & Time:</span>
            <span className="font-medium">{slotDisplay || new Date(formData.dateTime).toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Duration:</span>
            <span className="font-medium">{formData.durationMinutes} minutes</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Price:</span>
            <span className="font-semibold text-brand-700">{formData.price} USD</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visit Method</label>
          <select
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value as 'CHAT' | 'VOICE_CALL' | 'VIDEO_CALL' | 'ON_SITE' })}
            className="w-full px-4 py-2.5 input-focus"
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
            className="w-full px-4 py-2.5 input-focus"
            placeholder="Enter consultation ID if applicable"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2.5 input-focus"
            rows={3}
            placeholder="Any additional notes"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Booking...' : 'Confirm Booking'}
        </button>
      </form>

      <button
        onClick={() => navigate(-1)}
        className="btn-secondary w-full mt-4 py-2.5"
      >
        Back
      </button>
    </div>
  );
};
