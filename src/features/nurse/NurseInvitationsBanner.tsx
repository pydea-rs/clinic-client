import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { nurseApi } from '../../api';
import { useAuthStore } from '../../lib/stores/auth.store';
import { NURSE_INVITATIONS_QUERY_KEY } from './nurse-invitations';

// Doctors and admins can't be invited, so they never fetch invitations.
const INVITABLE_ROLES = ['PATIENT', 'NONE', 'NURSE'];

export const NurseInvitationsBanner: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const invitable =
    !!user && INVITABLE_ROLES.includes(user.role) && !user.isAdmin && !user.isSuperAdmin;

  const { data: invitations = [] } = useQuery({
    queryKey: NURSE_INVITATIONS_QUERY_KEY,
    queryFn: () => nurseApi.getInvitations(),
    enabled: invitable,
    staleTime: 60_000,
  });

  if (!invitable || invitations.length === 0 || location.pathname === '/invitations') {
    return null;
  }

  const count = invitations.length;
  return (
    <Link
      to="/invitations"
      className="flex items-center gap-2 px-6 py-3 bg-brand-50 text-brand-800 text-sm font-medium hover:bg-brand-100 transition-colors"
    >
      <Mail className="w-4 h-4" />
      {count === 1
        ? 'A doctor invited you to join their team as a nurse.'
        : `${count} doctors invited you to join their team as a nurse.`}{' '}
      <span className="underline">Review</span>
    </Link>
  );
};
