import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { chatApi } from '../../api';
import { queryClient } from '../../lib/queryClient';
import { getErrorMessage } from '../../lib/api/error.utils';
import type { Consultation, NurseAssignment, NurseChatConsultation, User } from '../../lib/types/api';

type ChatActionConsultation = Pick<
  Consultation | NurseChatConsultation,
  'id' | 'status' | 'visitMethod'
> & {
  patientId?: string;
  doctorId?: number;
  doctor?: { id?: number; userId?: string };
  chat?: { id?: string | null } | null;
};

export interface ConsultationChatAction {
  canOpen: boolean;
  label: string;
}

export function getConsultationChatAction(
  consultation: ChatActionConsultation | null | undefined,
  user: User | null | undefined,
  nurseAssignments: NurseAssignment[] = [],
): ConsultationChatAction {
  if (!consultation || !user || consultation.visitMethod !== 'CHAT') {
    return { canOpen: false, label: '' };
  }

  const hasExistingChat = Boolean(consultation.chat?.id);
  const status = consultation.status;
  if (status === 'CREATED' || status === 'PENDING_DOCTOR_REVIEW') {
    return { canOpen: false, label: '' };
  }
  if ((status === 'CANCELLED' || status === 'COMPLETED') && !hasExistingChat) {
    return { canOpen: false, label: '' };
  }

  if (user.role === 'DOCTOR') {
    return { canOpen: true, label: hasExistingChat ? 'Open Chat' : 'Start Chat' };
  }

  if (user.role === 'PATIENT' && (!consultation.patientId || consultation.patientId === user.id)) {
    return { canOpen: true, label: hasExistingChat ? 'Open Chat' : 'Start Chat' };
  }

  if (user.role === 'NURSE') {
    const doctorId = consultation.doctorId ?? consultation.doctor?.id;
    const permitted = nurseAssignments.some(
      (a) =>
        a.isActive &&
        (doctorId === undefined || a.doctorId === doctorId) &&
        a.permissions.includes('CHAT_WITH_PATIENTS'),
    );
    if (permitted) {
      return { canOpen: true, label: 'Chat as Doctor' };
    }
  }

  return { canOpen: false, label: '' };
}

export function useOpenConsultationChat() {
  const navigate = useNavigate();
  const [openingId, setOpeningId] = useState<string | null>(null);

  const openChat = useCallback(async (consultationId: string) => {
    setOpeningId(consultationId);
    try {
      const chat = await chatApi.openConsultationChat(consultationId);
      void queryClient.invalidateQueries({ queryKey: ['consultations'] });
      void queryClient.invalidateQueries({ queryKey: ['doctor-consultations'] });
      void queryClient.invalidateQueries({ queryKey: ['nurse-consultations'] });
      void queryClient.invalidateQueries({ queryKey: ['nurse-chat-consultations'] });
      navigate(`/chat/${chat.id}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to open consultation chat'));
    } finally {
      setOpeningId(null);
    }
  }, [navigate]);

  return { openingId, openChat };
}
