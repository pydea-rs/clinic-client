import React, { useState, useEffect, useCallback } from 'react';
import { consultationApi } from '../../api/consultation.api';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/stores/auth.store';
import toast from 'react-hot-toast';
import { Consultation } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';
import { formatStatus, formatVisitMethod, formatEnum } from '../../lib/format';
import { Loader2, ClipboardList } from 'lucide-react';

export const ConsultationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const { user } = useAuthStore();

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
    loadConsultation();
  }, [loadConsultation]);

  const handleDecide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const doctorDecision = formData.get('doctorDecision') as 'ASYNC' | 'ONLINE' | 'IN_PERSON';
    const visitMethod = formData.get('visitMethod') as 'CHAT' | 'VOICE_CALL' | 'VIDEO_CALL' | 'ON_SITE';

    setDeciding(true);
    try {
      await consultationApi.decide(id, { doctorDecision, visitMethod });
      toast.success('Consultation decided successfully');
      setShowDecisionForm(false);
      loadConsultation();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to decide consultation'));
    } finally {
      setDeciding(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const notes = formData.get('notes') as string;
    const summary = formData.get('summary') as string;
    const followUpNeeded = formData.get('followUpNeeded') === 'on';

    setCompleting(true);
    try {
      await consultationApi.complete(id, { notes, summary, followUpNeeded });
      toast.success('Consultation completed successfully');
      setShowCompletionForm(false);
      loadConsultation();
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
      navigate('/consultations');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to cancel consultation'));
    } finally {
      setCancelling(false);
    }
  };

  const canDecide = user?.role === 'DOCTOR' && consultation?.status === 'PENDING_DOCTOR_REVIEW';
  const canComplete = user?.role === 'DOCTOR' && consultation?.status === 'IN_PROGRESS';
  const canCancel = (user?.role === 'PATIENT' || user?.role === 'DOCTOR') &&
    !!consultation?.status && ['CREATED', 'PENDING_DOCTOR_REVIEW', 'DOCTOR_DECIDED'].includes(consultation.status);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-in">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Consultation not found</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
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
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-slide-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-soft">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Consultation Details</h1>
        </div>
        <span className={`badge ${getStatusColor(consultation.status)}`}>
          {formatStatus(consultation.status)}
        </span>
      </div>

      <div className="card p-6 mb-6 animate-slide-in-up" style={{ animationDelay: '60ms' }}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-gray-500">Consultation ID:</span>
            <p className="font-medium">{consultation.id}</p>
          </div>
          <div>
            <span className="text-gray-500">Created:</span>
            <p className="font-medium">{new Date(consultation.createdAt).toLocaleString()}</p>
          </div>
          {consultation.updatedAt && (
            <div>
              <span className="text-gray-500">Updated:</span>
              <p className="font-medium">{new Date(consultation.updatedAt).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-gray-500">Patient:</span>
            <p className="font-medium">{consultation.patientId}</p>
          </div>
          <div>
            <span className="text-gray-500">Doctor:</span>
            <p className="font-medium">{consultation.doctorId}</p>
          </div>
        </div>

        {consultation.soapId && (
          <div className="mb-4">
            <span className="text-gray-500">SOAP ID:</span>
            <p className="font-medium">{consultation.soapId}</p>
          </div>
        )}

        {consultation.doctorDecision && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-gray-500">Doctor Decision:</span>
              <p className="font-medium">{{ ASYNC: 'Async (Chat)', ONLINE: 'Online', IN_PERSON: 'In Person' }[consultation.doctorDecision!] || formatEnum(consultation.doctorDecision!)}</p>
            </div>
            <div>
              <span className="text-gray-500">Visit Method:</span>
              <p className="font-medium">{formatVisitMethod(consultation.visitMethod!)}</p>
            </div>
          </div>
        )}

        {consultation.notes && (
          <div className="mb-4">
            <span className="text-gray-500">Notes:</span>
            <p className="font-medium">{consultation.notes}</p>
          </div>
        )}

        {consultation.summary && (
          <div className="mb-4">
            <span className="text-gray-500">Summary:</span>
            <p className="font-medium">{consultation.summary}</p>
          </div>
        )}

        <div className="mb-4">
          <span className="text-gray-500">Follow-up Needed:</span>
          <p className="font-medium">{consultation.followUpNeeded ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Doctor Decision Panel */}
      {canDecide && (
        <div className="card p-6 mb-6 animate-slide-in-up" style={{ animationDelay: '120ms' }}>
          <h2 className="text-xl font-bold mb-4">Decision Panel</h2>
          
          {showDecisionForm ? (
            <form onSubmit={handleDecide} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                <select name="doctorDecision" className="w-full px-4 py-2.5 input-focus" required>
                  <option value="">Select decision</option>
                  <option value="ASYNC">Async (Chat)</option>
                  <option value="ONLINE">Online (Video/Audio)</option>
                  <option value="IN_PERSON">In Person</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visit Method</label>
                <select name="visitMethod" className="w-full px-4 py-2.5 input-focus" required>
                  <option value="">Select method</option>
                  <option value="CHAT">Chat</option>
                  <option value="VOICE_CALL">Voice Call</option>
                  <option value="VIDEO_CALL">Video Call</option>
                  <option value="ON_SITE">On Site</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={deciding}
                  className="flex-1 btn-primary py-2.5 disabled:opacity-50"
                >
                  {deciding ? 'Submitting...' : 'Submit Decision'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDecisionForm(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowDecisionForm(true)}
              className="w-full btn-primary py-2.5"
            >
              Make Decision
            </button>
          )}
        </div>
      )}

      {/* Doctor Completion Panel */}
      {canComplete && (
        <div className="card p-6 mb-6 animate-slide-in-up" style={{ animationDelay: '180ms' }}>
          <h2 className="text-xl font-bold mb-4">Completion Panel</h2>
          
          {showCompletionForm ? (
            <form onSubmit={handleComplete} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  name="notes"
                  className="w-full px-4 py-2.5 input-focus"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
                <textarea
                  name="summary"
                  className="w-full px-4 py-2.5 input-focus"
                  rows={3}
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" name="followUpNeeded" className="rounded" defaultChecked={false} />
                  <span className="text-gray-700">Follow-up Needed</span>
                </label>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={completing}
                  className="flex-1 btn-primary py-2.5 disabled:opacity-50"
                >
                  {completing ? 'Completing...' : 'Complete Consultation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompletionForm(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCompletionForm(true)}
              className="btn-success w-full py-2.5"
            >
              Complete Consultation
            </button>
          )}
        </div>
      )}

      {/* Cancel Button */}
      {canCancel && (
        <div className="card p-6 mb-6">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="btn-danger w-full py-2.5 disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Consultation'}
          </button>
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary"
        >
          Back
        </button>
        {user?.role === 'PATIENT' && (
          <button
            onClick={() => navigate('/patient/consultations')}
            className="btn-secondary"
          >
            My Consultations
          </button>
        )}
      </div>
    </div>
  );
};
