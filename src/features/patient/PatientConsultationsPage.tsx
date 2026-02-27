import React, { useState, useEffect } from 'react';
import { patientApi } from '../../api/patient.api';
import { useAuthStore } from '../../lib/stores/auth.store';
import { Link } from 'react-router-dom';

export const PatientConsultationsPage: React.FC = () => {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadConsultations = async () => {
      try {
        const data = await patientApi.getConsultations();
        setConsultations(data.consultations || []);
      } catch (error) {
        console.error('Failed to load consultations:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConsultations();
  }, []);

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Consultations</h1>
      
      {consultations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No consultations found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {consultations.map((consultation) => (
            <div key={consultation.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">Consultation #{consultation.id.substring(0, 8)}...</h3>
                  <p className="text-sm text-gray-500">Doctor ID: {consultation.doctorId}</p>
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
                <div>
                  <span className="text-gray-500">Decision:</span>
                  <p className="font-medium">{consultation.doctorDecision || 'N/A'}</p>
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
              
              {consultation.soapId && (
                <div className="mt-4 pt-4 border-t">
                  <Link to={`/soap/${consultation.soapId}`} className="text-blue-600 hover:underline">
                    View SOAP Note
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
