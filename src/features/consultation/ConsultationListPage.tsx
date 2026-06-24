import React, { useState, useEffect, useCallback } from 'react';
import { consultationApi } from '../../api/consultation.api';
import { useAuthStore } from '../../lib/stores/auth.store';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Consultation } from '../../lib/types/api';
import { getErrorMessage } from '../../lib/api/error.utils';
import { Loader2, ClipboardList, ChevronRight } from 'lucide-react';

export const ConsultationListPage: React.FC = () => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { user } = useAuthStore();

  const loadConsultations = useCallback(async () => {
    try {
      const data = await consultationApi.getConsultations(page, 10);
      setConsultations(data.consultations || []);
      setTotal(data.total || 0);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load consultations'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

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

  const canViewDetail = (consultation: Consultation) => {
    if (user?.isAdmin) return true;
    if (user?.role === 'PATIENT') {
      return consultation.patientId === user.id;
    }
    // Doctors see all consultations assigned to them (backend filters by role)
    if (user?.role === 'DOCTOR') return true;
    return false;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
    </div>;
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8 animate-slide-in-up">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-soft">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold gradient-text">Consultations</h1>
      </div>
      
      {consultations.length === 0 ? (
        <div className="text-center py-12 animate-fade-in">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No consultations found</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 stagger-children">
            {consultations.map((consultation) => (
              <div key={consultation.id} className="card card-hover p-6 animate-slide-in-up">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Consultation #{consultation.id.substring(0, 8)}...</h3>
                    <p className="text-sm text-gray-500">
                      {user?.role === 'PATIENT' 
                        ? `Doctor ID: ${consultation.doctorId}`
                        : `Patient ID: ${consultation.patientId}`}
                    </p>
                  </div>
                  <span className={`badge ${getStatusColor(consultation.status)}`}>
                    {consultation.status.replaceAll('_', ' ')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <p className="font-medium">{new Date(consultation.createdAt).toLocaleDateString()}</p>
                  </div>
                  {consultation.doctorDecision && (
                    <div>
                      <span className="text-gray-500">Decision:</span>
                      <p className="font-medium">{consultation.doctorDecision}</p>
                    </div>
                  )}
                  {consultation.visitMethod && (
                    <div>
                      <span className="text-gray-500">Method:</span>
                      <p className="font-medium">{consultation.visitMethod}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Follow-up:</span>
                    <p className="font-medium">{consultation.followUpNeeded ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                
                {canViewDetail(consultation) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link
                      to={`/consultation/${consultation.id}`}
                      className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
                    >
                      View Details
                    </Link>
                    {consultation.soapId && (
                      <>
                        {' | '}
                        <Link to={`/soap/${consultation.soapId}`} className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
                          View SOAP Note
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
