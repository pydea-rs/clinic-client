import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nurseApi, userApi } from '../../api';
import { NurseAssignment, NursePermission } from '../../lib/types/api';
import { formatEnum } from '../../lib/format';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';
import { UserPlus, Users, Shield, Loader2, X, Search, CheckCircle, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';

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

interface SearchResult {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  avatar?: string;
}

export const DoctorNurseManagementPage: React.FC = () => {
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<NursePermission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['nurse-assignments'],
    queryFn: () => nurseApi.getAssignments(),
  });

  const { data: searchResults = [] } = useQuery<SearchResult[]>({
    queryKey: ['user-search', userSearch],
    queryFn: () => userApi.searchUsers(userSearch),
    enabled: userSearch.trim().length >= 2,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const assignMutation = useMutation({
    mutationFn: () => nurseApi.assign(selectedUser!.id, selectedPermissions.length > 0 ? selectedPermissions : undefined),
    onSuccess: () => {
      toast.success('Nurse assigned successfully');
      setSelectedUser(null);
      setUserSearch('');
      setSelectedPermissions([]);
      setShowConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['nurse-assignments'] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to assign nurse'));
      setShowConfirm(false);
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
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }
    if (selectedUser.role !== 'NURSE') {
      setShowConfirm(true);
      return;
    }
    assignMutation.mutate();
  };

  const handleSelectUser = (user: SearchResult) => {
    setSelectedUser(user);
    setUserSearch('');
    setShowDropdown(false);
  };

  const revokeAllPermissions = (assignment: NurseAssignment) => {
    if (window.confirm(`Revoke all permissions for ${assignment.nurse?.firstname} ${assignment.nurse?.lastname}?`)) {
      updatePermissionsMutation.mutate({ assignmentId: assignment.id, permissions: [] });
    }
  };

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
            <label className="block text-sm font-medium text-gray-700 mb-2">Find User</label>
            {selectedUser ? (
              <div className="flex items-center gap-3 px-4 py-3 border border-brand-200 bg-brand-50/30 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">
                    {selectedUser.firstname[0]}{selectedUser.lastname[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{selectedUser.firstname} {selectedUser.lastname}</p>
                  <p className="text-xs text-gray-500">{selectedUser.email} &middot; {selectedUser.role || 'NONE'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <div ref={searchRef} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-sm input-focus"
                  placeholder="Search by name or email..."
                />
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-gray-600">
                            {u.firstname?.[0]}{u.lastname?.[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{u.firstname} {u.lastname}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{u.role || 'NONE'}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && userSearch.trim().length >= 2 && searchResults.length === 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-500">
                    No users found
                  </div>
                )}
              </div>
            )}
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
            disabled={!selectedUser || assignMutation.isPending}
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

      {/* Role Upgrade Confirmation Dialog */}
      {showConfirm && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-slide-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Role Change Required</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This will change <strong>{selectedUser.firstname} {selectedUser.lastname}</strong>'s
              role from <span className="badge badge-gray text-xs">{selectedUser.role || 'NONE'}</span> to{' '}
              <span className="badge badge-teal text-xs">NURSE</span> and assign them to you.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be automatically reversed. Continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => assignMutation.mutate()}
                disabled={assignMutation.isPending}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
              >
                {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm & Assign
              </button>
            </div>
          </div>
        </div>
      )}

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
                        onClick={() => revokeAllPermissions(assignment)}
                        disabled={updatePermissionsMutation.isPending || (assignment.permissions || []).length === 0}
                        className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200 disabled:opacity-30 font-medium"
                        title="Revoke all permissions"
                      >
                        Revoke All
                      </button>
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
