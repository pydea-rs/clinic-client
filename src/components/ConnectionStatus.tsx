import React from 'react';
import { Wifi, WifiOff, RotateCw } from 'lucide-react';
import { ConnectionStatus as ConnectionStatusType } from '../types/chat';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  onRetry?: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, onRetry }) => {
  if (status.connected) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-full text-sm animate-fade-in hover-lift">
        <Wifi className="w-4 h-4 animate-pulse-slow" />
        Connected
      </div>
    );
  }

  if (status.reconnecting) {
    return (
      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-full text-sm animate-slide-in-down">
        <RotateCw className="w-4 h-4 animate-spin" />
        Reconnecting...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-full text-sm animate-slide-in-down hover-lift">
      <WifiOff className="w-4 h-4 animate-bounce-slow" />
      <span>Disconnected</span>
      {status.error && onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded-full text-xs transition-all-smooth btn-press hover-lift"
        >
          Retry
        </button>
      )}
    </div>
  );
};