import React, { useState, useEffect } from 'react';
import { patientApi } from '../../api/patient.api';
import { Link } from 'react-router-dom';

export const PatientSOAPListPage: React.FC = () => {
  const [soaps, setSoaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSoaps = async () => {
      try {
        const data = await patientApi.getSoaps();
        setSoaps(data.data || []);
      } catch (error) {
        console.error('Failed to load SOAPs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSoaps();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My SOAP Notes</h1>
      
      {soaps.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No SOAP notes found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {soaps.map((soap) => (
            <Link
              key={soap.id}
              to={`/soap/${soap.id}`}
              className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">SOAP Note</h3>
                  <p className="text-sm text-gray-500">{new Date(soap.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  {soap.triageLevel && (
                    <span className="block text-xs text-gray-500 mb-1">
                      {soap.triageLevel.replace('_', ' ')}
                    </span>
                  )}
                  {soap.suggestedSpecialty && (
                    <span className="block text-xs text-blue-600 font-medium">
                      {soap.suggestedSpecialty}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
