import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import toast from 'react-hot-toast';
import { User } from '../../lib/types/api';
import { Users } from 'lucide-react';

type UserUpdatePayload = {
  firstname?: string;
  lastname?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
};

export const AdminUserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const skip = (page - 1) * limit;
        const data = await adminApi.users.list({
          skip,
          take: limit,
          role: roleFilter || undefined,
          search: searchTerm || undefined,
        });
        setUsers(data.data || []);
        setTotal(data.total || 0);
      } catch {
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [page, roleFilter, searchTerm]);

  const handleUpdateUser = async (id: string, payload: UserUpdatePayload) => {
    try {
      const updatedUser = await adminApi.users.update(id, payload);
      setUsers(users.map(u => u.id === id ? updatedUser : u));
      setEditingUser(null);
      toast.success('User updated successfully');
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDeactivateUser = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      const updatedUser = await adminApi.users.deactivate(id);
      setUsers(users.map(u => u.id === id ? updatedUser : u));
      toast.success('User deactivated successfully');
    } catch {
      toast.error('Failed to deactivate user');
    }
  };

  const handlePromote = async (id: string) => {
    if (!confirm('Are you sure you want to promote this user to admin?')) return;

    try {
      const updatedUser = await adminApi.adminActions.promote(id);
      setUsers(users.map(u => u.id === id ? updatedUser : u));
      toast.success('User promoted successfully');
    } catch {
      toast.error('Failed to promote user');
    }
  };

  const handleDemote = async (id: string) => {
    if (!confirm('Are you sure you want to demote this admin?')) return;

    try {
      const updatedUser = await adminApi.adminActions.demote(id);
      setUsers(users.map(u => u.id === id ? updatedUser : u));
      toast.success('User demoted successfully');
    } catch {
      toast.error('Failed to demote user');
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 shimmer rounded-xl" />
          <div className="space-y-2">
            <div className="w-44 h-6 shimmer" />
            <div className="w-56 h-4 shimmer" />
          </div>
        </div>
        <div className="flex gap-4 mb-6">
          <div className="flex-1 h-10 shimmer rounded-xl" />
          <div className="w-40 h-10 shimmer rounded-xl" />
        </div>
        <div className="card overflow-hidden">
          <div className="p-4 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-32 h-4 shimmer" />
                <div className="w-48 h-4 shimmer" />
                <div className="w-20 h-5 shimmer rounded-full" />
                <div className="w-16 h-5 shimmer rounded-full" />
                <div className="w-24 h-4 shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-blue-500 rounded-xl flex items-center justify-center shadow-soft">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">Manage all platform users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          className="flex-1 px-4 py-2 input-focus"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 input-focus"
        >
          <option value="">All Roles</option>
          <option value="NONE">Guest</option>
          <option value="PATIENT">Patient</option>
          <option value="DOCTOR">Doctor</option>
          <option value="NURSE">Nurse</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden animate-slide-in-up">
        <table className="w-full">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="table-row-hover">
                <td className="px-4 py-3 text-sm font-medium">
                  {user.firstname} {user.lastname}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`badge ${
                    user.isSuperAdmin
                      ? 'badge-purple'
                      : user.isAdmin
                        ? 'badge-yellow'
                        : user.role === 'NONE'
                          ? 'badge-gray'
                          : 'badge-blue'
                  }`}>
                    {user.isSuperAdmin ? 'Superadmin' : user.isAdmin ? 'Admin' : user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`badge ${
                    user.isActive ? 'badge-green' : 'badge-red'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="text-brand-600 hover:text-brand-700 mr-3 font-medium"
                  >
                    Edit
                  </button>
                  {user.isAdmin && !user.isSuperAdmin && (
                    <button
                      onClick={() => handleDemote(user.id)}
                      className="text-purple-600 hover:text-purple-800 mr-3 font-medium"
                    >
                      Demote
                    </button>
                  )}
                  {!user.isAdmin && (
                    <button
                      onClick={() => handlePromote(user.id)}
                      className="text-purple-600 hover:text-purple-800 mr-3 font-medium"
                    >
                      Promote
                    </button>
                  )}
                  <button
                    onClick={() => handleDeactivateUser(user.id)}
                    className={`font-medium ${user.isActive ? 'text-red-600 hover:text-red-800' : 'text-gray-400'}`}
                    disabled={!user.isActive}
                  >
                    {user.isActive ? 'Deactivate' : 'Active'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No users found matching your criteria
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleUpdateUser}
        />
      )}
    </div>
  );
};

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSave: (id: string, payload: UserUpdatePayload) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(user.id, formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card shadow-soft-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Edit User</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              type="text"
              value={formData.firstname}
              onChange={e => setFormData({ ...formData, firstname: e.target.value })}
              className="w-full px-3 py-2 input-focus"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              type="text"
              value={formData.lastname}
              onChange={e => setFormData({ ...formData, lastname: e.target.value })}
              className="w-full px-3 py-2 input-focus"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 input-focus"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 input-focus"
            >
              <option value="NONE">Guest</option>
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
              <option value="NURSE">Nurse</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium">Active</label>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 btn-primary"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
