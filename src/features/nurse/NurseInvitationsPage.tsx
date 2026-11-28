import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, Loader2, Mail, Stethoscope, X, Shield, Info } from 'lucide-react';
import { authApi, nurseApi } from '../../api';
import { useAuthStore } from '../../lib/stores/auth.store';
import { UserAvatar } from '../../components/UserAvatar';
import { getErrorMessage } from '../../lib/api/error.utils';
import { formatEnum } from '../../lib/format';
import type { NurseAssignment } from '../../lib/types/api';
import { NURSE_INVITATIONS_QUERY_KEY } from './nurse-invitations';
import { CollapsibleSection } from '../../components/InfoDisclosure';

const PERMISSION_EXPLANATIONS: Record<string, string> = {
  VIEW_PATIENTS: 'View patients associated with the inviting doctor.',
  CHAT_WITH_PATIENTS: 'Join and reply inside consultation chat rooms on behalf of the care team.',
  MANAGE_APPOINTMENTS: 'Help organize and monitor patient clinic appointments.',
  VIEW_CONSULTATION_NOTES: 'Read clinical notes and consultation status details.',
  VIEW_SOAPS: 'Read structured AI SOAP notes linked to patients.',
  MANAGE_SCHEDULE: 'Configure weekly availability windows and slot exceptions.',
};

const doctorName = (invitation: NurseAssignment) => {
  const user = invitation.doctor?.user;
  return user ? `Dr. ${user.firstname} ${user.lastname}` : 'A doctor';
};

export const NurseInvitationsPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canReceiveInvitations =
    Boolean(user) && user?.role !== 'DOCTOR' && !user?.isAdmin && !user?.isSuperAdmin;

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: NURSE_INVITATIONS_QUERY_KEY,
    queryFn: () => nurseApi.getInvitations(),
    enabled: canReceiveInvitations,
  });

  const acceptMutation = useMutation({
    mutationFn: (invitation: NurseAssignment) => nurseApi.acceptInvitation(invitation.id),
    onSuccess: async (_result, invitation) => {
      toast.success(`You joined ${doctorName(invitation)}'s team`);
      // Accepting may have made this account a nurse; the guards and sidebar follow the user's role.
      // The accept itself succeeded, so a failed reload must not surface as a failed accept.
      try {
        setUser(await authApi.me());
      } catch {
        toast.error('Reload the page to see your nurse dashboard');
        queryClient.invalidateQueries();
        return;
      }
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
          <p className="text-sm text-gray-500 dark:text-slate-400">Doctors who invited you to join their team</p>
        </div>
      </div>

      {user?.role !== 'NURSE' && invitations.length > 0 && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200 animate-slide-in-up">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Accepting an invitation switches your account role from <strong>Patient</strong> to <strong>Nurse</strong> on that doctor's care team. Declining leaves your current account unchanged.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : invitations.length === 0 ? (
        <div className="card text-center py-12 animate-scale-in">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center animate-float">
            <Mail className="w-7 h-7 text-gray-400 dark:text-slate-500" />
          </div>
          <p className="text-gray-700 dark:text-slate-200 font-medium mb-1">No pending invitations</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">When a doctor invites you to their team, it shows up here.</p>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="card card-hover p-5 animate-slide-in-up" data-testid={`invitation-${invitation.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    avatar={invitation.doctor?.user?.avatar}
                    firstname={invitation.doctor?.user?.firstname}
                    lastname={invitation.doctor?.user?.lastname}
                    alt={doctorName(invitation)}
                    fallback={<Stethoscope className="w-5 h-5 text-brand-600" />}
                    className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/50 dark:to-brand-800/30 flex-shrink-0"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{doctorName(invitation)}</h3>
                    {invitation.doctor?.specialty && (
                      <p className="text-sm text-gray-500 dark:text-slate-400">{formatEnum(invitation.doctor.specialty)}</p>
                    )}
                  </div>
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
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Permissions offered</p>
                <div className="flex flex-wrap gap-2">
                  {invitation.permissions.length === 0 ? (
                    <span className="text-sm text-gray-400 dark:text-slate-500">None yet</span>
                  ) : (
                    invitation.permissions.map((permission) => (
                      <span key={permission} className="badge badge-brand">
                        {formatEnum(permission)}
                      </span>
                    ))
                  )}
                </div>
              </div>
              {invitation.permissions.length > 0 && (
                <CollapsibleSection
                  title="What these permissions grant"
                  subtitle="Exact scope for your care team role"
                  icon={<Shield className="w-4 h-4" />}
                  className="mt-4"
                >
                  <ul className="space-y-1.5 list-disc list-inside">
                    {invitation.permissions.map((perm) => (
                      <li key={perm}>
                        <strong>{formatEnum(perm)}:</strong>{' '}
                        {PERMISSION_EXPLANATIONS[perm] || 'Care team access'}
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
