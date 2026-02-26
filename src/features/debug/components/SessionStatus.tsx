import React from 'react';
import { useAuthStore } from '../../../lib/stores/auth.store';
import { User, Shield, Key, LogOut } from 'lucide-react';

export const SessionStatus: React.FC = () => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Key className="w-5 h-5" />
          <span>Not authenticated</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium">{user.firstname} {user.lastname}</div>
            <div className="text-sm text-gray-500">
              {user.email} • ID: {user.id.substring(0, 8)}...
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm">
            <Shield className={`w-4 h-4 ${user.isAdmin ? 'text-yellow-500' : 'text-gray-400'}`} />
            <span>{user.isAdmin ? (user.isSuperAdmin ? 'Superadmin' : 'Admin') : user.role}</span>
          </div>
          <button
            onClick={clearAuth}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
