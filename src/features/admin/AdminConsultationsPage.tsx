import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, Search, X } from 'lucide-react';
import { consultationApi } from '../../api/consultation.api';
import { Consultation } from '../../lib/types/api';
import { formatStatus, formatVisitMethod } from '../../lib/format';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'CREATED', label: 'Created' },
  { value: 'PENDING_DOCTOR_REVIEW', label: 'Pending Doctor Review' },
  { value: 'DOCTOR_DECIDED', label: 'Doctor Decided' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'CREATED':
      return 'badge-gray';
    case 'PENDING_DOCTOR_REVIEW':
      return 'badge-yellow';
    case 'DOCTOR_DECIDED':
      return 'badge-blue';
    case 'PENDING_PAYMENT':
      return 'badge-yellow';
    case 'PAYMENT_CONFIRMED':
      return 'badge-green';
    case 'IN_PROGRESS':
      return 'badge-purple';
    case 'COMPLETED':
      return 'badge-green';
    case 'CANCELLED':
      return 'badge-red';
    default:
      return 'badge-gray';
  }
}

export const AdminConsultationsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-consultations', page, limit],
    queryFn: () => consultationApi.getConsultations(page, limit),
  });

  const consultations = data?.consultations || [];
  const total = data?.total || 0;

  // Client-side filtering
  const filteredConsultations = useMemo(() => {
    let result = consultations;

    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) => {
        const patientName = `${c.patient?.firstname || ''} ${c.patient?.lastname || ''}`.toLowerCase();
        const doctorName = `${c.doctor?.user?.firstname || ''} ${c.doctor?.user?.lastname || ''}`.toLowerCase();
        return patientName.includes(term) || doctorName.includes(term);
      });
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((c) => new Date(c.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((c) => new Date(c.createdAt) <= to);
    }

    return result;
  }, [consultations, statusFilter, searchTerm, dateFrom, dateTo]);

  const totalPages = Math.ceil(total / limit);
  const hasActiveFilters = statusFilter || searchTerm || dateFrom || dateTo;

  const clearFilters = () => {
    setStatusFilter('');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 shimmer rounded-xl" />
          <div className="space-y-2">
            <div className="w-48 h-6 shimmer" />
            <div className="w-64 h-4 shimmer" />
          </div>
        </div>
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="flex-1 min-w-[200px] h-10 shimmer rounded-xl" />
          <div className="w-44 h-10 shimmer rounded-xl" />
          <div className="w-40 h-10 shimmer rounded-xl" />
          <div className="w-40 h-10 shimmer rounded-xl" />
        </div>
        <div className="card overflow-hidden">
          <div className="p-4 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-20 h-4 shimmer" />
                <div className="w-36 h-4 shimmer" />
                <div className="w-36 h-4 shimmer" />
                <div className="w-24 h-5 shimmer rounded-full" />
                <div className="w-20 h-4 shimmer" />
                <div className="w-28 h-4 shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-blue-500 rounded-xl flex items-center justify-center shadow-soft">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultations</h1>
          <p className="text-sm text-gray-500">View and manage all platform consultations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap items-end">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search patient or doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 input-focus"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 input-focus"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 input-focus"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 input-focus"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn-secondary px-3 py-2 flex items-center gap-1 text-sm"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Consultations Table */}
      <div className="card overflow-hidden animate-slide-in-up">
        <table className="w-full">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visit Method</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredConsultations.map((consultation: Consultation) => (
              <tr key={consultation.id} className="table-row-hover">
                <td className="px-4 py-3 text-sm">
                  <Link
                    to={`/consultation/${consultation.id}`}
                    className="font-mono text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    {consultation.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {consultation.patient
                    ? `${consultation.patient.firstname} ${consultation.patient.lastname}`
                    : 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {consultation.doctor?.user
                    ? `${consultation.doctor.user.firstname} ${consultation.doctor.user.lastname}`
                    : 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`badge ${getStatusBadgeClass(consultation.status)}`}>
                    {formatStatus(consultation.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {consultation.visitMethod
                    ? formatVisitMethod(consultation.visitMethod)
                    : '--'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(consultation.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredConsultations.length === 0 && (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No consultations found</p>
            <p className="text-sm text-gray-400 mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'No consultations have been created yet'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            {hasActiveFilters
              ? `Showing ${filteredConsultations.length} filtered result${filteredConsultations.length !== 1 ? 's' : ''} (page ${page} of ${totalPages})`
              : `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, total)} of ${total}`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
