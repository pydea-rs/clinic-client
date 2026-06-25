import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import { formatDocType, formatStatus } from '../../lib/format';

interface VerificationDocument {
  id: number;
  type: string;
  fileUrl: string;
  status: string;
}

interface PendingDoctor {
  doctorId: number;
  userId: string;
  user?: {
    id: string;
    firstname?: string;
    lastname?: string;
    email?: string;
    role?: string;
  };
  documents?: VerificationDocument[];
}

export const AdminDoctorVerificationPage: React.FC = () => {
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<PendingDoctor | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [verifyingDoctorId, setVerifyingDoctorId] = useState<number | null>(null);
  const [documentsByDoctor, setDocumentsByDoctor] = useState<Record<number, VerificationDocument[]>>({});

  useEffect(() => {
    const loadPending = async () => {
      try {
        const data = await adminApi.verifications.listPending();
        setPendingDoctors(data || []);
      } catch {
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
    } catch {
      toast.error('Failed to verify doctor');
    } finally {
      setVerifyingDoctorId(null);
    }
  };

  const loadDoctorDocuments = async (doctorId: number) => {
    try {
      const docs = await adminApi.verifications.getDocuments(doctorId);
      setDocumentsByDoctor((prev) => ({ ...prev, [doctorId]: docs || [] }));
      toast.success('Documents loaded');
    } catch {
      toast.error('Failed to load doctor documents');
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 shimmer rounded-xl" />
          <div className="space-y-2">
            <div className="w-48 h-6 shimmer" />
            <div className="w-64 h-4 shimmer" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 shimmer rounded-full" />
                <div className="space-y-2">
                  <div className="w-40 h-5 shimmer" />
                  <div className="w-56 h-4 shimmer" />
                  <div className="w-32 h-4 shimmer" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <div className="flex-1 h-10 shimmer rounded-xl" />
                <div className="flex-1 h-10 shimmer rounded-xl" />
                <div className="flex-1 h-10 shimmer rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-soft">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Verifications</h1>
          <p className="text-sm text-gray-500">Review and approve doctor applications</p>
        </div>
      </div>

      {pendingDoctors.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No pending verifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingDoctors.map((doctor, index) => (
            <div key={doctor.doctorId} className="card p-6 animate-slide-in-up" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
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

              {(documentsByDoctor[doctor.doctorId] || doctor.documents)?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Documents:</h4>
                  <div className="space-y-2">
                    {(documentsByDoctor[doctor.doctorId] || doctor.documents).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50/80 p-3 rounded-xl">
                        <div>
                          <span className="text-sm font-medium capitalize">{formatDocType(doc.type)}</span>
                          <span className={`ml-2 badge ${
                            doc.status === 'PENDING' ? 'badge-yellow' :
                            doc.status === 'APPROVED' ? 'badge-green' :
                            'badge-red'
                          }`}>
                            {formatStatus(doc.status)}
                          </span>
                        </div>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 hover:underline">
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => loadDoctorDocuments(doctor.doctorId)}
                  className="flex-1 btn-secondary py-2"
                >
                  Refresh Documents
                </button>
                <button
                  onClick={() => handleVerify(doctor.doctorId, true)}
                  disabled={verifyingDoctorId === doctor.doctorId}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-green-500 text-white py-2.5 rounded-xl hover:from-emerald-500 hover:to-green-400 font-medium shadow-sm btn-press disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyingDoctorId === doctor.doctorId ? 'Verifying...' : 'Approve'}
                </button>
                <button
                  onClick={() => setSelectedDoctor(doctor)}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-500 text-white py-2.5 rounded-xl hover:from-red-500 hover:to-rose-400 font-medium shadow-sm btn-press"
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card shadow-soft-xl max-w-md w-full">
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
              className="w-full px-3 py-2 input-focus min-h-[100px]"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={onReject}
              disabled={!reason.trim() || loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-xl hover:from-red-500 hover:to-rose-400 font-medium shadow-sm btn-press disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Rejecting...' : 'Reject Application'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
