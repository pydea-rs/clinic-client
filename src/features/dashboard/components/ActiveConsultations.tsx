import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { consultationApi } from '../../../api/consultation.api';
import { ClipboardList, ChevronRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-700',
  PENDING_DOCTOR_REVIEW: 'bg-yellow-100 text-yellow-700',
  DOCTOR_DECIDED: 'bg-blue-100 text-blue-700',
  PENDING_PAYMENT: 'bg-orange-100 text-orange-700',
  PAYMENT_CONFIRMED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
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
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Active Consultations</h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const consultations = data?.consultations || [];
  const active = consultations.filter((c) => c.status !== 'COMPLETED' && c.status !== 'CANCELLED');

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Active Consultations</h3>
        <Link to="/consultations" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="text-center py-6">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No active consultations</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((consultation) => (
            <Link
              key={consultation.id}
              to={`/consultation/${consultation.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[consultation.status] || 'bg-gray-100 text-gray-700'}`}>
                    {formatStatus(consultation.status)}
                  </span>
                  {consultation.visitMethod && (
                    <span className="text-xs text-gray-500">{consultation.visitMethod.replace(/_/g, ' ')}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Created {new Date(consultation.createdAt).toLocaleDateString()}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
