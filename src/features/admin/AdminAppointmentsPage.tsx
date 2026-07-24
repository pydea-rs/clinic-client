import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, X } from 'lucide-react';
import { schedulingApi } from '../../api/scheduling.api';
import { formatStatus, formatVisitMethod } from '../../lib/format';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const;

const statusBadgeClass: Record<string, string> = {
  PENDING: 'badge-yellow',
  CONFIRMED: 'badge-blue',
  COMPLETED: 'badge-green',
  CANCELLED: 'badge-red',
  NO_SHOW: 'badge-gray',
};

const visitMethodBadgeClass: Record<string, string> = {
  CHAT: 'badge-blue',
  VOICE_CALL: 'badge-purple',
  VIDEO_CALL: 'badge-green',
  ON_SITE: 'badge-yellow',
};

const LIMIT = 20;

export const AdminAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters = {
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(dateFrom && { from: dateFrom }),
    ...(dateTo && { to: dateTo }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-appointments', page, filters],
    queryFn: () => schedulingApi.getAppointments(page, LIMIT, filters),
    placeholderData: (prev) => prev,
  });

  const filteredAppointments = data?.appointments ?? [];
  const total = data?.total ?? 0;

  const totalPages = Math.ceil(total / LIMIT);

  const clearFilters = () => {
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter !== 'ALL' || dateFrom || dateTo;

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
        <div className="flex gap-4 mb-6">
          <div className="w-44 h-10 shimmer rounded-xl" />
          <div className="w-40 h-10 shimmer rounded-xl" />
          <div className="w-40 h-10 shimmer rounded-xl" />
        </div>
        <div className="card overflow-hidden">
          <div className="p-4 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-4 shimmer" />
                <div className="w-32 h-4 shimmer" />
                <div className="w-32 h-4 shimmer" />
                <div className="w-36 h-4 shimmer" />
                <div className="w-16 h-4 shimmer" />
                <div className="w-20 h-5 shimmer rounded-full" />
                <div className="w-20 h-5 shimmer rounded-full" />
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
        <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-soft">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500">View and manage all platform appointments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 input-focus"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All Statuses' : formatStatus(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-4 py-2 input-focus"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-4 py-2 input-focus"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn-secondary px-3 py-2 flex items-center gap-1.5 text-sm"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden animate-slide-in-up">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date / Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAppointments.map((appt) => (
                <tr
                  key={appt.id}
                  onClick={() => navigate(`/appointments/${appt.id}`)}
                  className="table-row-hover cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">#{appt.id}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {appt.patient
                      ? `${appt.patient.firstname} ${appt.patient.lastname}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {appt.doctor?.user
                      ? `${appt.doctor.user.firstname} ${appt.doctor.user.lastname}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(appt.dateTime).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    <span className="text-gray-400">
                      {new Date(appt.dateTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{appt.durationMinutes} min</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`badge ${statusBadgeClass[appt.status] || 'badge-gray'}`}>
                      {formatStatus(appt.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`badge ${visitMethodBadgeClass[appt.method] || 'badge-gray'}`}
                    >
                      {formatVisitMethod(appt.method)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredAppointments.length === 0 && (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No appointments found</p>
            <p className="text-gray-400 text-sm mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'There are no appointments on the platform yet'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            {hasActiveFilters
              ? `Showing ${filteredAppointments.length} filtered result${filteredAppointments.length !== 1 ? 's' : ''} (page ${page} of ${totalPages})`
              : `Showing ${(page - 1) * LIMIT + 1} to ${Math.min(page * LIMIT, total)} of ${total}`}
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
