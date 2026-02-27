import React, { useState, useEffect, useCallback } from 'react';
import { consultationApi } from '../../api/consultation.api';
import { useAuthStore } from '../../lib/stores/auth.store';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export const ConsultationListPage: React.FC = () => {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { user } = useAuthStore();

  const loadConsultations = useCallback(async () => {
    try {
      const data = await consultationApi.getConsultations(page, 10);
      setConsultations(data.consultations || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load consultations');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

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

  const canViewDetail = (consultation: any) => {
    // Patient can view all their consultations
    if (user?.role === 'PATIENT') {
      return consultation.patientId === user.id;
    }
    // Doctor can view consultations assigned to them
    if (user?.role === 'DOCTOR') {
      return consultation.doctorId === Number(user.id);
    }
    // Admin can view all
    return user?.isAdmin;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Consultations</h1>
      
      {consultations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No consultations found</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {consultations.map((consultation) => (
              <div key={consultation.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Consultation #{consultation.id.substring(0, 8)}...</h3>
                    <p className="text-sm text-gray-500">
                      {user?.role === 'PATIENT' 
                        ? `Doctor ID: ${consultation.doctorId}`
                        : `Patient ID: ${consultation.patientId}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(consultation.status)}`}>
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
                  <div className="mt-4 pt-4 border-t">
                    <Link 
                      to={`/consultation/${consultation.id}`} 
                      className="text-blue-600 hover:underline"
                    >
                      View Details
                    </Link>
                    {consultation.soapId && (
                      <>
                        {' | '}
                        <Link to={`/soap/${consultation.soapId}`} className="text-blue-600 hover:underline">
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
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
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
