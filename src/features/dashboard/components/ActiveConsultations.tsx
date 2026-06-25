import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { consultationApi } from '../../../api/consultation.api';
import { ClipboardList, ChevronRight, Activity } from 'lucide-react';
import { formatVisitMethod } from '../../../lib/format';

const statusConfig: Record<string, { color: string; ring: string; dot: string }> = {
  CREATED: { color: 'bg-gray-50 text-gray-700', ring: 'ring-gray-500/10', dot: 'bg-gray-400' },
  PENDING_DOCTOR_REVIEW: { color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-500/10', dot: 'bg-amber-400' },
  DOCTOR_DECIDED: { color: 'bg-blue-50 text-blue-700', ring: 'ring-blue-500/10', dot: 'bg-blue-400' },
  PENDING_PAYMENT: { color: 'bg-orange-50 text-orange-700', ring: 'ring-orange-500/10', dot: 'bg-orange-400' },
  PAYMENT_CONFIRMED: { color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-500/10', dot: 'bg-emerald-400' },
  IN_PROGRESS: { color: 'bg-indigo-50 text-indigo-700', ring: 'ring-indigo-500/10', dot: 'bg-indigo-400 animate-pulse' },
  COMPLETED: { color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-500/10', dot: 'bg-emerald-400' },
  CANCELLED: { color: 'bg-red-50 text-red-700', ring: 'ring-red-500/10', dot: 'bg-red-400' },
};

const statusProgress: Record<string, number> = {
  CREATED: 5,
  PENDING_DOCTOR_REVIEW: 15,
  DOCTOR_DECIDED: 30,
  PENDING_PAYMENT: 40,
  PAYMENT_CONFIRMED: 50,
  IN_PROGRESS: 70,
  COMPLETED: 100,
  CANCELLED: 0,
};

const progressColor: Record<string, string> = {
  CREATED: 'bg-gray-400',
  PENDING_DOCTOR_REVIEW: 'bg-amber-500',
  DOCTOR_DECIDED: 'bg-blue-500',
  PENDING_PAYMENT: 'bg-orange-500',
  PAYMENT_CONFIRMED: 'bg-emerald-500',
  IN_PROGRESS: 'bg-indigo-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-400',
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
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Active Consultations</h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const consultations = data?.consultations || [];
  const active = consultations.filter((c) => c.status !== 'COMPLETED' && c.status !== 'CANCELLED');

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="font-semibold text-sm text-gray-900">Active Consultations</h3>
        </div>
        <Link to="/consultations" className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors">
          View all
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">No active consultations</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {active.map((consultation) => {
            const config = statusConfig[consultation.status] || statusConfig.CREATED;
            const progress = statusProgress[consultation.status] ?? 10;
            const barColor = progressColor[consultation.status] || 'bg-gray-400';
            return (
              <Link
                key={consultation.id}
                to={`/consultation/${consultation.id}`}
                className="card-interactive hover-lift block p-3 rounded-xl transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold ring-1 ${config.color} ${config.ring}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {formatStatus(consultation.status)}
                      </span>
                      {consultation.visitMethod && (
                        <span className="text-[11px] text-gray-400 font-medium">{formatVisitMethod(consultation.visitMethod)}</span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="progress-bar mt-2">
                      <div
                        className={`progress-bar-fill ${barColor}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Created {new Date(consultation.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 flex-shrink-0 transition-all duration-200" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
