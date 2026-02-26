import React from 'react';
import { Wifi, WifiOff, RotateCw } from 'lucide-react';
import { ConnectionStatus as ConnectionStatusType } from '../../../lib/types/chat';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  onRetry: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, onRetry }) => {
  if (status.connected) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <Wifi className="w-4 h-4" />
        <span className="text-sm font-medium">Connected</span>
      </div>
    );
  }

  if (status.reconnecting) {
    return (
      <div className="flex items-center gap-2 text-yellow-600">
        <RotateCw className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 text-red-600">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">Disconnected</span>
      </div>
      <button
        onClick={onRetry}
        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Retry
      </button>
    </div>
  );
};
