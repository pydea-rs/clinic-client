import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/stores/auth.store';
import { useNurseAssignments } from './useNurseAssignments';
import { userApi } from '../../api';
import { Loader2, User, Shield, Stethoscope, CheckCircle, Lock, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';
import { formatSpecialty } from '../../lib/format';
import { NursePermission } from '../../lib/types/api';

const PERMISSION_LABELS: Record<NursePermission, string> = {
  VIEW_PATIENTS: 'View Patients',
  CHAT_WITH_PATIENTS: 'Chat with Patients',
  MANAGE_APPOINTMENTS: 'Manage Appointments',
  VIEW_CONSULTATION_NOTES: 'View Consultations',
  VIEW_SOAPS: 'View SOAP Notes',
  MANAGE_SCHEDULE: 'Manage Schedule',
};

export const NurseProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const { assignments, isLoading } = useNurseAssignments();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [firstname, setFirstname] = useState(user?.firstname || '');
  const [lastname, setLastname] = useState(user?.lastname || '');

  const updateMutation = useMutation({
    mutationFn: (data: { firstname: string; lastname: string }) =>
      userApi.updateProfile(data),
    onSuccess: (updated) => {
      setUser({ ...user!, ...updated });
      toast.success('Profile updated');
      setEditing(false);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Update failed')),
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => userApi.uploadAvatar(file),
    onSuccess: (updated) => {
      setUser({ ...user!, ...updated });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Avatar updated');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Upload failed')),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
  };

  const handleSave = () => {
    if (!firstname.trim() || !lastname.trim()) {
      toast.error('Name fields are required');
      return;
    }
    updateMutation.mutate({ firstname: firstname.trim(), lastname: lastname.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const userInitials = `${user?.firstname?.[0] || ''}${user?.lastname?.[0] || ''}`.toUpperCase();

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-soft">
          <User className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="card p-8 mb-6 animate-slide-in-up">
        <div className="flex items-start gap-6">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-50 flex items-center justify-center text-teal-700 text-2xl font-bold shadow-sm ring-2 ring-teal-200/50 overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Upload className="w-5 h-5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>

          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <input
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  className="w-full px-3 py-2 input-focus text-sm"
                  placeholder="First name"
                />
                <input
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  className="w-full px-3 py-2 input-focus text-sm"
                  placeholder="Last name"
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={updateMutation.isPending} className="btn-primary px-4 py-1.5 text-sm">
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-secondary px-4 py-1.5 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900">{user?.firstname} {user?.lastname}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge badge-teal text-xs">Nurse</span>
                </div>
                <button onClick={() => setEditing(true)} className="mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium">
                  Edit Profile
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Assigned Doctors */}
      <h2 className="text-lg font-bold text-gray-900 mb-3">Assigned Doctors</h2>
      {assignments.length === 0 ? (
        <div className="card p-8 text-center animate-slide-in-up">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No active assignments</p>
          <p className="text-sm text-gray-400 mt-1">A doctor needs to assign you as their nurse.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const doc = assignment.doctor;
            const docUser = doc?.user;
            return (
              <div key={assignment.id} className="card p-6 animate-slide-in-up">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-6 h-6 text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      Dr. {docUser?.firstname} {docUser?.lastname}
                    </h3>
                    {doc?.specialty && (
                      <p className="text-sm text-gray-500">{formatSpecialty(doc.specialty)}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Assigned {new Date(assignment.createdAt).toLocaleDateString()}
                    </p>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Permissions</p>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(PERMISSION_LABELS) as NursePermission[]).map((perm) => {
                          const granted = assignment.permissions.includes(perm);
                          return (
                            <div
                              key={perm}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                granted
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-gray-50 text-gray-400'
                              }`}
                            >
                              {granted ? <CheckCircle className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              {PERMISSION_LABELS[perm]}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
