import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { consultationApi } from '../../../api/consultation.api';
import { ClipboardList, ChevronRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-50 text-gray-600',
  PENDING_DOCTOR_REVIEW: 'bg-yellow-50 text-yellow-600',
  DOCTOR_DECIDED: 'bg-blue-50 text-blue-600',
  PENDING_PAYMENT: 'bg-orange-50 text-orange-600',
  PAYMENT_CONFIRMED: 'bg-green-50 text-green-600',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-600',
  COMPLETED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-red-50 text-red-600',
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ActiveConsultations: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['consultations-dashboard'],
    queryFn: () => consultationApi.getConsultations(1, 5),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-medium text-sm text-gray-900 mb-3">Active Consultations</h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const consultations = data?.consultations || [];
  const active = consultations.filter((c) => c.status !== 'COMPLETED' && c.status !== 'CANCELLED');

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-gray-900">Active Consultations</h3>
        <Link to="/consultations" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          View all
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="text-center py-8">
          <ClipboardList className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No active consultations</p>
        </div>
      ) : (
        <div className="space-y-1">
          {active.map((consultation) => (
            <Link
              key={consultation.id}
              to={`/consultation/${consultation.id}`}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[consultation.status] || 'bg-gray-50 text-gray-600'}`}>
                    {formatStatus(consultation.status)}
                  </span>
                  {consultation.visitMethod && (
                    <span className="text-[11px] text-gray-400">{consultation.visitMethod.replace(/_/g, ' ')}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Created {new Date(consultation.createdAt).toLocaleDateString()}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
