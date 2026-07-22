import React from 'react';
import { ClipboardList, Loader2, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { consultationApi } from '../../api/consultation.api';
import { useNurseAssignments } from './useNurseAssignments';
import { formatStatus } from '../../lib/format';
import { Link } from 'react-router-dom';

export const NurseConsultationsPage: React.FC = () => {
  const { assignments, isLoading: assignLoading } = useNurseAssignments();
  const hasPermission = assignments.some((a) => a.permissions.includes('VIEW_CONSULTATION_NOTES'));

  const { data, isLoading } = useQuery({
    queryKey: ['nurse-consultations'],
    queryFn: () => consultationApi.getConsultations(1, 50),
    enabled: hasPermission,
  });

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
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">No Permission</h2>
          <p className="text-sm text-gray-500 mt-1">You don't have the View Consultation Notes permission.</p>
        </div>
      </div>
    );
  }

  const consultations = data?.consultations || [];

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-soft">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Consultations</h1>
        <span className="text-sm text-gray-400 ml-1">(read-only)</span>
      </div>

      {consultations.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No consultations found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map((c: any) => (
            <Link
              key={c.id}
              to={`/consultation/${c.id}`}
              className="card p-4 flex items-center justify-between hover:shadow-md transition-all duration-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {c.patient?.user?.firstname || 'Patient'} {c.patient?.user?.lastname || ''}
                  </span>
                  <span className={`badge text-xs ${
                    c.status === 'COMPLETED' ? 'badge-green' :
                    c.status === 'IN_PROGRESS' ? 'badge-blue' :
                    c.status === 'CANCELLED' ? 'badge-red' : 'badge-yellow'
                  }`}>
                    {formatStatus(c.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(c.createdAt).toLocaleDateString()} &middot; {c.consultationMode || 'N/A'}
                </p>
              </div>
              <Eye className="w-4 h-4 text-gray-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
