import React from 'react';
import { MessageCircle, LogOut } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { ConnectionStatus as ConnectionStatusType } from '../types/chat';

interface ChatHeaderProps {
  connectionStatus: ConnectionStatusType;
  onRetry: () => void;
  onLogout: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  connectionStatus, 
  onRetry, 
  onLogout 
}) => {
  return (
    <div className="bg-gradient-to-r from-white via-blue-50 to-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm backdrop-blur-sm animate-slide-in-down">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg hover-lift animate-float">
          <MessageCircle className="w-6 h-6 text-white animate-pulse-slow" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-lg">AI Assistant</h1>
          <p className="text-sm text-gray-500 font-medium">Powered by Ai-Clinic</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <ConnectionStatus status={connectionStatus} onRetry={onRetry} />
        <button
          onClick={onLogout}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all-smooth hover-lift btn-press shadow-sm"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};