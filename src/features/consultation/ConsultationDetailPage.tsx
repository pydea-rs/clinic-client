import React, { useState, useEffect, useCallback } from 'react';
import { consultationApi } from '../../api/consultation.api';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/stores/auth.store';
import toast from 'react-hot-toast';

export const ConsultationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<any>(null);
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to load consultation');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to decide consultation');
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
    const followUpNeeded = formData.get('followUpNeeded') === 'true';

    setCompleting(true);
    try {
      await consultationApi.complete(id, { notes, summary, followUpNeeded });
      toast.success('Consultation completed successfully');
      setShowCompletionForm(false);
      loadConsultation();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete consultation');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel consultation');
    } finally {
      setCancelling(false);
    }
  };

  const canDecide = user?.role === 'DOCTOR' && consultation?.status === 'PENDING_DOCTOR_REVIEW';
  const canComplete = user?.role === 'DOCTOR' && consultation?.status === 'DOCTOR_DECIDED';
  const canCancel = (user?.role === 'PATIENT' || user?.role === 'DOCTOR') && 
    ['CREATED', 'PENDING_DOCTOR_REVIEW', 'DOCTOR_DECIDED'].includes(consultation?.status);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!consultation) {
    return <div className="flex items-center justify-center min-h-screen">Consultation not found</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED': return 'bg-gray-100 text-gray-800';
      case 'PENDING_DOCTOR_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'DOCTOR_DECIDED': return 'bg-blue-100 text-blue-800';
      case 'PENDING_PAYMENT': return 'bg-orange-100 text-orange-800';
      case 'PAYMENT_CONFIRMED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Consultation Details</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(consultation.status)}`}>
          {consultation.status.replace('_', ' ')}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
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
              <p className="font-medium">{consultation.doctorDecision}</p>
            </div>
            <div>
              <span className="text-gray-500">Visit Method:</span>
              <p className="font-medium">{consultation.visitMethod}</p>
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
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Decision Panel</h2>
          
          {showDecisionForm ? (
            <form onSubmit={handleDecide} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                <select name="doctorDecision" className="w-full px-4 py-2 border rounded-lg" required>
                  <option value="">Select decision</option>
                  <option value="ASYNC">Async (Chat)</option>
                  <option value="ONLINE">Online (Video/Audio)</option>
                  <option value="IN_PERSON">In Person</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visit Method</label>
                <select name="visitMethod" className="w-full px-4 py-2 border rounded-lg" required>
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
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {deciding ? 'Submitting...' : 'Submit Decision'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDecisionForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowDecisionForm(true)}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Make Decision
            </button>
          )}
        </div>
      )}

      {/* Doctor Completion Panel */}
      {canComplete && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Completion Panel</h2>
          
          {showCompletionForm ? (
            <form onSubmit={handleComplete} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  name="notes"
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
                <textarea
                  name="summary"
                  className="w-full px-4 py-2 border rounded-lg"
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
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-green-300"
                >
                  {completing ? 'Completing...' : 'Complete Consultation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompletionForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCompletionForm(true)}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
            >
              Complete Consultation
            </button>
          )}
        </div>
      )}

      {/* Cancel Button */}
      {canCancel && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-red-300"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Consultation'}
          </button>
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        {user?.role === 'PATIENT' && (
          <button
            onClick={() => navigate('/patient/consultations')}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            My Consultations
          </button>
        )}
      </div>
    </div>
  );
};
