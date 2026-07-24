import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { schedulingApi } from '../../api/scheduling.api';
import { AppointmentStatus } from '../../lib/types/api';
import { formatStatus, formatVisitMethod } from '../../lib/format';
import { Calendar, Loader2, ChevronRight, Filter, Clock, Timer } from 'lucide-react';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NO_SHOW', label: 'No Show' },
];

const statusBadgeClass = (status: string): string => {
  switch (status) {
    case 'PENDING': return 'badge-yellow';
    case 'CONFIRMED': return 'badge-blue';
    case 'COMPLETED': return 'badge-green';
    case 'CANCELLED': return 'badge-red';
    case 'NO_SHOW': return 'badge-gray';
    default: return 'badge-gray';
  }
};

const visitMethodBadgeClass = (method: string): string => {
  switch (method) {
    case 'CHAT': return 'badge-blue';
    case 'VOICE_CALL': return 'badge-purple';
    case 'VIDEO_CALL': return 'badge-green';
    case 'ON_SITE': return 'badge-yellow';
    default: return 'badge-gray';
  }
};

export const DoctorAppointmentsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const limit = 10;

  const filters = {
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(dateFrom && { from: dateFrom }),
    ...(dateTo && { to: dateTo }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-appointments', page, limit, filters],
    queryFn: () => schedulingApi.getAppointments(page, limit, filters),
  });

  const filtered = data?.appointments || [];
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
        {/* Shimmer filters */}
        <div className="flex gap-4 mb-6">
          <div className="shimmer h-10 w-36 rounded-xl" />
          <div className="shimmer h-10 w-36 rounded-xl" />
          <div className="shimmer h-10 w-36 rounded-xl" />
        </div>
        {/* Shimmer cards */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-3">
                  <div className="shimmer h-5 w-48 rounded" />
                  <div className="shimmer h-4 w-64 rounded" />
                  <div className="shimmer h-3 w-36 rounded" />
                </div>
                <div className="shimmer h-6 w-20 rounded-full" />
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
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-brand-600 rounded-xl flex items-center justify-center shadow-soft">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Appointments</h1>
          <p className="text-sm text-gray-500">Manage your scheduled appointments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 animate-slide-in-up">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 text-sm input-focus"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 text-sm input-focus"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 text-sm input-focus"
            />
          </div>
          {(statusFilter !== 'ALL' || dateFrom || dateTo) && (
            <button
              onClick={() => { setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); setPage(1); }}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Appointments List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 animate-slide-in-up">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-gray-700 font-medium mb-1">No appointments found</p>
          <p className="text-sm text-gray-500">
            {statusFilter !== 'ALL' ? 'Try adjusting your filters.' : 'You have no appointments yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filtered.map((apt, index) => (
            <Link
              key={apt.id}
              to={`/appointments/${apt.id}`}
              className="block card-interactive p-5 animate-slide-in-up group"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {apt.patient
                        ? `${apt.patient.firstname} ${apt.patient.lastname}`
                        : 'Patient'}
                    </h3>
                    <span className={`badge ${statusBadgeClass(apt.status)}`}>
                      {formatStatus(apt.status)}
                    </span>
                    <span className={`badge ${visitMethodBadgeClass(apt.method)}`}>
                      {formatVisitMethod(apt.method)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(apt.dateTime).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5" />
                      {apt.durationMinutes} min
                    </span>
                  </div>
                  {apt.notes && (
                    <p className="text-sm text-gray-400 mt-1 truncate">{apt.notes}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 ml-3" />
              </div>
            </Link>
          ))}
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
