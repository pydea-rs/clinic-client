import React, { useState, useEffect } from 'react';
import { consultationApi } from '../../api/consultation.api';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const ConsultationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const loadConsultation = async () => {
      if (!id) return;
      try {
        const data = await consultationApi.getById(id);
        setConsultation(data);
      } catch (error) {
        console.error('Failed to load consultation:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConsultation();
  }, [id]);

  const handleDecide = async (doctorDecision: 'ASYNC' | 'ONLINE' | 'IN_PERSON', visitMethod?: string) => {
    setDeciding(true);
    try {
      await consultationApi.decide(id!, { doctorDecision, visitMethod });
      toast.success('Decision recorded');
      const data = await consultationApi.getById(id!);
      setConsultation(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to record decision');
    } finally {
      setDeciding(false);
    }
  };

  const handleComplete = async (notes?: string, summary?: string, followUpNeeded?: boolean) => {
    setCompleting(true);
    try {
      await consultationApi.complete(id!, { notes, summary, followUpNeeded });
      toast.success('Consultation completed');
      const data = await consultationApi.getById(id!);
      setConsultation(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete consultation');
    } finally {
      setCompleting(false);
    }
  };

  const handleCancel = async (reason?: string) => {
    setCanceling(true);
    try {
      await consultationApi.cancel(id!, reason);
      toast.success('Consultation cancelled');
      navigate('/patient/consultations');
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel consultation');
    } finally {
      setCanceling(false);
    }
  };

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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!consultation) {
    return <div className="flex items-center justify-center min-h-screen">Consultation not found</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Consultation Details</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Consultation #{consultation.id.substring(0, 8)}...</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(consultation.status)}`}>
            {consultation.status.replace('_', ' ')}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-gray-500">Patient:</span>
            <p className="font-medium">{consultation.patientId}</p>
          </div>
          <div>
            <span className="text-gray-500">Doctor:</span>
            <p className="font-medium">{consultation.doctorId}</p>
          </div>
          <div>
            <span className="text-gray-500">SOAP:</span>
            <p className="font-medium">{consultation.soapId || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Decision:</span>
            <p className="font-medium">{consultation.doctorDecision || 'Pending'}</p>
          </div>
          <div>
            <span className="text-gray-500">Method:</span>
            <p className="font-medium">{consultation.visitMethod || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Follow-up:</span>
            <p className="font-medium">{consultation.followUpNeeded ? 'Yes' : 'No'}</p>
          </div>
        </div>
        
        {consultation.notes && (
          <div className="mb-4">
            <span className="text-gray-500">Notes:</span>
            <p className="text-gray-700">{consultation.notes}</p>
          </div>
        )}
        
        {consultation.summary && (
          <div className="mb-4">
            <span className="text-gray-500">Summary:</span>
            <p className="text-gray-700">{consultation.summary}</p>
          </div>
        )}
      </div>

      {/* Doctor Actions */}
      {consultation.status === 'PENDING_DOCTOR_REVIEW' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold mb-4">Doctor Decision</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleDecide('ASYNC')}
              disabled={deciding}
              className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
            >
              <h4 className="font-medium">Async Response</h4>
              <p className="text-sm text-gray-500">Send diagnosis via text/audio/video message</p>
            </button>
            <button
              onClick={() => handleDecide('ONLINE', 'CHAT')}
              disabled={deciding}
              className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
            >
              <h4 className="font-medium">Online Chat</h4>
              <p className="text-sm text-gray-500">Live text chat consultation</p>
            </button>
            <button
              onClick={() => handleDecide('ONLINE', 'VIDEO_CALL')}
              disabled={deciding}
              className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
            >
              <h4 className="font-medium">Video Call</h4>
              <p className="text-sm text-gray-500">Live video consultation</p>
            </button>
            <button
              onClick={() => handleDecide('IN_PERSON')}
              disabled={deciding}
              className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
            >
              <h4 className="font-medium">In-Person Visit</h4>
              <p className="text-sm text-gray-500">Schedule physical visit</p>
            </button>
          </div>
        </div>
      )}

      {/* Completion Form */}
      {consultation.status === 'DOCTOR_DECIDED' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold mb-4">Complete Consultation</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
                placeholder="Consultation notes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
              <textarea
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
                placeholder="Post-consultation summary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="followUp" className="rounded" />
              <label htmlFor="followUp" className="text-sm text-gray-700">Follow-up needed</label>
            </div>
            <button
              onClick={() => handleComplete()}
              disabled={completing}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-green-300"
            >
              {completing ? 'Completing...' : 'Complete Consultation'}
            </button>
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {['CREATED', 'PENDING_DOCTOR_REVIEW', 'DOCTOR_DECIDED', 'PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'IN_PROGRESS'].includes(consultation.status) && (
        <div className="mt-6">
          <button
            onClick={() => handleCancel('No reason provided')}
            disabled={canceling}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-red-300"
          >
            {canceling ? 'Cancelling...' : 'Cancel Consultation'}
          </button>
        </div>
      )}
    </div>
  );
};
