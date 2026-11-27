import React, { useState, useEffect, useCallback } from 'react';
import { consultationApi } from '../../api';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/stores/auth.store';
import { queryClient } from '../../lib/queryClient';
import toast from 'react-hot-toast';
import { Consultation, VisitMethod, VisitType } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';
import {
  formatStatus,
  formatVisitMethod,
  formatVisitType,
  formatSpecialty,
  formatTriageLevel,
  isVisitMethodSoon,
} from '../../lib/format';
import { getMessageDirection } from '../../lib/text-direction';
import { UserAvatar } from '../../components/UserAvatar';
import { useNurseAssignments } from '../nurse/useNurseAssignments';
import { getConsultationChatAction, useOpenConsultationChat } from './useConsultationChat';
import {
  Loader2,
  ClipboardList,
  MessageSquare,
  Phone,
  Video,
  MapPin,
  FileText,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Sparkles,
  Clock,
  ArrowLeft,
  Star,
} from 'lucide-react';

const CANCELLABLE_STATUSES = [
  'CREATED',
  'PENDING_DOCTOR_REVIEW',
  'DOCTOR_DECIDED',
  'PENDING_PAYMENT',
  'PAYMENT_CONFIRMED',
  'IN_PROGRESS',
];

const CLINICAL_VISIT_TYPES: Array<{ value: VisitType; label: string }> = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'EXAMINATION', label: 'Clinical Examination' },
  { value: 'LABORATORY', label: 'Laboratory' },
  { value: 'RADIOLOGY', label: 'Radiology' },
  { value: 'PHARMACY', label: 'Pharmacy' },
  { value: 'THERAPY', label: 'Therapy' },
  { value: 'NUTRITION', label: 'Nutrition' },
  { value: 'DENTISTRY', label: 'Dentistry' },
  { value: 'SURGERY', label: 'Surgery' },
  { value: 'OTHER', label: 'Other' },
];

const VISIT_METHOD_OPTIONS: Array<{
  value: VisitMethod;
  label: string;
  description: string;
  soon?: boolean;
  icon: React.ElementType;
}> = [
  {
    value: 'CHAT',
    label: 'Chat',
    description: 'Asynchronous or live messaging with your care team',
    icon: MessageSquare,
  },
  {
    value: 'ON_SITE',
    label: 'On-Site Visit',
    description: 'In-person clinic appointment',
    icon: MapPin,
  },
  {
    value: 'VOICE_CALL',
    label: 'Voice Call',
    description: 'Real-time audio consultation',
    soon: true,
    icon: Phone,
  },
  {
    value: 'VIDEO_CALL',
    label: 'Video Call',
    description: 'Real-time video consultation',
    soon: true,
    icon: Video,
  },
];

const STANDARD_STEPS: Array<{ key: string; label: string }> = [
  { key: 'PENDING_DOCTOR_REVIEW', label: 'Submitted' },
  { key: 'DOCTOR_DECIDED', label: 'Doctor Decision' },
  { key: 'PAYMENT', label: 'Payment' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
];

const DIRECT_DIAGNOSIS_STEPS: Array<{ key: string; label: string }> = [
  { key: 'PENDING_DOCTOR_REVIEW', label: 'Submitted' },
  { key: 'DIRECT_DIAGNOSIS', label: 'Direct Diagnosis' },
  { key: 'COMPLETED', label: 'Completed' },
];

function getStepIndex(consultation: Consultation): number {
  if (consultation.doctorDecision === 'DIRECT_DIAGNOSIS') {
    return consultation.status === 'COMPLETED' ? 2 : 0;
  }
  switch (consultation.status) {
    case 'CREATED':
    case 'PENDING_DOCTOR_REVIEW':
      return 0;
    case 'DOCTOR_DECIDED':
    case 'PENDING_PAYMENT':
      return 1;
    case 'PAYMENT_CONFIRMED':
      return 2;
    case 'IN_PROGRESS':
      return 3;
    case 'COMPLETED':
      return 4;
    default:
      return 0;
  }
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'CREATED': return 'badge-gray';
    case 'PENDING_DOCTOR_REVIEW': return 'badge-yellow';
    case 'DOCTOR_DECIDED': return 'badge-blue';
    case 'PENDING_PAYMENT': return 'badge-yellow';
    case 'PAYMENT_CONFIRMED': return 'badge-green';
    case 'IN_PROGRESS': return 'badge-purple';
    case 'COMPLETED': return 'badge-green';
    case 'CANCELLED': return 'badge-red';
    default: return 'badge-gray';
  }
}

