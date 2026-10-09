import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, Loader2, Mail, X } from 'lucide-react';
import { authApi, nurseApi } from '../../api';
import { useAuthStore } from '../../lib/stores/auth.store';
import { getErrorMessage } from '../../lib/api/error.utils';
import { formatEnum } from '../../lib/format';
import type { NurseAssignment } from '../../lib/types/api';
import { NURSE_INVITATIONS_QUERY_KEY } from './nurse-invitations';

const doctorName = (invitation: NurseAssignment) => {
  const user = invitation.doctor?.user;
  return user ? `Dr. ${user.firstname} ${user.lastname}` : 'A doctor';
};

export const NurseInvitationsPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: NURSE_INVITATIONS_QUERY_KEY,
    queryFn: () => nurseApi.getInvitations(),
  });

  const acceptMutation = useMutation({
    mutationFn: (invitation: NurseAssignment) => nurseApi.acceptInvitation(invitation.id),
    onSuccess: async (_result, invitation) => {
      toast.success(`You joined ${doctorName(invitation)}'s team`);
      // Accepting may have made this account a nurse; the guards and sidebar follow the user's role.
      setUser(await authApi.me());
      queryClient.invalidateQueries();
      navigate('/nurse/dashboard');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to accept the invitation'));
      queryClient.invalidateQueries({ queryKey: NURSE_INVITATIONS_QUERY_KEY });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (invitation: NurseAssignment) => nurseApi.declineInvitation(invitation.id),
    onSuccess: () => {
      toast.success('Invitation declined');
      queryClient.invalidateQueries({ queryKey: NURSE_INVITATIONS_QUERY_KEY });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to decline the invitation'));
      queryClient.invalidateQueries({ queryKey: NURSE_INVITATIONS_QUERY_KEY });
    },
  });

  const accept = (invitation: NurseAssignment) => {
    if (
      user?.role !== 'NURSE' &&
      !window.confirm(
        `Accepting turns your account into a nurse account on ${doctorName(invitation)}'s team. ` +
          'You will no longer use it as a patient. Continue?',
      )
    ) {
      return;
    }
    acceptMutation.mutate(invitation);
  };

  const busy = acceptMutation.isPending || declineMutation.isPending;

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-soft">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Nurse Invitations</h1>
          <p className="text-sm text-gray-500">Doctors who invited you to join their team</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-700 font-medium mb-1">No pending invitations</p>
          <p className="text-sm text-gray-500">When a doctor invites you to their team, it shows up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="card p-5" data-testid={`invitation-${invitation.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{doctorName(invitation)}</h3>
                  {invitation.doctor?.specialty && (
                    <p className="text-sm text-gray-500">{formatEnum(invitation.doctor.specialty)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => declineMutation.mutate(invitation)}
                    disabled={busy}
                    className="btn-secondary px-3 py-1.5 text-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </button>
                  <button
                    onClick={() => accept(invitation)}
                    disabled={busy}
                    className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Permissions offered</p>
                <div className="flex flex-wrap gap-2">
                  {invitation.permissions.length === 0 ? (
                    <span className="text-sm text-gray-400">None yet</span>
                  ) : (
                    invitation.permissions.map((permission) => (
                      <span key={permission} className="badge badge-brand">
                        {formatEnum(permission)}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
