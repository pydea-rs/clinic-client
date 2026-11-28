import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Info } from 'lucide-react';
import { schedulingApi, consultationApi, doctorApi } from '../../api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';
import { slotStartToIso } from '../../lib/scheduling';
import type { VisitMethod } from '../../lib/types/api';
import { CollapsibleSection } from '../../components/InfoDisclosure';

interface BookingLocationState {
  slot?: {
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes?: number;
  };
  duration?: number;
  price?: number;
  soapId?: string | null;
  consultationId?: string | null;
}

const ALL_VISIT_METHODS: Array<{ value: VisitMethod; label: string }> = [
  { value: 'CHAT', label: 'Chat' },
  { value: 'VOICE_CALL', label: 'Voice Call' },
  { value: 'VIDEO_CALL', label: 'Video Call' },
  { value: 'ON_SITE', label: 'On Site' },
];

export const BookingPage: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const parsedDoctorId = Number(doctorId);
  const isValidDoctorId = !!doctorId && !Number.isNaN(parsedDoctorId);
  const [loading, setLoading] = useState(false);
  const createdConsultationIdRef = useRef<string | null>(null);
  const [formData, setFormData] = useState({
    doctorId: parsedDoctorId,
    dateTime: '',
    durationMinutes: 30,
    price: 0,
    method: 'CHAT' as VisitMethod,
    consultationId: '',
    notes: '',
  });
  const [slotDisplay, setSlotDisplay] = useState('');

  const { data: doctor } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => doctorApi.getDoctorById(parsedDoctorId),
    enabled: isValidDoctorId,
  });

  const supportedMethods: VisitMethod[] = useMemo(
    () =>
      doctor?.visitMethods && doctor.visitMethods.length > 0
        ? doctor.visitMethods
        : ALL_VISIT_METHODS.map((m) => m.value),
    [doctor?.visitMethods],
  );

  const methodOptions = ALL_VISIT_METHODS.filter((m) =>
    supportedMethods.includes(m.value),
  );

  useEffect(() => {
    if (
      doctor?.visitMethods &&
      doctor.visitMethods.length > 0 &&
      !doctor.visitMethods.includes(formData.method)
    ) {
      setFormData((prev) => ({
        ...prev,
        method: doctor.visitMethods[0],
      }));
    }
  }, [doctor?.visitMethods, formData.method]);

  const doctorName = doctor?.user
    ? `Dr. ${doctor.user.firstname} ${doctor.user.lastname}`
    : `Doctor #${doctorId}`;

  const stateObj = location.state as BookingLocationState | null;
  const soapId = stateObj?.soapId ?? searchParams.get('soapId');
  const initialConsultationId =
    stateObj?.consultationId ?? searchParams.get('consultationId') ?? '';

  useEffect(() => {
    if (!isValidDoctorId) return;
    const state = location.state as BookingLocationState | null;
    let dateTime: string | undefined;
    try {
      dateTime = state?.slot && slotStartToIso(state.slot);
    } catch {
      dateTime = undefined;
    }
    if (!state?.slot || !dateTime) {
      const qs = new URLSearchParams();
      if (soapId) qs.set('soapId', soapId);
      if (initialConsultationId) qs.set('consultationId', initialConsultationId);
      const query = qs.toString();
      navigate(`/slots/${doctorId}${query ? `?${query}` : ''}`);
      return;
    }
    setFormData((prev) => ({
      doctorId: parsedDoctorId,
      dateTime,
      durationMinutes: state.slot?.durationMinutes || state.duration || 30,
      price: Number(state.price || 0),
      method: supportedMethods.includes(prev.method)
        ? prev.method
        : supportedMethods[0],
      consultationId: initialConsultationId || prev.consultationId,
      notes: '',
    }));
    setSlotDisplay(`${state.slot.date} ${state.slot.startTime} - ${state.slot.endTime} UTC`);
  }, [location.state, doctorId, parsedDoctorId, isValidDoctorId, navigate, soapId, initialConsultationId, supportedMethods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let linkedConsultationId =
        formData.consultationId || createdConsultationIdRef.current || undefined;
      let newlyCreatedConsultation = false;

      if (soapId && !linkedConsultationId) {
        try {
          const consultation = await consultationApi.create({
            doctorId: formData.doctorId,
            soapId,
          });
          linkedConsultationId = consultation.id;
          createdConsultationIdRef.current = consultation.id;
          newlyCreatedConsultation = true;
          setFormData((prev) => ({ ...prev, consultationId: consultation.id }));
        } catch {
          // still allow booking even if consultation auto-creation fails
        }
      }

      await schedulingApi.bookAppointment({
        ...formData,
        consultationId: linkedConsultationId,
        notes: formData.notes || undefined,
      });

      if (linkedConsultationId && (newlyCreatedConsultation || createdConsultationIdRef.current)) {
        toast.success('Appointment booked and consultation created!');
        navigate(`/consultation/${linkedConsultationId}`);
        return;
      }

      toast.success(
        soapId && !linkedConsultationId
          ? 'Appointment booked! (Could not auto-link consultation)'
          : 'Appointment booked successfully'
      );
      navigate('/appointments');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to book appointment'));
    } finally {
      setLoading(false);
    }
  };

  if (!isValidDoctorId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-red-600">Invalid doctor ID.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 border rounded-lg hover:bg-gray-50">
          Go Back
        </button>
      </div>
    );
  }

  if (!formData.dateTime) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
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
    <div className="p-6 max-w-3xl mx-auto">
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
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-700/60">
            <span className="text-gray-500 dark:text-slate-400">Doctor:</span>
            <span className="font-medium text-gray-900 dark:text-white">{doctorName}</span>
          </div>
          <div className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-slate-700/60 gap-3">
            <span className="text-gray-500 dark:text-slate-400">Date & Time:</span>
            <div className="text-right">
              <span className="font-medium text-gray-900 dark:text-white block">{slotDisplay || new Date(formData.dateTime).toLocaleString()}</span>
              {formData.dateTime && (
                <span className="text-xs text-gray-500 dark:text-slate-400 inline-flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  Local time: {new Date(formData.dateTime).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-700/60">
            <span className="text-gray-500 dark:text-slate-400">Duration:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formData.durationMinutes} minutes</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500 dark:text-slate-400">Price:</span>
            <span className="font-semibold text-brand-700 dark:text-brand-400">{formData.price} USD</span>
          </div>
        </div>
      </div>

      <CollapsibleSection
        title="Appointment prep & cancellation info"
        subtitle="Timezone, linking, and cancellation policy"
        icon={<Calendar className="w-4 h-4" />}
        className="mb-6 animate-slide-in-up"
      >
        <ul className="space-y-1.5 list-disc list-inside">
          <li>Slots are scheduled in UTC; your local browser time is displayed above so nothing gets missed.</li>
          <li>Pending appointments can be cancelled anytime from your Appointments list before confirmation.</li>
          <li>When booked from an AI SOAP summary, your consultation is automatically linked.</li>
        </ul>
      </CollapsibleSection>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Visit Method</label>
          <select
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value as VisitMethod })}
            className="w-full px-4 py-2.5 input-focus"
            required
            disabled={loading}
          >
            {methodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Consultation ID (Optional)
          </label>
          <input
            type="text"
            value={formData.consultationId}
            onChange={(e) => setFormData({ ...formData, consultationId: e.target.value })}
            className="w-full px-4 py-2.5 input-focus"
            placeholder="Enter consultation ID if applicable"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            Optional UUID from an active consultation; leave empty to create a standalone appointment.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2.5 input-focus"
            rows={3}
            placeholder="Any additional notes"
            disabled={loading}
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
        disabled={loading}
      >
        Back
      </button>
    </div>
  );
};
