import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import toast from 'react-hot-toast';

export const AdminDoctorVerificationPage: React.FC = () => {
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [verifyingDoctorId, setVerifyingDoctorId] = useState<number | null>(null);

  useEffect(() => {
    const loadPending = async () => {
      try {
        const data = await adminApi.verifications.listPending();
        setPendingDoctors(data || []);
      } catch (error) {
        console.error('Failed to load pending doctors:', error);
        toast.error('Failed to load pending doctors');
      } finally {
        setLoading(false);
      }
    };
    loadPending();
  }, []);

  const handleVerify = async (doctorId: number, approved: boolean) => {
    setVerifyingDoctorId(doctorId);
    try {
      await adminApi.verifications.verify(doctorId, approved, approved ? undefined : rejectReason);
      setPendingDoctors(prev => prev.filter(d => d.doctorId !== doctorId));
      toast.success(approved ? 'Doctor verified successfully' : 'Doctor verification rejected');
      setRejectReason('');
      setSelectedDoctor(null);
    } catch (error) {
      console.error('Failed to verify doctor:', error);
      toast.error('Failed to verify doctor');
    } finally {
      setVerifyingDoctorId(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Doctor Verifications</h1>
      
      {pendingDoctors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No pending verifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingDoctors.map((doctor) => (
            <div key={doctor.doctorId} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {doctor.user?.firstname?.[0]}{doctor.user?.lastname?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{doctor.user?.firstname} {doctor.user?.lastname}</h3>
                  <p className="text-sm text-gray-500">{doctor.user?.email}</p>
                  <p className="text-sm text-gray-500">
                    {doctor.user?.role} • ID: {doctor.user?.id}
                  </p>
                </div>
              </div>
              
              {doctor.documents?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Documents:</h4>
                  <div className="space-y-2">
                    {doctor.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <span className="text-sm font-medium capitalize">{doc.type?.replace('_', ' ') || doc.type}</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            doc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            doc.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => handleVerify(doctor.doctorId, true)}
                  disabled={verifyingDoctorId === doctor.doctorId}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyingDoctorId === doctor.doctorId ? 'Verifying...' : 'Approve'}
                </button>
                <button 
                  onClick={() => setSelectedDoctor(doctor)}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {selectedDoctor && (
        <RejectModal
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onClose={() => setSelectedDoctor(null)}
          onReject={() => handleVerify(selectedDoctor.doctorId, false)}
          loading={verifyingDoctorId === selectedDoctor.doctorId}
        />
      )}
    </div>
  );
};

interface RejectModalProps {
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onReject: () => void;
  loading: boolean;
}

const RejectModal: React.FC<RejectModalProps> = ({ reason, onReasonChange, onClose, onReject, loading }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Reject Doctor Verification</h2>
          <p className="text-sm text-gray-500 mt-1">
            Please provide a reason for rejection to help the doctor improve their application.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Rejection Reason</label>
            <textarea
              value={reason}
              onChange={e => onReasonChange(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 min-h-[100px]"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onReject}
              disabled={!reason.trim() || loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Rejecting...' : 'Reject Application'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
