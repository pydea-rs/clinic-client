import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { AuthUser } from '../lib/types/api';

interface GuardProps {
  children: React.ReactNode;
  requiredRole?: AuthUser['role'] | 'ADMIN' | 'SUPERADMIN';
}

export function AuthGuard({ children, requiredRole }: GuardProps): React.ReactNode {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const location = useLocation();

  if (isInitializing) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requiredRole) {
    return <RoleGuard requiredRole={requiredRole}>{children}</RoleGuard>;
  }

  return <>{children}</>;
}

export function RoleGuard({ children, requiredRole }: GuardProps): React.ReactNode {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  const hasRole = checkRole(user, requiredRole);
  
  if (!hasRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function checkRole(user: AuthUser, requiredRole?: string): boolean {
  if (!requiredRole) return true;

  if (requiredRole === 'ADMIN') {
    return user.isAdmin || user.isSuperAdmin;
  }

  if (requiredRole === 'SUPERADMIN') {
    return user.isSuperAdmin;
  }

  return user.role === requiredRole;
}
