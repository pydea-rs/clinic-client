import React, { useState, useEffect } from 'react';
import { schedulingApi } from '../../api/scheduling.api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const BookingPage: React.FC<{ doctorId: number }> = ({ doctorId }) => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<any[]>([]);
  const [durations, setDurations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [slotsData, durationsData] = await Promise.all([
          schedulingApi.getSlots(doctorId, { startDate: new Date().toISOString().split('T')[0], endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }),
          schedulingApi.getDurations(doctorId),
        ]);
        setSlots(slotsData || []);
        setDurations(durationsData || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [doctorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }

    setSubmitting(true);
    try {
      await schedulingApi.book({
        doctorId,
        dateTime: selectedSlot,
        durationMinutes: selectedDuration,
        method: 'CHAT',
      });
      toast.success('Appointment booked successfully');
      navigate('/patient/consultations');
    } catch (error: any) {
      toast.error(error.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Book Appointment</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Duration</label>
          <select
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg"
          >
            {durations.map((duration) => (
              <option key={duration.minutes} value={duration.minutes}>
                {duration.minutes} minutes - ${duration.price}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots</label>
          <div className="grid grid-cols-4 gap-2">
            {slots.map((slot, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedSlot(slot.startTime)}
                className={`px-3 py-2 rounded-lg text-sm ${
                  selectedSlot === slot.startTime
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {slot.startTime} - {slot.endTime}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedSlot}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
        >
          {submitting ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>
    </div>
  );
};
