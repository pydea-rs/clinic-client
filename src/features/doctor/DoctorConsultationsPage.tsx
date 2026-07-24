import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { consultationApi } from '../../api/consultation.api';
import { ConsultationStatus } from '../../lib/types/api';
import { formatStatus, formatVisitMethod, formatEnum } from '../../lib/format';
import { ClipboardList, ChevronRight, FileText, Calendar, User } from 'lucide-react';

type StatusTab = 'ALL' | ConsultationStatus;

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING_DOCTOR_REVIEW', label: 'Pending Review' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const statusBadgeClass = (status: string): string => {
  switch (status) {
    case 'CREATED': return 'badge-gray';
    case 'PENDING_DOCTOR_REVIEW': return 'badge-yellow';
    case 'DOCTOR_DECIDED': return 'badge-blue';
    case 'PENDING_PAYMENT': return 'badge-yellow';
    case 'PAYMENT_CONFIRMED': return 'badge-green';
    case 'IN_PROGRESS': return 'badge-purple';
    case 'COMPLETED': return 'badge-green';
    case 'CANCELLED': return 'badge-red';
    default: return 'badge-gray';
  }
};

export const DoctorConsultationsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const limit = 10;

  const statusParam = activeTab === 'ALL' ? undefined : activeTab;

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-consultations', page, limit, statusParam],
    queryFn: () => consultationApi.getConsultations(page, limit, statusParam),
  });

  const filtered = data?.consultations || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-fade-in">
        {/* Shimmer header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="shimmer h-10 w-10 rounded-xl" />
          <div className="shimmer h-8 w-52 rounded-lg" />
        </div>
        {/* Shimmer tabs */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shimmer h-9 w-28 rounded-xl" />
          ))}
        </div>
        {/* Shimmer cards */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6">
              <div className="space-y-3">
                <div className="shimmer h-5 w-48 rounded" />
                <div className="shimmer h-4 w-64 rounded" />
                <div className="shimmer h-3 w-36 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-soft">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Consultations</h1>
          <p className="text-sm text-gray-500">Review and manage patient consultations</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 animate-slide-in-up">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.value
                ? 'bg-brand-600 text-white shadow-soft'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Consultations List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 animate-slide-in-up">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-orange-400" />
          </div>
          <p className="text-gray-700 font-medium mb-1">No consultations found</p>
          <p className="text-sm text-gray-500">
            {activeTab !== 'ALL'
              ? `No ${formatStatus(activeTab).toLowerCase()} consultations.`
              : 'Consultations will appear here as patients connect.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filtered.map((consultation, index) => {
            const patientName = consultation.patient
              ? `${consultation.patient.firstname} ${consultation.patient.lastname}`
              : 'Patient';

            return (
              <div
                key={consultation.id}
                className="card p-5 animate-slide-in-up hover:shadow-md transition-shadow duration-200"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Patient & Status */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">{patientName}</h3>
                      </div>
                      <span className={`badge ${statusBadgeClass(consultation.status)}`}>
                        {formatStatus(consultation.status)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(consultation.createdAt).toLocaleDateString()}
                      </span>
                      {consultation.doctorDecision && (
                        <span className="badge badge-blue">
                          {formatEnum(consultation.doctorDecision)}
                        </span>
                      )}
                      {consultation.visitMethod && (
                        <span className="badge badge-purple">
                          {formatVisitMethod(consultation.visitMethod)}
                        </span>
                      )}
                      {consultation.soapId && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <FileText className="w-3.5 h-3.5" />
                          SOAP
                        </span>
                      )}
                    </div>

                    {/* Notes preview */}
                    {consultation.notes && (
                      <p className="text-sm text-gray-400 mt-2 truncate">{consultation.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {consultation.soapId && (
                      <Link
                        to={`/soap/${consultation.soapId}`}
                        className="btn-secondary px-3 py-1.5 text-sm flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        SOAP
                      </Link>
                    )}
                    <Link
                      to={`/consultation/${consultation.id}`}
                      className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5"
                    >
                      View
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-6 animate-fade-in">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
