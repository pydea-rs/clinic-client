import React from 'react';
import { useDiagnosticsStore } from '../../../lib/stores/diagnostics.store';
import { Wifi, WifiOff, Activity, Clock } from 'lucide-react';

export const TransportHealth: React.FC = () => {
  const { sseStatus, wsStatus, lastSseEvent, lastWsEvent } = useDiagnosticsStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-500 bg-green-100';
      case 'disconnected':
        return 'text-red-500 bg-red-100';
      case 'reconnecting':
        return 'text-yellow-500 bg-yellow-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-5 h-5" />;
      case 'disconnected':
        return <WifiOff className="w-5 h-5" />;
      case 'reconnecting':
        return <Activity className="w-5 h-5 animate-pulse" />;
      default:
        return <WifiOff className="w-5 h-5" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* SSE Status */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(sseStatus)}
            <span className="font-medium">SSE (AI Chat)</span>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(sseStatus)}`}>
            {sseStatus.toUpperCase()}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {lastSseEvent ? (
            <div className="flex items-center gap-2 mt-2">
              <Clock className="w-4 h-4" />
              <span>Last event: {lastSseEvent}</span>
            </div>
          ) : (
            <span className="text-gray-400">No events yet</span>
          )}
        </div>
      </div>

      {/* WS Status */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(wsStatus)}
            <span className="font-medium">WebSocket (Chat)</span>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(wsStatus)}`}>
            {wsStatus.toUpperCase()}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {lastWsEvent ? (
            <div className="flex items-center gap-2 mt-2">
              <Clock className="w-4 h-4" />
              <span>Last event: {lastWsEvent}</span>
            </div>
          ) : (
            <span className="text-gray-400">No events yet</span>
          )}
        </div>
      </div>
    </div>
  );
};
