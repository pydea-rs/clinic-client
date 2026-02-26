import React, { useState } from 'react';
import { useDiagnosticsStore } from '../../../lib/stores/diagnostics.store';
import { Copy, Trash2, Download } from 'lucide-react';

interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  latency: number;
  requestPayload?: unknown;
  responsePayload?: unknown;
  rawEnvelope?: unknown;
}

export const ApiInspector: React.FC = () => {
  const { requestLogs, debugMode, setDebugMode } = useDiagnosticsStore();
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [viewMode, setViewMode] = useState<'contents' | 'envelope'>('contents');

  const formatJson = (data: unknown) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">API Request Inspector</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              className="rounded"
            />
            <span>Debug Mode</span>
          </label>
          <button
            onClick={() => {
              // Clear logs
              const store = useDiagnosticsStore.getState();
              store.clearRequestLogs();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </button>
        </div>
      </div>

      {/* Request Log Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requestLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    <span className={`px-2 py-1 rounded text-xs ${
                      log.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                      log.method === 'POST' ? 'bg-green-100 text-green-800' :
                      log.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      log.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">{log.url}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      log.status >= 200 && log.status < 300 ? 'bg-green-100 text-green-800' :
                      log.status >= 400 ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{log.latency}ms</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {requestLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No API requests logged yet. Make some API calls to see them here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Request Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{selectedLog.method} {selectedLog.url}</h3>
                <p className="text-sm text-gray-500">
                  Status: {selectedLog.status} | Latency: {selectedLog.latency}ms
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('contents')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'contents' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  Unwrapped Contents
                </button>
                <button
                  onClick={() => setViewMode('envelope')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'envelope' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  Raw Envelope
                </button>
              </div>

              {/* Request Payload */}
              <div>
                <h4 className="font-medium mb-2">Request</h4>
                <div className="relative">
                  <pre className="bg-gray-50 p-3 rounded overflow-x-auto text-sm">
                    {formatJson(selectedLog.requestPayload)}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(formatJson(selectedLog.requestPayload))}
                    className="absolute top-2 right-2 p-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Response Payload */}
              <div>
                <h4 className="font-medium mb-2">Response</h4>
                <div className="relative">
                  <pre className="bg-gray-50 p-3 rounded overflow-x-auto text-sm">
                    {formatJson(viewMode === 'contents' ? selectedLog.responsePayload : selectedLog.rawEnvelope)}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(formatJson(viewMode === 'contents' ? selectedLog.responsePayload : selectedLog.rawEnvelope))}
                    className="absolute top-2 right-2 p-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
