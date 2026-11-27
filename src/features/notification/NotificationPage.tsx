import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi, notificationApi } from '../../api';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Bell, BellRing, CheckCheck, MessageSquare, Calendar, FileText,
  Star, Shield, UserCheck, CreditCard, AlertCircle, Info, UserPlus, Users, X, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Notification, NotificationType } from '../../lib/types/api';
import { formatStatus, formatVisitMethod, formatVisitType } from '../../lib/format';
import { getMessageDirection } from '../../lib/text-direction';
import { useOpenConsultationChat } from '../consultation/useConsultationChat';

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  CONSULTATION_REQUEST: { icon: UserCheck, color: 'text-blue-600 bg-blue-100' },
  DOCTOR_DECISION: { icon: UserCheck, color: 'text-indigo-600 bg-indigo-100' },
  PAYMENT_CONFIRMED: { icon: CreditCard, color: 'text-green-600 bg-green-100' },
  APPOINTMENT_REMINDER: { icon: Calendar, color: 'text-amber-600 bg-amber-100' },
  APPOINTMENT_CANCELLED: { icon: Calendar, color: 'text-red-600 bg-red-100' },
  NEW_CHAT_MESSAGE: { icon: MessageSquare, color: 'text-sky-600 bg-sky-100' },
  NEW_REVIEW: { icon: Star, color: 'text-yellow-600 bg-yellow-100' },
  DOCTOR_VERIFIED: { icon: Shield, color: 'text-emerald-600 bg-emerald-100' },
  SOAP_READY: { icon: FileText, color: 'text-purple-600 bg-purple-100' },
  NURSE_INVITATION: { icon: UserPlus, color: 'text-indigo-600 bg-indigo-100' },
  NURSE_INVITATION_ANSWERED: { icon: Users, color: 'text-indigo-600 bg-indigo-100' },
  SYSTEM: { icon: Info, color: 'text-gray-600 bg-gray-100' },
};

// The server sends rejections as DOCTOR_VERIFIED with `data.approved` false.
const isDoctorRejection = (notification: Notification) =>
  notification.type === 'DOCTOR_VERIFIED' && notification.data?.approved === false;

const rejectionConfig = { icon: AlertCircle, color: 'text-red-600 bg-red-100' };

// Match-acceptance notifications only carry `{ consultationId }`; actual doctor decisions carry decision metadata.
const isConsultationDecisionNotification = (notification: Notification): boolean => {
  if (notification.type !== 'DOCTOR_DECISION') return false;
  const data = notification.data as Record<string, unknown> | undefined;
  return Boolean(
    data?.consultationId &&
    (data?.isConsultationDecision || data?.doctorDecision || data?.accepted !== undefined),
  );
};

function getNotificationLink(notification: Notification): string | null {
  const data = notification.data as Record<string, string | number> | undefined;
  const type = notification.type as NotificationType;

  if (type === 'CONSULTATION_REQUEST') {
    if (data?.consultationId) return `/consultation/${data.consultationId}`;
    if (data?.matchRequestId) return '/doctor/matching';
    return null;
  }
  if (type === 'DOCTOR_DECISION' || type === 'PAYMENT_CONFIRMED') {
    return data?.consultationId ? `/consultation/${data.consultationId}` : null;
  }
  if (type === 'NEW_CHAT_MESSAGE') {
    return data?.chatId ? `/chat/${data.chatId}` : null;
  }
  if (type === 'APPOINTMENT_REMINDER' || type === 'APPOINTMENT_CANCELLED') {
    return data?.appointmentId ? `/appointments/${data.appointmentId}` : '/appointments';
  }
  if (type === 'SOAP_READY') {
    return data?.conversationId ? `/ai/${data.conversationId}` : '/patient/soaps';
  }
  if (type === 'DOCTOR_VERIFIED') {
    return isDoctorRejection(notification) ? '/doctor/profile' : '/doctor/dashboard';
  }
  if (type === 'NEW_REVIEW') {
    return '/doctor/dashboard';
  }
  if (type === 'NURSE_INVITATION') {
    return '/invitations';
  }
  if (type === 'NURSE_INVITATION_ANSWERED') {
    return '/doctor/nurses';
  }
  return null;
}

