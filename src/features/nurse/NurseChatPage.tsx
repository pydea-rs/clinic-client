import React from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useNurseAssignments } from './useNurseAssignments';
import { ChatListPage } from '../chat/ChatListPage';

export const NurseChatPage: React.FC = () => {
  const { assignments, isLoading } = useNurseAssignments();
  const hasPermission = assignments.some((a) => a.permissions.includes('CHAT_WITH_PATIENTS'));

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

  return <ChatListPage />;
};
