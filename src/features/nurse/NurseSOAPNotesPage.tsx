import React from 'react';
import { FileText, Loader2, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNurseAssignments } from './useNurseAssignments';
import { Link } from 'react-router-dom';
import { soapApi } from '../../api';
import { formatTriageLevel } from '../../lib/format';
import { PatientSOAP } from '../../lib/types/api';

export const NurseSOAPNotesPage: React.FC = () => {
  const { assignments, isLoading: assignLoading } = useNurseAssignments();
  const hasPermission = assignments.some((a) => a.permissions.includes('VIEW_SOAPS'));

  const { data, isLoading } = useQuery({
    queryKey: ['nurse-soaps'],
    queryFn: async () => {
      const result = await soapApi.list({ take: 50 });
      return result?.data || [];
    },
    enabled: hasPermission,
  });

  const soaps = data || [];

  if (assignLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">No Permission</h2>
          <p className="text-sm text-gray-500 mt-1">You don't have the View SOAP Notes permission.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-soft">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SOAP Notes</h1>
          <span className="text-sm text-gray-400">(read-only)</span>
        </div>
      </div>

      {soaps.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No SOAP notes found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {soaps.map((soap: PatientSOAP) => (
            <Link
              key={soap.id}
              to={`/soap/${soap.id}`}
              className="card p-4 flex items-center justify-between hover:shadow-md transition-all duration-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {soap.suggestedSpecialty || 'General'}
                  </span>
                  {soap.triageLevel && (
                    <span className={`badge text-xs ${
                      soap.triageLevel === 'EMERGENCY' ? 'badge-red' :
                      soap.triageLevel === 'URGENT' ? 'badge-yellow' : 'badge-green'
                    }`}>
                      {formatTriageLevel(soap.triageLevel)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                  {soap.subjective || 'No subjective data'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(soap.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
