import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

interface GuardProps {
  children: React.ReactNode;
  requiredRole?: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'SUPERADMIN';
}

// Auth guard - requires authentication
export const AuthGuard: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, initializing } = useAuthStore();
  const location = useLocation();

  if (initializing) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Patient guard - requires PATIENT role
export const PatientGuard: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, initializing, user } = useAuthStore();
  const location = useLocation();

  if (initializing) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (user?.role !== 'PATIENT') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Doctor guard - requires DOCTOR role
export const DoctorGuard: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, initializing, user } = useAuthStore();
  const location = useLocation();

  if (initializing) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (user?.role !== 'DOCTOR') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Admin guard - requires ADMIN or SUPERADMIN role
export const AdminGuard: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, initializing, user } = useAuthStore();
  const location = useLocation();

  if (initializing) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Superadmin guard - requires SUPERADMIN role
export const SuperAdminGuard: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, initializing, user } = useAuthStore();
  const location = useLocation();

  if (initializing) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!user?.isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
