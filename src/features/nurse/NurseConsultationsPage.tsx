import React, { useState } from 'react';
import { ClipboardList, Loader2, Eye, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { consultationApi } from '../../api/consultation.api';
import { useNurseAssignments } from './useNurseAssignments';
import { formatStatus, formatEnum } from '../../lib/format';
import { Link } from 'react-router-dom';
import { Consultation } from '../../lib/types/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'CREATED', label: 'Created' },
  { value: 'PENDING_DOCTOR_REVIEW', label: 'Pending Review' },
  { value: 'DOCTOR_DECIDED', label: 'Doctor Decided' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const NurseConsultationsPage: React.FC = () => {
  const { assignments, isLoading: assignLoading } = useNurseAssignments();
  const hasPermission = assignments.some((a) => a.permissions.includes('VIEW_CONSULTATION_NOTES'));
  const [statusFilter, setStatusFilter] = useState('');

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

  const allConsultations = data?.consultations || [];
  const consultations = statusFilter
    ? allConsultations.filter((c: Consultation) => c.status === statusFilter)
    : allConsultations;

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-soft">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Consultations</h1>
            <span className="text-sm text-gray-400">(read-only)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input py-1.5 px-3 text-sm w-44"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {consultations.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {statusFilter ? 'No consultations match the selected filter.' : 'No consultations found.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Doctor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Mode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {consultations.map((c: Consultation) => (
                <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.patient?.firstname || 'Patient'} {c.patient?.lastname || ''}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.doctor?.user
                      ? `Dr. ${c.doctor.user.firstname} ${c.doctor.user.lastname}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.doctorDecision ? formatEnum(c.doctorDecision) : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${
                      c.status === 'COMPLETED' ? 'badge-green' :
                      c.status === 'IN_PROGRESS' ? 'badge-blue' :
                      c.status === 'CANCELLED' ? 'badge-red' : 'badge-yellow'
                    }`}>
                      {formatStatus(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/consultation/${c.id}`}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors inline-flex"
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