const NotificationItem: React.FC<{
  notification: Notification;
  onRead: (id: number) => void;
  onClick: (notification: Notification) => void;
}> = ({ notification, onRead, onClick }) => {
  const config = isDoctorRejection(notification)
    ? rejectionConfig
    : typeConfig[notification.type] || typeConfig.SYSTEM;
  const Icon = config.icon;
  const timeAgo = getTimeAgo(notification.createdAt);

  return (
    <div
      onClick={() => onClick(notification)}
      className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
        notification.isRead ? 'bg-white' : 'bg-brand-50/50'
      } hover:bg-gray-50 border-b border-gray-100 last:border-b-0`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${notification.isRead ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <button
              onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
              className="text-xs text-brand-600 hover:text-brand-700 whitespace-nowrap flex-shrink-0"
            >
              Mark read
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.body}</p>
        <p className="text-[11px] text-gray-400 mt-1">{timeAgo}</p>
      </div>
      {!notification.isRead && (
        <div className="w-2 h-2 bg-brand-500 animate-breathe rounded-full flex-shrink-0 mt-2" />
      )}
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const NotificationPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openingId, openChat } = useOpenConsultationChat();
  const [page, setPage] = useState(1);
  const [selectedDecisionNotif, setSelectedDecisionNotif] = useState<Notification | null>(null);
  const limit = 20;

  const modalConsultationId = selectedDecisionNotif?.data?.consultationId as string | undefined;

  const { data: modalConsultation, isLoading: modalLoading } = useQuery({
    queryKey: ['consultation', modalConsultationId],
    queryFn: () => consultationApi.getConsultationById(modalConsultationId!),
    enabled: Boolean(modalConsultationId),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationApi.list({ skip: (page - 1) * limit, take: limit }),
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationApi.getUnreadCount,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Failed to mark notification as read');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: (result) => {
      toast.success(`Marked ${result?.count ?? 0} notifications as read`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Failed to mark all as read');
    },
  });

  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (isConsultationDecisionNotification(notification)) {
      setSelectedDecisionNotif(notification);
      return;
    }
    const link = getNotificationLink(notification);
    if (link) navigate(link);
  };

  const notifData = (selectedDecisionNotif?.data || {}) as {
    consultationId?: string;
    doctorName?: string;
    doctorDecision?: string;
    visitMethod?: string | null;
    diagnosis?: string | null;
    suggestions?: string | null;
    notes?: string | null;
  };
  const modalDecision = modalConsultation?.doctorDecision || notifData.doctorDecision;
  const modalMethod = modalConsultation?.visitMethod ?? notifData.visitMethod;
  const modalDiagnosis = modalConsultation?.diagnosis ?? notifData.diagnosis;
  const modalSuggestions = modalConsultation?.suggestions ?? notifData.suggestions;
  const modalNotes = modalConsultation?.notes ?? notifData.notes;
  const modalDoctorName = modalConsultation?.doctor?.user
    ? `Dr. ${modalConsultation.doctor.user.firstname} ${modalConsultation.doctor.user.lastname}`
    : notifData.doctorName
      ? `Dr. ${notifData.doctorName}`
      : 'Your Doctor';
  const modalCanOpenChat =
    Boolean(modalConsultationId) &&
    modalMethod === 'CHAT' &&
    modalConsultation?.status !== 'CANCELLED';

  const notifications = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-blue-500 rounded-xl flex items-center justify-center shadow-soft">
            <BellRing className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {(unreadCount ?? 0) > 0 && (
            <span className="badge badge-blue">
              {unreadCount} unread
            </span>
          )}
        </div>
        {(unreadCount ?? 0) > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No Notifications</h3>
            <p className="text-gray-500 text-sm">You're all caught up!</p>
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={(id) => markReadMutation.mutate(id)}
              onClick={handleClick}
            />
          ))
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
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Doctor Decision Modal */}
      {selectedDecisionNotif && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="decision-modal-title"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setSelectedDecisionNotif(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-200/60 max-w-lg w-full p-6 space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="decision-modal-title" className="text-lg font-bold text-gray-900">
                    {selectedDecisionNotif.title}
                  </h2>
                  <p className="text-xs text-gray-500">{modalDoctorName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDecisionNotif(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-600">{selectedDecisionNotif.body}</p>

            {modalLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
              </div>
            ) : (
              <div className="space-y-3 bg-gray-50/80 border border-gray-100 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {modalDecision && (
                    <span className="badge badge-blue">
                      Decision: {formatVisitType(modalDecision)}
                    </span>
                  )}
                  {modalMethod && (
                    <span className="badge badge-purple">
                      Method: {formatVisitMethod(modalMethod)}
                    </span>
                  )}
                  {modalConsultation?.status && (
                    <span className="badge badge-gray">
                      {formatStatus(modalConsultation.status)}
                    </span>
                  )}
                </div>

                {modalDiagnosis && (
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 block mb-1">
                      Final Diagnosis
                    </span>
                    <p
                      dir={getMessageDirection(modalDiagnosis)}
                      className="text-sm text-gray-800 whitespace-pre-wrap"
                    >
                      {modalDiagnosis}
                    </p>
                  </div>
                )}

                {modalSuggestions && (
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 block mb-1">
                      Suggestions
                    </span>
                    <p
                      dir={getMessageDirection(modalSuggestions)}
                      className="text-sm text-gray-800 whitespace-pre-wrap"
                    >
                      {modalSuggestions}
                    </p>
                  </div>
                )}

                {modalNotes && (
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                      Doctor Notes
                    </span>
                    <p
                      dir={getMessageDirection(modalNotes)}
                      className="text-sm text-gray-700 whitespace-pre-wrap"
                    >
                      {modalNotes}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDecisionNotif(null)}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Close
              </button>
              {modalConsultationId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDecisionNotif(null);
                    navigate(`/consultation/${modalConsultationId}`);
                  }}
                  className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Consultation
                </button>
              )}
              {modalCanOpenChat && modalConsultationId && (
                <button
                  type="button"
                  onClick={async () => {
                    await openChat(modalConsultationId);
                    setSelectedDecisionNotif(null);
                  }}
                  disabled={openingId === modalConsultationId}
                  className="btn-success px-4 py-2 text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  {openingId === modalConsultationId ? 'Opening...' : 'Open Chat'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
