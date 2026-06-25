import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '../../api/patient.api';
import { Link } from 'react-router-dom';
import { Loader2, ChevronRight, Plus, Stethoscope } from 'lucide-react';
import { formatStatus } from '../../lib/format';

const statusProgress: Record<string, number> = {
  CREATED: 10,
  PENDING_DOCTOR_REVIEW: 10,
  PENDING: 10,
  DOCTOR_DECIDED: 30,
  ACCEPTED: 30,
  PENDING_PAYMENT: 30,
  PAYMENT_CONFIRMED: 40,
  IN_PROGRESS: 60,
  COMPLETED: 100,
  CANCELLED: 0,
};

export const PatientConsultationsListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['consultations', page, statusFilter],
    queryFn: () => patientApi.getConsultations(page, limit, statusFilter || undefined),
  });

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      CREATED: 'badge-gray',
      PENDING_DOCTOR_REVIEW: 'badge-yellow',
      DOCTOR_DECIDED: 'badge-blue',
      PENDING_PAYMENT: 'badge-yellow',
      PAYMENT_CONFIRMED: 'badge-green',
      IN_PROGRESS: 'badge-purple',
      COMPLETED: 'badge-green',
      CANCELLED: 'badge-red',
    };
    return colors[status] || 'badge-gray';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const consultations = data?.consultations || [];

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8 animate-slide-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-500 rounded-xl flex items-center justify-center shadow-soft">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">My Consultations</h1>
        </div>
        <Link
          to="/patient/consultations/create"
          className="btn-primary flex items-center gap-2 px-5 py-2.5"
        >
          <Plus className="w-4 h-4" />
          New Consultation
        </Link>
      </div>

      {/* Status Filter */}
      <div className="mb-6 flex gap-2 flex-wrap animate-slide-in-up" style={{ animationDelay: '60ms' }}>
        <button
          onClick={() => { setStatusFilter(''); setPage(1); }}
          className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
            statusFilter === ''
              ? 'btn-primary'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
          }`}
        >
          All
        </button>
        {['CREATED', 'PENDING_DOCTOR_REVIEW', 'DOCTOR_DECIDED', 'PENDING_PAYMENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => { setStatusFilter(status); setPage(1); }}
            className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
              statusFilter === status
                ? 'btn-primary'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
            }`}
          >
            {formatStatus(status)}
          </button>
        ))}
      </div>

      {/* Consultations List */}
      <div className="space-y-0 animate-slide-in-up" style={{ animationDelay: '120ms' }}>
        {consultations.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-500 text-lg">No consultations found</p>
          </div>
        ) : (
          consultations.map((consultation, index) => (
            <React.Fragment key={consultation.id}>
              {index > 0 && <div className="divider-gradient my-1" />}
              <Link
                to={`/consultation/${consultation.id}`}
                className="card-interactive hover-lift block p-6 rounded-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-gray-500">
                      {consultation.id.substring(0, 8)}...
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      Doctor {consultation.doctorId}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${getStatusBadgeColor(consultation.status)} text-sm font-semibold px-3 py-1`}>
                      {formatStatus(consultation.status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(consultation.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${statusProgress[consultation.status] ?? 0}%` }}
                  />
                </div>
              </Link>
            </React.Fragment>
          ))
        )}
      </div>

      {/* Pagination */}
      {consultations.length > 0 && (
        <div className="mt-6 flex items-center justify-between animate-fade-in">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data?.total || 0)} of {data?.total || 0}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
