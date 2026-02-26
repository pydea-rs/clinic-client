import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';

export const AdminDoctorVerificationPage: React.FC = () => {
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPending = async () => {
      try {
        const data = await adminApi.verifications.listPending();
        setPendingDoctors(data || []);
      } catch (error) {
        console.error('Failed to load pending doctors:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPending();
  }, []);

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
                </div>
              </div>
              
              {doctor.documents?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Documents:</h4>
                  <div className="space-y-2">
                    {doctor.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <span className="text-sm font-medium capitalize">{doc.type.replace('_', ' ')}</span>
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
                <button className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                  Approve
                </button>
                <button className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
