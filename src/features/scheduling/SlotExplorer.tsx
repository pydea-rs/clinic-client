import React, { useState, useEffect, useCallback } from 'react';
import { schedulingApi } from '../../api';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Calendar, Clock } from 'lucide-react';
import { SlotDuration } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';
import { slotStartToIso } from '../../lib/scheduling';
import { InfoTip } from '../../components/InfoDisclosure';

export const SlotExplorer: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const soapId = searchParams.get('soapId');
  const consultationId = searchParams.get('consultationId');
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
      if (data.length > 0) {
        setSelectedDuration((prev) =>
          data.some((d) => d.minutes === prev) ? prev : data[0].minutes
        );
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load durations'));
    }
  }, [doctorId]);

  useEffect(() => {
    if (doctorId) {
      loadDurations();
    }
  }, [doctorId, loadDurations]);

  useEffect(() => {
    if (doctorId) {
      loadSlots();
    }
  }, [doctorId, loadSlots]);

  const handleBook = () => {
    if (selectedSlot) {
      // The slot's own length and price: what the patient picked, not the current filter.
      const minutes = selectedSlot.durationMinutes;
      const price = durations.find((d) => d.minutes === minutes)?.price;
      navigate(`/booking/${doctorId}`, {
        state: {
          slot: selectedSlot,
          duration: minutes,
          price: Number(price || 0),
          soapId,
          consultationId,
        },
      });
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
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Book Appointment</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm">Select a date and duration to see available slots</p>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6 animate-slide-in-up" style={{ animationDelay: '50ms' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="slot-date" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Date</label>
            <input
              id="slot-date"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null); // a slot of another day would otherwise still be booked
              }}
              className="w-full px-4 py-2.5 input-focus"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label htmlFor="slot-duration" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Duration</label>
            <select
              id="slot-duration"
              value={selectedDuration}
              onChange={(e) => {
                setSelectedDuration(Number(e.target.value));
                setSelectedSlot(null);
              }}
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
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Available Slots (UTC)</h2>
            <InfoTip label="Timezone details" align="left">
              All slot schedules use coordinated UTC so clinic times stay consistent across regions. Your local time equivalent is shown right below the selected time.
            </InfoTip>
          </div>
        </div>

        {slots.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 animate-float">
              <Calendar className="h-8 w-8 text-gray-400 dark:text-slate-500" />
            </div>
            <p className="text-gray-500 dark:text-slate-300 font-medium">No available slots for this date</p>
            <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">Try selecting a different date or duration</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 stagger-children">
            {slots.map((slot) => {
              const isSelected = selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime;
              return (
                <button
                  key={`${slot.date}-${slot.startTime}-${slot.endTime}-${slot.durationMinutes}`}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ease-spring btn-press ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 dark:border-brand-400 shadow-soft ring-2 ring-brand-100 dark:ring-brand-900/50'
                      : 'border-gray-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-slate-800/70 hover:shadow-sm'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">{slot.startTime} - {slot.endTime}</div>
                  <div className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                    {durations.find((d) => d.minutes === slot.durationMinutes)?.price || 'N/A'} USD
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedSlot && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 animate-scale-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Selected Slot</p>
                <p className="text-lg font-semibold text-brand-700 dark:text-brand-300">
                  {selectedSlot.date} {selectedSlot.startTime} - {selectedSlot.endTime} UTC
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  Local time: {new Date(slotStartToIso(selectedSlot)).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  Duration: {selectedSlot.durationMinutes} min
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
