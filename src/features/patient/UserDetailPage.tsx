import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../api';
import { resolveFileUrl } from '../../lib/api/client';
import { Loader2, User, Calendar } from 'lucide-react';

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => {
      if (!id) {
        throw new Error('User ID is required');
      }
      return userApi.getUserById(id);
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h2>
          <p className="text-gray-600">The user you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const roleLabel = user.isSuperAdmin
    ? 'SUPERADMIN'
    : user.isAdmin
      ? 'ADMIN'
      : user.role;

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      PATIENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      DOCTOR: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      NURSE: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
      ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
      SUPERADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    };
    return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-purple-600 px-8 py-12 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-4xl flex-shrink-0 overflow-hidden">
              {user.avatar ? (
                <img src={resolveFileUrl(user.avatar)} alt={user.firstname} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{user.firstname?.[0]}{user.lastname?.[0]}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {user.firstname} {user.lastname}
              </h1>
              {user.email && <p className="text-white/80 mt-1">{user.email}</p>}
              <div className="mt-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(roleLabel)}`}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 dark:text-slate-400 mt-1" />
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Role</p>
                <p className="font-medium text-gray-900 dark:text-white">{roleLabel}</p>
              </div>
            </div>

            {user.createdAt && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 dark:text-slate-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Member Since</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
