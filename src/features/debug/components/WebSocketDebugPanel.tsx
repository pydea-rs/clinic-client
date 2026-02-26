import React, { useState, useEffect } from 'react';
import { socketService, SocketConnectionStatus, SocketEventLog } from '../../../lib/socket/socket.service';

export const WebSocketDebugPanel: React.FC = () => {
  const [status, setStatus] = useState<SocketConnectionStatus>(socketService.getConnectionStatus());
  const [eventLogs, setEventLogs] = useState<SocketEventLog[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<'all' | 'emit' | 'receive'>('all');

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = socketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setEventLogs(socketService.getEventLogs());
    }, 500);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = () => {
    setEventLogs(socketService.getEventLogs());
  };

  const handleClearLogs = () => {
    socketService.clearEventLogs();
    setEventLogs([]);
  };

  const handleConnect = () => {
    socketService.connect();
  };

  const handleDisconnect = () => {
    socketService.disconnect();
  };

  const filteredLogs = eventLogs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const onlineUsers = socketService.getOnlineUsers();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">WebSocket Transport Debug</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">Connection Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">State</p>
            <p className={`font-medium ${
              status.connected ? 'text-green-600' : 
              status.reconnecting ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {status.connected ? '● Connected' : 
               status.reconnecting ? '● Reconnecting...' : 
               '● Disconnected'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Reconnect Attempts</p>
            <p className="font-medium">{status.reconnectAttempts}</p>
          </div>
          
          {status.lastError && (
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Last Error</p>
              <p className="font-medium text-red-600">{status.lastError}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {!status.connected ? (
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">Online Users ({onlineUsers.length})</h3>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map(userId => (
              <span key={userId} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                {userId.substring(0, 8)}...
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Event Logs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Event Logs ({filteredLogs.length})</h3>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">All Events</option>
              <option value="emit">Emitted</option>
              <option value="receive">Received</option>
            </select>
            <button
              onClick={handleClearLogs}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              Clear Logs
            </button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No events logged yet
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Event</th>
                    <th className="px-4 py-2 text-left">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.slice().reverse().map((log, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600">
                        {log.timestamp.toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          log.type === 'emit' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono">{log.event}</td>
                      <td className="px-4 py-2">
                        {log.data ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:underline">
                              View payload
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
