import React, { useState, useEffect } from 'react';
import { soapApi } from '../../api/soap.api';
import { useParams } from 'react-router-dom';

export const SOAPDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [soap, setSoap] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSOAP = async () => {
      if (!id) return;
      try {
        const data = await soapApi.getById(id);
        setSoap(data);
      } catch (error) {
        console.error('Failed to load SOAP:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSOAP();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!soap) {
    return <div className="flex items-center justify-center min-h-screen">SOAP not found</div>;
  }

  const getTriageColor = (level: string) => {
    switch (level) {
      case 'SELF_CARE': return 'bg-green-100 text-green-800';
      case 'SEE_DOCTOR': return 'bg-blue-100 text-blue-800';
      case 'URGENT': return 'bg-orange-100 text-orange-800';
      case 'EMERGENCY': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">SOAP Note</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">Created: {new Date(soap.createdAt).toLocaleDateString()}</span>
          {soap.triageLevel && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTriageColor(soap.triageLevel)}`}>
              {soap.triageLevel.replace('_', ' ')}
            </span>
          )}
        </div>
        
        {soap.suggestedSpecialty && (
          <div className="mb-4">
            <span className="text-sm text-gray-500">Suggested Specialty:</span>
            <p className="font-medium">{soap.suggestedSpecialty}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold mb-3 text-blue-600">Subjective</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{soap.subjective || 'N/A'}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold mb-3 text-blue-600">Objective</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{soap.objective || 'N/A'}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold mb-3 text-purple-600">Assessment</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{soap.assessment || 'N/A'}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold mb-3 text-green-600">Plan</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{soap.plan || 'N/A'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-bold mb-3 text-gray-600">Raw Note</h2>
        <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm whitespace-pre-wrap">
          {soap.rawNote}
        </pre>
      </div>
    </div>
  );
};
