import React from 'react';
import { Loader2, Home, Shield, Stethoscope, CheckCircle, Lock, Calendar, ClipboardList, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { nurseApi, NurseDashboardData } from '../../api';
import { formatSpecialty } from '../../lib/format';
import { NursePermission } from '../../lib/types/api';
import { Link } from 'react-router-dom';
import { UserAvatar } from '../../components/UserAvatar';

const PERMISSION_META: Record<NursePermission, { label: string; path: string }> = {
  VIEW_PATIENTS: { label: 'View Patients', path: '/nurse/dashboard' },
  CHAT_WITH_PATIENTS: { label: 'Patient Chat', path: '/nurse/chat' },
  MANAGE_APPOINTMENTS: { label: 'Appointments', path: '/nurse/appointments' },
  VIEW_CONSULTATION_NOTES: { label: 'Consultations', path: '/nurse/consultations' },
  VIEW_SOAPS: { label: 'SOAP Notes', path: '/nurse/soaps' },
  MANAGE_SCHEDULE: { label: 'Schedule', path: '/nurse/schedule' },
};

export const NurseDashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery<NurseDashboardData>({
    queryKey: ['nurse-dashboard'],
    queryFn: () => nurseApi.getDashboard(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const assignments = data?.assignments || [];
  const stats = data?.stats;

  if (assignments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6 animate-fade-in">
        <div className="card p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center animate-float">
            <Shield className="w-8 h-8 text-gray-400 dark:text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Active Assignments</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            You don't have any active doctor assignments yet. A doctor needs to assign you as their nurse before you can access patient data. Check Invitations if a request is waiting.
          </p>
          <Link to="/nurse/invitations" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 mt-5 text-sm">
            Check Invitations
          </Link>
        </div>
      </div>
    );
  }

  const allPerms = [...new Set(assignments.flatMap((a) => a.permissions))];

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-8 animate-slide-in-up">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-soft">
          <Home className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold gradient-text">Nurse Dashboard</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3 mb-8 stagger-children">
          <div className="card card-hover p-5 animate-slide-in-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="counter-value text-2xl font-bold text-gray-900 dark:text-white">{stats.assignedDoctors}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Assigned Doctors</p>
              </div>
            </div>
          </div>
          <div className="card card-hover p-5 animate-slide-in-up" style={{ animationDelay: '30ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="counter-value text-2xl font-bold text-gray-900 dark:text-white">{stats.upcomingAppointments}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Upcoming Appointments</p>
              </div>
            </div>
          </div>
          <div className="card card-hover p-5 animate-slide-in-up" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="counter-value text-2xl font-bold text-gray-900 dark:text-white">{stats.activeConsultations}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Active Consultations</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Doctors */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Assigned Doctors</h2>
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {assignments.map((a) => {
          const doc = a.doctor;
          const docUser = doc?.user;
          return (
            <div key={a.id} className="card card-hover p-5 animate-slide-in-up">
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatar={docUser?.avatar}
                  firstname={docUser?.firstname}
                  lastname={docUser?.lastname}
                  alt={docUser ? `Dr. ${docUser.firstname} ${docUser.lastname}` : 'Doctor avatar'}
                  fallback={<Stethoscope className="w-6 h-6 text-brand-600" />}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 flex-shrink-0"
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Dr. {docUser?.firstname} {docUser?.lastname}
                  </h3>
                  {doc?.specialty && (
                    <p className="text-sm text-gray-500 dark:text-slate-400">{formatSpecialty(doc.specialty)}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.permissions.map((p) => (
                  <span key={p} className="badge badge-green text-xs">
                    {PERMISSION_META[p]?.label || p}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Quick Actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(PERMISSION_META) as NursePermission[]).map((perm) => {
          const granted = allPerms.includes(perm);
          const meta = PERMISSION_META[perm];
          if (perm === 'VIEW_PATIENTS') return null;
          return (
            <Link
              key={perm}
              to={granted ? meta.path : '#'}
              className={`card p-4 flex items-center gap-3 transition-all duration-200 ${
                granted
                  ? 'card-hover cursor-pointer'
                  : 'opacity-50 cursor-not-allowed pointer-events-none'
              }`}
            >
              {granted ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <Lock className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <span className={`text-sm font-medium block ${granted ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
                  {meta.label}
                </span>
                {!granted && (
                  <span className="text-[11px] text-gray-400 dark:text-slate-500 block truncate">
                    Ask an assigned doctor to grant access
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
