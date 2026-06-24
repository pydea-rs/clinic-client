import React, { useState, useEffect, useCallback } from 'react';
import { schedulingApi } from '../../api/scheduling.api';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SlotDuration } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';

export const SlotExplorer: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const soapId = searchParams.get('soapId');
  const [slots, setSlots] = useState<Array<{ date: string; startTime: string; endTime: string; durationMinutes: number }>>([]);
  const [durations, setDurations] = useState<SlotDuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; startTime: string; endTime: string; durationMinutes: number } | null>(null);

  const loadSlots = useCallback(async () => {
    try {
      const data = await schedulingApi.getDoctorSlots(Number(doctorId), {
        start: selectedDate,
        end: selectedDate,
        duration: selectedDuration,
      });
      setSlots(data || []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load slots'));
    } finally {
      setLoading(false);
    }
  }, [doctorId, selectedDate, selectedDuration]);

  const loadDurations = useCallback(async () => {
    try {
      const data = await schedulingApi.getDoctorDurations(Number(doctorId));
      setDurations(data);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load durations'));
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
      const selectedDurationPrice = durations.find((d) => d.minutes === selectedDuration)?.price;
      navigate(`/booking/${doctorId}`, { state: { slot: selectedSlot, duration: selectedDuration, price: Number(selectedDurationPrice || 0), soapId } });
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="shimmer h-8 w-48 mb-2" />
          <div className="shimmer h-4 w-72" />
        </div>
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="shimmer h-10 w-full" />
            <div className="shimmer h-10 w-full" />
          </div>
        </div>
        <div className="card p-6">
          <div className="shimmer h-6 w-36 mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="shimmer h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8 animate-slide-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-soft">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Book Appointment</h1>
            <p className="text-gray-500 text-sm">Select a date and duration to see available slots</p>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6 animate-slide-in-up" style={{ animationDelay: '50ms' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 input-focus"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(Number(e.target.value))}
              className="w-full px-4 py-2.5 input-focus"
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

      <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
        <h2 className="text-xl font-bold mb-4">Available Slots</h2>

        {slots.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-gray-500 font-medium">No available slots for this date</p>
            <p className="text-gray-400 text-sm mt-1">Try selecting a different date or duration</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {slots.map((slot) => (
              <button
                key={`${slot.date}-${slot.startTime}-${slot.endTime}-${slot.durationMinutes}`}
                onClick={() => setSelectedSlot(slot)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ease-spring ${
                  selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime
                    ? 'border-brand-600 bg-brand-50 shadow-soft ring-2 ring-brand-100'
                    : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-sm'
                }`}
              >
                <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                <div className="text-sm text-gray-500">
                  {durations.find((d) => d.minutes === selectedDuration)?.price || 'N/A'} USD
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedSlot && (
          <div className="mt-6 pt-6 border-t border-gray-100 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Selected Slot</p>
                <p className="text-lg font-semibold text-brand-700">{selectedSlot.startTime} - {selectedSlot.endTime}</p>
                <p className="text-sm text-gray-500">
                  Duration: {selectedDuration} min
                </p>
              </div>
              <button
                onClick={handleBook}
                className="btn-primary px-6 py-2.5"
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
