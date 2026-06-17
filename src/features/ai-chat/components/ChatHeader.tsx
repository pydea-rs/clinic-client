import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Plus, History, RotateCw } from 'lucide-react';
import { ConnectionStatus as ConnectionStatusType } from '../../../lib/types/chat';

interface ChatHeaderProps {
  connectionStatus: ConnectionStatusType;
  onRetry: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  connectionStatus,
  onRetry,
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="leading-tight">
          <h1 className="font-semibold text-gray-900 text-sm">AI Health Assistant</h1>
          <div className="flex items-center gap-1.5">
            {connectionStatus.connected ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-gray-400">Online</span>
              </>
            ) : connectionStatus.reconnecting ? (
              <>
                <RotateCw className="w-3 h-3 text-amber-500 animate-spin" />
                <span className="text-[11px] text-amber-600">Reconnecting</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <button onClick={onRetry} className="text-[11px] text-red-500 hover:underline">
                  Disconnected — retry
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <Link
          to="/ai/new"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="New conversation"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </Link>
        <Link
          to="/ai/history"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Conversation history"
        >
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">History</span>
        </Link>
      </div>
    </div>
  );
};
