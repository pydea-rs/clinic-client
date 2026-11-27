import React from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../../api';
import { useNurseAssignments } from './useNurseAssignments';
import { useAuthStore } from '../../lib/stores/auth.store';
import { ChatListPage } from '../chat/ChatListPage';
import { UserAvatar } from '../../components/UserAvatar';
import { formatStatus, formatVisitType } from '../../lib/format';
import { useOpenConsultationChat } from '../consultation/useConsultationChat';

export const NurseChatPage: React.FC = () => {
  const { user } = useAuthStore();
  const { assignments, isLoading } = useNurseAssignments();
  const { openingId, openChat } = useOpenConsultationChat();
  const hasPermission = assignments.some((a) => a.permissions.includes('CHAT_WITH_PATIENTS'));

  const { data: chatConsultations = [] } = useQuery({
    queryKey: ['nurse-chat-consultations'],
    queryFn: () => chatApi.getNurseConsultations(),
    enabled: user?.role === 'NURSE' && hasPermission,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">No Permission</h2>
          <p className="text-sm text-gray-500 mt-1">You don't have the Chat with Patients permission.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chatConsultations.length > 0 && (
        <div className="px-6 pt-6 max-w-5xl mx-auto animate-fade-in">
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-gray-900">Active Consultation Chats</h2>
                <p className="text-xs text-gray-500">
                  Join shared patient consultations on behalf of your assigned doctor(s).
                </p>
              </div>
              <span className="badge badge-blue">{chatConsultations.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {chatConsultations.map((c) => {
                const patientName = `${c.patient.firstname} ${c.patient.lastname}`;
                const doctorName = `Dr. ${c.doctor.user.firstname} ${c.doctor.user.lastname}`;
                return (
                  <div
                    key={c.id}
                    className="py-3 first:pt-1 last:pb-1 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        avatar={c.patient.avatar}
                        firstname={c.patient.firstname}
                        lastname={c.patient.lastname}
                        alt={patientName}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 text-white text-xs font-bold flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{patientName}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>Assigned to {doctorName}</span>
                          {c.doctorDecision && (
                            <span className="badge badge-gray">{formatVisitType(c.doctorDecision)}</span>
                          )}
                          <span className="badge badge-blue">{formatStatus(c.status)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openChat(c.id)}
                      disabled={openingId === c.id}
                      className="btn-success px-3.5 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {openingId === c.id ? 'Opening...' : 'Chat as Doctor'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <ChatListPage />
    </div>
  );
};
