import React, { useState, useEffect, useCallback } from 'react';
import { schedulingApi } from '../../api/scheduling.api';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const SlotExplorer: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const [slots, setSlots] = useState<string[]>([]);
  const [durations, setDurations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    try {
      const data = await schedulingApi.getDoctorSlots(Number(doctorId), {
        startDate: selectedDate,
        endDate: selectedDate,
        duration: selectedDuration,
      });
      setSlots(data.slots || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  }, [doctorId, selectedDate, selectedDuration]);

  const loadDurations = useCallback(async () => {
    try {
      const data = await schedulingApi.getDoctorDurations(Number(doctorId));
      setDurations(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load durations');
    }
  }, [doctorId]);

  useEffect(() => {
    if (doctorId) {
      loadSlots();
      loadDurations();
    }
  }, [doctorId, loadSlots, loadDurations]);

  const handleBook = () => {
    if (selectedSlot) {
      navigate(`/booking/${doctorId}`, { state: { slot: selectedSlot, duration: selectedDuration } });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Book Appointment</h1>
        <p className="text-gray-500">Select a date and duration to see available slots</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(Number(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg"
            >
              {durations.map((d) => (
                <option key={d.id} value={d.minutes}>
                  {d.minutes} min - ${d.price}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Available Slots</h2>
        
        {slots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No available slots for this date</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`p-4 rounded-lg border-2 ${
                  selectedSlot === slot
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="font-medium">{slot}</div>
                <div className="text-sm text-gray-500">
                  {durations.find((d) => d.minutes === selectedDuration)?.price || 'N/A'} USD
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedSlot && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Selected Slot</p>
                <p className="text-lg font-medium">{selectedSlot}</p>
                <p className="text-sm text-gray-500">
                  Duration: {selectedDuration} min
                </p>
              </div>
              <button
                onClick={handleBook}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Book Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
