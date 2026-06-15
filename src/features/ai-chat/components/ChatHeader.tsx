import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Radio, RefreshCw, Plus, History } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { ConnectionStatus as ConnectionStatusType } from '../../../lib/types/chat';

interface ChatHeaderProps {
  connectionStatus: ConnectionStatusType;
  deliveryMode: 'sse' | 'poll';
  onRetry: () => void;
  onToggleDeliveryMode: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  connectionStatus,
  deliveryMode,
  onRetry,
  onToggleDeliveryMode,
}) => {
  const isSSE = deliveryMode === 'sse';
  return (
    <div className="bg-gradient-to-r from-white via-blue-50 to-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-lg">AI Assistant</h1>
          <p className="text-sm text-gray-500">Powered by AI-Clinic</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ConnectionStatus status={connectionStatus} onRetry={onRetry} />

        {/* Delivery-mode toggle */}
        <button
          onClick={onToggleDeliveryMode}
          title={isSSE ? 'Switch to Polling mode' : 'Switch to SSE mode'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shadow-sm ${
            isSSE
              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
        >
          {isSSE ? <Radio className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {isSSE ? 'SSE' : 'Poll'}
        </button>

        <Link
          to="/ai/new"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors shadow-sm"
          title="New conversation"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </Link>

        <Link
          to="/ai/history"
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors shadow-sm"
          title="Conversation history"
        >
          <History className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