function getTriageBadgeClass(triage?: string): string {
  switch (triage) {
    case 'EMERGENCY':
      return 'badge-red';
    case 'URGENT':
      return 'badge-yellow';
    case 'SEE_DOCTOR':
      return 'badge-blue';
    case 'SELF_CARE':
      return 'badge-green';
    default:
      return 'badge-gray';
  }
}

export const ConsultationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { assignments: nurseAssignments } = useNurseAssignments();
  const { openingId, openChat } = useOpenConsultationChat();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [showCompletionForm, setShowCompletionForm] = useState(false);

  // Controlled decision form state
  const [selectedDecision, setSelectedDecision] = useState<VisitType | ''>('');
  const [selectedMethod, setSelectedMethod] = useState<VisitMethod | ''>('');
  const [diagnosis, setDiagnosis] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [followUpNeeded, setFollowUpNeeded] = useState(false);

  const invalidateConsultationCaches = () => {
    void queryClient.invalidateQueries({ queryKey: ['consultations'] });
    void queryClient.invalidateQueries({ queryKey: ['doctor-consultations'] });
    void queryClient.invalidateQueries({ queryKey: ['patient-consultations'] });
    void queryClient.invalidateQueries({ queryKey: ['nurse-consultations'] });
    void queryClient.invalidateQueries({ queryKey: ['nurse-chat-consultations'] });
    void queryClient.invalidateQueries({ queryKey: ['doctor-stats'] });
  };

  const loadConsultation = useCallback(async () => {
    if (!id) return;
    try {
      const data = await consultationApi.getConsultationById(id);
      setConsultation(data);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load consultation'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadConsultation();
  }, [loadConsultation]);

  const resetDecisionForm = () => {
    setSelectedDecision('');
    setSelectedMethod('');
    setDiagnosis('');
    setSuggestions('');
    setDecisionNotes('');
    setFollowUpNeeded(false);
  };

  const isDirectDiagnosis = selectedDecision === 'DIRECT_DIAGNOSIS';
  const methodIsSoon = !isDirectDiagnosis && isVisitMethodSoon(selectedMethod);

  const handleDecide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedDecision) return;

    if (isDirectDiagnosis) {
      if (!diagnosis.trim() || !suggestions.trim()) {
        toast.error('Please provide both final diagnosis and suggestions.');
        return;
      }
    } else {
      if (!selectedMethod) {
        toast.error('Please select a visit method.');
        return;
      }
      if (isVisitMethodSoon(selectedMethod)) {
        return;
      }
    }

    setDeciding(true);
    try {
      await consultationApi.decide(
        id,
        isDirectDiagnosis
          ? {
              doctorDecision: 'DIRECT_DIAGNOSIS',
              diagnosis: diagnosis.trim(),
              suggestions: suggestions.trim(),
              notes: decisionNotes.trim() || undefined,
              followUpNeeded,
            }
          : {
              doctorDecision: selectedDecision,
              visitMethod: selectedMethod as VisitMethod,
              notes: decisionNotes.trim() || undefined,
            },
      );
      toast.success(
        isDirectDiagnosis
          ? 'Diagnosis submitted and consultation completed'
          : 'Consultation decision saved',
      );
      setShowDecisionForm(false);
      resetDecisionForm();
      invalidateConsultationCaches();
      await loadConsultation();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to decide consultation'));
    } finally {
      setDeciding(false);
    }
  };

  const handleAdvancePayment = async () => {
    if (!id) return;
    setAdvancing(true);
    try {
      await consultationApi.advancePayment(id);
      toast.success('Consultation advanced to payment');
      invalidateConsultationCaches();
      await loadConsultation();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to advance to payment'));
    } finally {
      setAdvancing(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!id) return;
    setConfirmingPayment(true);
    try {
      await consultationApi.confirmPayment(id);
      toast.success('Payment confirmed');
      invalidateConsultationCaches();
      await loadConsultation();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to confirm payment'));
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleStart = async () => {
    if (!id) return;
    setStarting(true);
    try {
      await consultationApi.start(id);
      toast.success('Consultation started');
      invalidateConsultationCaches();
      await loadConsultation();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to start consultation'));
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const notes = formData.get('notes') as string;
    const summary = formData.get('summary') as string;
    const followUp = formData.get('followUpNeeded') === 'on';

    setCompleting(true);
    try {
      await consultationApi.complete(id, { notes, summary, followUpNeeded: followUp });
      toast.success('Consultation completed successfully');
      setShowCompletionForm(false);
      invalidateConsultationCaches();
      await loadConsultation();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to complete consultation'));
    } finally {
      setCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to cancel this consultation?')) {
      return;
    }

    setCancelling(true);
    try {
      await consultationApi.cancel(id);
      toast.success('Consultation cancelled successfully');
      invalidateConsultationCaches();
      navigate('/consultations');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to cancel consultation'));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">Consultation not found</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isParticipant =
    user?.role === 'PATIENT' ||
    user?.role === 'DOCTOR' ||
    user?.isAdmin ||
    user?.isSuperAdmin;
  const canDecide =
    user?.role === 'DOCTOR' && consultation.status === 'PENDING_DOCTOR_REVIEW';
  const canAdvancePayment =
    isParticipant && consultation.status === 'DOCTOR_DECIDED';
  const canConfirmPayment =
    isParticipant && consultation.status === 'PENDING_PAYMENT';
  const canStart =
    user?.role === 'DOCTOR' && consultation.status === 'PAYMENT_CONFIRMED';
  const canComplete =
    user?.role === 'DOCTOR' && consultation.status === 'IN_PROGRESS';
  const canCancel =
    isParticipant && CANCELLABLE_STATUSES.includes(consultation.status);

  const chatAction = getConsultationChatAction(consultation, user, nurseAssignments);
  const canBookOnSite =
    consultation.visitMethod === 'ON_SITE' &&
    user?.role === 'PATIENT' &&
    !consultation.appointment &&
    consultation.status !== 'COMPLETED' &&
    consultation.status !== 'CANCELLED';

  const patientName = consultation.patient
    ? `${consultation.patient.firstname} ${consultation.patient.lastname}`
    : `Patient ${consultation.patientId.substring(0, 8)}`;
  const doctorUser = consultation.doctor?.user;
  const doctorName = doctorUser
    ? `Dr. ${doctorUser.firstname} ${doctorUser.lastname}`
    : `Doctor #${consultation.doctorId}`;

  const steps =
    consultation.doctorDecision === 'DIRECT_DIAGNOSIS'
      ? DIRECT_DIAGNOSIS_STEPS
      : STANDARD_STEPS;
  const activeStepIndex = getStepIndex(consultation);
  const isDecidedOrDone =
    consultation.status !== 'CREATED' &&
    consultation.status !== 'PENDING_DOCTOR_REVIEW';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-slide-in-up">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 bg-gradient-to-br from-brand-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-soft flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Consultation Details</h1>
            <p className="text-xs font-mono text-gray-400 truncate mt-0.5">
              ID: {consultation.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {chatAction.canOpen && (
            <button
              type="button"
              onClick={() => openChat(consultation.id)}
              disabled={openingId === consultation.id}
              className="btn-success px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <MessageSquare className="w-4 h-4" />
              {openingId === consultation.id ? 'Opening...' : chatAction.label}
            </button>
          )}
          <span className={`badge ${getStatusBadgeColor(consultation.status)} px-3 py-1 text-xs`}>
            {formatStatus(consultation.status)}
          </span>
        </div>
      </div>

      {/* Lifecycle Stepper */}
      <div className="card p-5 animate-slide-in-up" style={{ animationDelay: '40ms' }}>
        {consultation.status === 'CANCELLED' ? (
          <div className="flex items-center gap-3 text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Consultation Cancelled</p>
              <p className="text-xs text-red-600/80">
                This consultation has been cancelled and no further actions can be taken.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            {steps.map((step, idx) => {
              const reached = idx <= activeStepIndex;
              const isCurrent = idx === activeStepIndex && consultation.status !== 'COMPLETED';
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center min-w-[76px] text-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        reached
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-brand-100' : ''}`}
                    >
                      {idx < activeStepIndex || consultation.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-[11px] mt-1.5 font-medium whitespace-nowrap ${
                        reached ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 min-w-[18px] -mt-5 rounded-full ${
                        idx < activeStepIndex ? 'bg-brand-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Participant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-in-up" style={{ animationDelay: '70ms' }}>
        <Link
          to={`/user/${consultation.patientId}`}
          className="card card-hover p-5 flex items-center gap-4 group"
        >
          <UserAvatar
            avatar={consultation.patient?.avatar}
            firstname={consultation.patient?.firstname}
            lastname={consultation.patient?.lastname}
            alt={patientName}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-white font-bold flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Patient
            </span>
            <p className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors truncate">
              {patientName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">View patient profile →</p>
          </div>
        </Link>

        <Link
          to={`/doctor/${consultation.doctorId}`}
          className="card card-hover p-5 flex items-center gap-4 group"
        >
          <UserAvatar
            avatar={doctorUser?.avatar}
            firstname={doctorUser?.firstname}
            lastname={doctorUser?.lastname}
            alt={doctorName}
            fallback={<Stethoscope className="w-5 h-5 text-brand-600" />}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Doctor
            </span>
            <p className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors truncate">
              {doctorName}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
              {consultation.doctor?.specialty && (
                <span>{formatSpecialty(consultation.doctor.specialty)}</span>
              )}
              {(consultation.doctor?.clinicLocation || consultation.doctor?.location) && (
                <span className="flex items-center gap-1 truncate">
                  · <MapPin className="w-3 h-3 flex-shrink-0" />
                  {consultation.doctor.clinicLocation || consultation.doctor.location}
                </span>
              )}
            </div>
            {consultation.doctor?.languages && consultation.doctor.languages.length > 0 && (
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                Languages: {consultation.doctor.languages.join(', ')}
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* Overview, Decision, Diagnosis & Actions */}
      <div className="card p-6 space-y-5 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pb-4 border-b border-gray-100">
          <div>
            <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
              Created
            </span>
            <p className="font-medium text-gray-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {new Date(consultation.createdAt).toLocaleString()}
            </p>
          </div>
          {consultation.updatedAt && (
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
                Last Updated
              </span>
              <p className="font-medium text-gray-800">
                {new Date(consultation.updatedAt).toLocaleString()}
              </p>
            </div>
          )}
          {consultation.completedAt && (
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
                Completed At
              </span>
              <p className="font-medium text-emerald-700">
                {new Date(consultation.completedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Decision & Visit Method */}
        {(consultation.doctorDecision || consultation.visitMethod) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {consultation.doctorDecision && (
                <div className="p-4 rounded-xl bg-brand-50/50 border border-brand-100">
                  <span className="text-xs uppercase tracking-wider text-brand-600/80 font-semibold block mb-1">
                    Doctor Decision
                  </span>
                  <p className="font-semibold text-gray-900">
                    {formatVisitType(consultation.doctorDecision)}
                  </p>
                </div>
              )}
              {consultation.visitMethod && (
                <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                  <span className="text-xs uppercase tracking-wider text-purple-600/80 font-semibold block mb-1">
                    Visit Method
                  </span>
                  <p className="font-semibold text-gray-900">
                    {formatVisitMethod(consultation.visitMethod)}
                  </p>
                </div>
              )}
            </div>

            {(chatAction.canOpen || canBookOnSite) && (
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-semibold text-emerald-950">
                    {chatAction.canOpen
                      ? 'Consultation Chat Ready'
                      : 'On-Site Clinic Visit Recommended'}
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {chatAction.canOpen
                      ? user?.role === 'NURSE'
                        ? 'Join the shared consultation room to message the patient with the care team.'
                        : 'Open the consultation chat room to communicate directly.'
                      : 'Choose an available date and time slot with this doctor.'}
                  </p>
                </div>
                {chatAction.canOpen && (
                  <button
                    type="button"
                    onClick={() => openChat(consultation.id)}
                    disabled={openingId === consultation.id}
                    className="btn-success px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {openingId === consultation.id ? 'Opening...' : chatAction.label}
                  </button>
                )}
                {canBookOnSite && (
                  <Link
                    to={`/slots/${consultation.doctorId}`}
                    className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Book Clinic Slot
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Direct Diagnosis Output */}
        {consultation.diagnosis && (
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-1.5">
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-700 block">
              Final Diagnosis
            </span>
            <p
              dir={getMessageDirection(consultation.diagnosis)}
              className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed"
            >
              {consultation.diagnosis}
            </p>
          </div>
        )}

        {consultation.suggestions && (
          <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-100 space-y-1.5">
            <span className="text-xs uppercase tracking-wider font-semibold text-teal-700 block">
              Suggestions & Care Plan
            </span>
            <p
              dir={getMessageDirection(consultation.suggestions)}
              className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed"
            >
              {consultation.suggestions}
            </p>
          </div>
        )}

        {consultation.notes && (
          <div>
            <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
              Clinical Notes
            </span>
            <p
              dir={getMessageDirection(consultation.notes)}
              className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50/80 p-3.5 rounded-xl border border-gray-100"
            >
              {consultation.notes}
            </p>
          </div>
        )}

        {consultation.summary && (
          <div>
            <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
              Consultation Summary
            </span>
            <p
              dir={getMessageDirection(consultation.summary)}
              className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50/80 p-3.5 rounded-xl border border-gray-100"
            >
              {consultation.summary}
            </p>
          </div>
        )}

        {isDecidedOrDone && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Follow-up Needed:</span>
            <span className={`badge ${consultation.followUpNeeded ? 'badge-yellow' : 'badge-gray'}`}>
              {consultation.followUpNeeded ? 'Yes' : 'No'}
            </span>
          </div>
        )}
      </div>

      {/* Linked SOAP, Appointment & Payment Context Cards */}
      {(consultation.soapId || consultation.appointment || consultation.payment) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-in-up" style={{ animationDelay: '120ms' }}>
          {consultation.soapId && (
            <div className="card p-5 space-y-3 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <h2 className="font-semibold text-gray-900">Linked SOAP Note</h2>
                  {consultation.soap?.triageLevel && (
                    <span className={`badge ${getTriageBadgeClass(consultation.soap.triageLevel)}`}>
                      {formatTriageLevel(consultation.soap.triageLevel)}
                    </span>
                  )}
                  {consultation.soap?.suggestedSpecialty && (
                    <span className="badge badge-blue">
                      {formatSpecialty(consultation.soap.suggestedSpecialty)}
                    </span>
                  )}
                </div>
                <Link
                  to={`/soap/${consultation.soapId}`}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium underline"
                >
                  View SOAP Note
                </Link>
              </div>
              {consultation.soap?.subjective && (
                <div className="text-sm bg-gray-50/70 rounded-xl p-3 border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase block mb-1">
                    Subjective Preview
                  </span>
                  <p
                    dir={getMessageDirection(consultation.soap.subjective)}
                    className="text-gray-700 line-clamp-3 whitespace-pre-wrap"
                  >
                    {consultation.soap.subjective}
                  </p>
                </div>
              )}
              {consultation.soap?.assessment && (
                <div className="text-sm bg-gray-50/70 rounded-xl p-3 border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase block mb-1">
                    Assessment Preview
                  </span>
                  <p
                    dir={getMessageDirection(consultation.soap.assessment)}
                    className="text-gray-700 line-clamp-3 whitespace-pre-wrap"
                  >
                    {consultation.soap.assessment}
                  </p>
                </div>
              )}
            </div>
          )}

          {consultation.appointment && (
            <div className="card p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Appointment</h2>
                </div>
                <span className="badge badge-blue">
                  {formatStatus(consultation.appointment.status)}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="text-gray-400">When:</span>{' '}
                  {new Date(consultation.appointment.dateTime).toLocaleString()}
                </p>
                <p>
                  <span className="text-gray-400">Details:</span>{' '}
                  {consultation.appointment.durationMinutes} min · {formatVisitMethod(consultation.appointment.method)} · ${consultation.appointment.price}
                </p>
              </div>
              <Link
                to={`/appointments/${consultation.appointment.id}`}
                className="inline-block text-sm text-brand-600 hover:text-brand-700 font-medium underline pt-1"
              >
                View Appointment
              </Link>
            </div>
          )}

          {consultation.payment && (
            <div className="card p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-semibold text-gray-900">Payment</h2>
                </div>
                <span className="badge badge-green">
                  {formatStatus(consultation.payment.status)}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="text-gray-400">Amount:</span>{' '}
                  <span className="font-semibold text-gray-900">
                    {consultation.payment.amount} {consultation.payment.currency}
                  </span>
                </p>
                {consultation.payment.paidAt && (
                  <p>
                    <span className="text-gray-400">Paid:</span>{' '}
                    {new Date(consultation.payment.paidAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Doctor Decision Panel */}
      {canDecide && (
        <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '140ms' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Decision Panel</h2>

          {showDecisionForm ? (
            <form onSubmit={handleDecide} className="space-y-5">
              <div>
                <label
                  htmlFor="doctorDecision"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Decision
                </label>
                <select
                  id="doctorDecision"
                  name="doctorDecision"
                  value={selectedDecision}
                  onChange={(e) => {
                    const next = e.target.value as VisitType | '';
                    setSelectedDecision(next);
                    if (next === 'DIRECT_DIAGNOSIS') {
                      setSelectedMethod('');
                    }
                  }}
                  className="w-full px-4 py-2.5 border input-focus"
                  required
                >
                  <option value="">Select decision</option>
                  <optgroup label="Immediate Resolution">
                    <option value="DIRECT_DIAGNOSIS">
                      Direct Diagnosis (Conclude Immediately)
                    </option>
                  </optgroup>
                  <optgroup label="Clinical Visit Types">
                    {CLINICAL_VISIT_TYPES.map((vt) => (
                      <option key={vt.value} value={vt.value}>
                        {vt.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {isDirectDiagnosis ? (
                <div className="space-y-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <div className="flex items-start gap-2.5 text-sm text-indigo-900">
                    <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <p>
                      Concludes this consultation immediately without further discussion and shares your final diagnosis and recommendations directly with the patient.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="diagnosis"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Final Diagnosis *
                    </label>
                    <textarea
                      id="diagnosis"
                      name="diagnosis"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Write your clinical assessment and final diagnosis..."
                      className="w-full px-4 py-2.5 border input-focus"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="suggestions"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Suggestions & Recommendations *
                    </label>
                    <textarea
                      id="suggestions"
                      name="suggestions"
                      value={suggestions}
                      onChange={(e) => setSuggestions(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Treatment guidance, lifestyle advice, warning signs, or prescriptions..."
                      className="w-full px-4 py-2.5 border input-focus"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="directNotes"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      id="directNotes"
                      name="notes"
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      rows={2}
                      maxLength={2000}
                      placeholder="Any extra context for the patient..."
                      className="w-full px-4 py-2.5 border input-focus"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={followUpNeeded}
                      onChange={(e) => setFollowUpNeeded(e.target.checked)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Follow-up needed later
                  </label>
                </div>
              ) : (
                <>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                      Visit Method
                    </span>
                    <div
                      role="radiogroup"
                      aria-label="Visit Method"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      {VISIT_METHOD_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const active = selectedMethod === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setSelectedMethod(opt.value)}
                            className={`text-left p-3.5 rounded-xl border transition-all duration-150 flex items-start gap-3 ${
                              active
                                ? opt.soon
                                  ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-200'
                                  : 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-200'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                opt.soon
                                  ? 'bg-amber-100 text-amber-700'
                                  : active
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  {opt.label}
                                </span>
                                {opt.soon && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                    Soon
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {methodIsSoon && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                        Voice and video calls are coming soon. Please select Chat or On-Site for now.
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="decisionNotes"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Notes for Patient (Optional)
                    </label>
                    <textarea
                      id="decisionNotes"
                      name="notes"
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      rows={2}
                      maxLength={2000}
                      placeholder="Optional instructions before the consultation..."
                      className="w-full px-4 py-2.5 border input-focus"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={deciding || methodIsSoon || !selectedDecision || (!isDirectDiagnosis && !selectedMethod)}
                  className="flex-1 btn-primary py-2.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {methodIsSoon
                    ? 'Soon...'
                    : deciding
                      ? 'Submitting...'
                      : isDirectDiagnosis
                        ? 'Submit Diagnosis & Complete'
                        : 'Submit Decision'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDecisionForm(false);
                    resetDecisionForm();
                  }}
                  className="btn-secondary px-4 py-2.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowDecisionForm(true)}
              className="w-full btn-primary py-2.5 px-4"
            >
              Make Decision
            </button>
          )}
        </div>
      )}

      {/* Advance to Payment */}
      {canAdvancePayment && (
        <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '140ms' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Proceed to Payment</h2>
          <p className="text-sm text-gray-500 mb-4">
            The doctor has decided on the consultation plan. Advance this consultation to the payment step to continue.
          </p>
          <button
            type="button"
            onClick={handleAdvancePayment}
            disabled={advancing}
            className="w-full btn-primary py-2.5 px-4 disabled:opacity-50"
          >
            {advancing ? 'Advancing...' : 'Proceed to Payment'}
          </button>
        </div>
      )}

      {/* Confirm Payment */}
      {canConfirmPayment && (
        <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '140ms' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Confirmation</h2>
          <p className="text-sm text-gray-500 mb-4">
            Confirm payment for this consultation so the doctor can begin.
          </p>
          <button
            type="button"
            onClick={handleConfirmPayment}
            disabled={confirmingPayment}
            className="w-full btn-success py-2.5 px-4 disabled:opacity-50"
          >
            {confirmingPayment ? 'Confirming...' : 'Confirm Payment'}
          </button>
        </div>
      )}

      {/* Doctor Start Consultation */}
      {canStart && (
        <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '160ms' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to Start</h2>
          <p className="text-sm text-gray-500 mb-4">
            Payment is confirmed. Start the consultation when you are ready.
          </p>
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="w-full btn-primary py-2.5 px-4 disabled:opacity-50"
          >
            {starting ? 'Starting...' : 'Start Consultation'}
          </button>
        </div>
      )}

      {/* Doctor Completion Panel */}
      {canComplete && (
        <div className="card p-6 animate-slide-in-up" style={{ animationDelay: '180ms' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Completion Panel</h2>

          {showCompletionForm ? (
            <form onSubmit={handleComplete} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  name="notes"
                  className="w-full px-4 py-2.5 border input-focus"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
                <textarea
                  name="summary"
                  className="w-full px-4 py-2.5 border input-focus"
                  rows={3}
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" name="followUpNeeded" className="rounded" defaultChecked={false} />
                  <span className="text-gray-700 text-sm">Follow-up Needed</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={completing}
                  className="flex-1 btn-primary py-2.5 px-4 disabled:opacity-50"
                >
                  {completing ? 'Completing...' : 'Complete Consultation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompletionForm(false)}
                  className="btn-secondary px-4 py-2.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowCompletionForm(true)}
              className="btn-success w-full py-2.5 px-4"
            >
              Complete Consultation
            </button>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          {user?.role === 'PATIENT' && consultation.status === 'COMPLETED' && (
            <Link
              to={`/doctor/${consultation.doctorId}/review`}
              className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1.5"
            >
              <Star className="w-4 h-4" />
              Write a Review
            </Link>
          )}
          {user?.role === 'PATIENT' && (
            <button
              type="button"
              onClick={() => navigate('/patient/consultations')}
              className="btn-secondary px-4 py-2.5 text-sm"
            >
              My Consultations
            </button>
          )}
        </div>

        {canCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="btn-danger px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Consultation'}
          </button>
        )}
      </div>
    </div>
  );
};
