import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nurseApi } from '../../api/nurse.api';
import { NurseAssignment, NursePermission } from '../../lib/types/api';
import { formatEnum } from '../../lib/format';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';
import { UserPlus, Users, Shield, Loader2, X, Search, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';

const ALL_PERMISSIONS: NursePermission[] = [
  'VIEW_PATIENTS',
  'CHAT_WITH_PATIENTS',
  'MANAGE_APPOINTMENTS',
  'VIEW_CONSULTATION_NOTES',
  'VIEW_SOAPS',
  'MANAGE_SCHEDULE',
];

const permissionDescription: Record<NursePermission, string> = {
  VIEW_PATIENTS: 'View patient lists and details',
  CHAT_WITH_PATIENTS: 'Send and receive patient messages',
  MANAGE_APPOINTMENTS: 'Create and manage appointments',
  VIEW_CONSULTATION_NOTES: 'Read consultation notes',
  VIEW_SOAPS: 'Access SOAP notes',
  MANAGE_SCHEDULE: 'Manage doctor schedule',
};

export const DoctorNurseManagementPage: React.FC = () => {
  const [nurseId, setNurseId] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<NursePermission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['nurse-assignments'],
    queryFn: () => nurseApi.getAssignments(),
  });

  const assignMutation = useMutation({
    mutationFn: () => nurseApi.assign(nurseId, selectedPermissions.length > 0 ? selectedPermissions : undefined),
    onSuccess: () => {
      toast.success('Nurse assigned successfully');
      setNurseId('');
      setSelectedPermissions([]);
      queryClient.invalidateQueries({ queryKey: ['nurse-assignments'] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to assign nurse'));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId: number) => nurseApi.remove(assignmentId),
    onSuccess: () => {
      toast.success('Nurse removed successfully');
      queryClient.invalidateQueries({ queryKey: ['nurse-assignments'] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to remove nurse'));
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ assignmentId, permissions }: { assignmentId: number; permissions: NursePermission[] }) =>
      nurseApi.updatePermissions(assignmentId, permissions),
    onSuccess: () => {
      toast.success('Permissions updated');
      queryClient.invalidateQueries({ queryKey: ['nurse-assignments'] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to update permissions'));
    },
  });

  const toggleNewPermission = (permission: NursePermission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const toggleExistingPermission = (assignment: NurseAssignment, permission: NursePermission) => {
    const currentPermissions = assignment.permissions || [];
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter((p) => p !== permission)
      : [...currentPermissions, permission];
    updatePermissionsMutation.mutate({ assignmentId: assignment.id, permissions: newPermissions });
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseId.trim()) {
      toast.error('Please enter a nurse user ID');
      return;
    }
    assignMutation.mutate();
  };

  // Filter assignments by search
  const filteredAssignments = (assignments || []).filter((a) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = a.nurse
      ? `${a.nurse.firstname} ${a.nurse.lastname}`.toLowerCase()
      : '';
    const email = (a.nurse?.email || '').toLowerCase();
    return name.includes(query) || email.includes(query) || a.nurseId.toLowerCase().includes(query);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-soft">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Nurse Management</h1>
          <p className="text-sm text-gray-500">Assign nurses and manage their permissions</p>
        </div>
      </div>

      {/* Assign Section */}
      <div className="card p-6 mb-8 animate-slide-in-up">
        <div className="flex items-center gap-2 mb-5">
          <UserPlus className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-bold text-gray-900">Assign a Nurse</h2>
        </div>

        <form onSubmit={handleAssign} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nurse User ID (UUID)</label>
            <input
              type="text"
              value={nurseId}
              onChange={(e) => setNurseId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-sm input-focus"
              placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-gray-400" />
                Permissions
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_PERMISSIONS.map((permission) => {
                const isSelected = selectedPermissions.includes(permission);
                return (
                  <button
                    key={permission}
                    type="button"
                    onClick={() => toggleNewPermission(permission)}
                    className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors duration-200 ${
                        isSelected ? 'bg-brand-600' : 'bg-gray-200'
                      }`}>
                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isSelected ? 'text-brand-900' : 'text-gray-700'}`}>
                          {formatEnum(permission)}
                        </p>
                        <p className="text-xs text-gray-400">{permissionDescription[permission]}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={!nurseId.trim() || assignMutation.isPending}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Assign Nurse
              </>
            )}
          </button>
        </form>
      </div>

      {/* Current Nurses */}
      <div className="animate-slide-in-up" style={{ animationDelay: '50ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            Assigned Nurses
          </h2>
          {(assignments || []).length > 0 && (
            <span className="badge badge-blue">{(assignments || []).length} total</span>
          )}
        </div>

        {/* Search */}
        {(assignments || []).length > 2 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nurses..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50/50 text-sm input-focus"
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-gray-700 font-medium mb-1">
              {searchQuery ? 'No nurses match your search' : 'No nurses assigned yet'}
            </p>
            <p className="text-sm text-gray-500">
              {searchQuery ? 'Try a different search term.' : 'Use the form above to assign a nurse.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((assignment, index) => {
              const nurseName = assignment.nurse
                ? `${assignment.nurse.firstname} ${assignment.nurse.lastname}`
                : 'Nurse';
              const nurseEmail = assignment.nurse?.email || assignment.nurseId;
              const initials = assignment.nurse
                ? `${assignment.nurse.firstname[0] || ''}${assignment.nurse.lastname[0] || ''}`.toUpperCase()
                : 'N';

              return (
                <div
                  key={assignment.id}
                  className="card p-5 animate-slide-in-up"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    {/* Nurse Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">{initials}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{nurseName}</h3>
                        <p className="text-sm text-gray-500">{nurseEmail}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <span className={`badge ${assignment.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {assignment.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove ${nurseName} from your team?`)) {
                            removeMutation.mutate(assignment.id);
                          }
                        }}
                        disabled={removeMutation.isPending}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50 hover:scale-105"
                        title="Remove nurse"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Permissions</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALL_PERMISSIONS.map((permission) => {
                        const hasPermission = (assignment.permissions || []).includes(permission);
                        return (
                          <button
                            key={permission}
                            onClick={() => toggleExistingPermission(assignment, permission)}
                            disabled={updatePermissionsMutation.isPending}
                            className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all duration-200 ${
                              hasPermission
                                ? 'bg-brand-50/70 text-brand-800'
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                            } disabled:opacity-50`}
                          >
                            {hasPermission ? (
                              <ToggleRight className="w-5 h-5 text-brand-600 flex-shrink-0" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-300 flex-shrink-0" />
                            )}
                            <span className="text-sm">{formatEnum(permission)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
