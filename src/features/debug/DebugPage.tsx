import React, { useState } from 'react';
import { ApiInspector } from './components/ApiInspector';
import { TransportHealth } from './components/TransportHealth';
import { SessionStatus } from './components/SessionStatus';
import { WebSocketDebugPanel } from './components/WebSocketDebugPanel';
import { TestChecklist } from './components/TestChecklist';
import { AccountSwitcher } from './components/AccountSwitcher';
import { apiClient } from '../../lib/api/client';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';

export const DebugPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'checklist' | 'accounts'>('diagnostics');
  const [openAiMessage, setOpenAiMessage] = useState('Hello doctor, I have a mild headache and fever.');
  const [openAiResponse, setOpenAiResponse] = useState('');
  const [probingOpenAi, setProbingOpenAi] = useState(false);
  const [manualMethod, setManualMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET');
  const [manualUrl, setManualUrl] = useState('/user');
  const [manualBody, setManualBody] = useState('');
  const [manualResponse, setManualResponse] = useState('');
  const [runningManual, setRunningManual] = useState(false);

  const runOpenAiProbe = async () => {
    setProbingOpenAi(true);
    try {
      const response = await apiClient.post('/ai-agents/openai', { message: openAiMessage });
      setOpenAiResponse(typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2));
      toast.success('OpenAI endpoint responded');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'OpenAI endpoint failed'));
    } finally {
      setProbingOpenAi(false);
    }
  };

  const runManualRequest = async () => {
    setRunningManual(true);
    try {
      const parsedBody = manualBody.trim().length ? JSON.parse(manualBody) : undefined;
      const response = await apiClient.request({
        method: manualMethod,
        url: manualUrl,
        data: parsedBody,
      });
      setManualResponse(JSON.stringify(response.data, null, 2));
      toast.success('Manual request succeeded');
    } catch (error: unknown) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON body');
      } else {
        setManualResponse(JSON.stringify(error, null, 2));
        toast.error(getErrorMessage(error, 'Manual request failed'));
      }
    } finally {
      setRunningManual(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug & QA Tools</h1>
      
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'diagnostics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'checklist'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Test Checklist
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'accounts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Account Switcher
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <SessionStatus />
          <TransportHealth />
          <WebSocketDebugPanel />
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-3">OpenAI Endpoint Probe</h2>
            <p className="text-sm text-gray-500 mb-3">Calls POST /ai-agents/openai with your test message.</p>
            <textarea
              value={openAiMessage}
              onChange={(e) => setOpenAiMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg mb-3"
            />
            <button
              onClick={runOpenAiProbe}
              disabled={probingOpenAi || !openAiMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
            >
              {probingOpenAi ? 'Running...' : 'Run OpenAI Probe'}
            </button>
            {openAiResponse && (
              <pre className="mt-4 bg-gray-50 p-3 rounded-lg text-xs overflow-auto whitespace-pre-wrap">{openAiResponse}</pre>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-3">Manual Endpoint Runner</h2>
            <p className="text-sm text-gray-500 mb-3">Run any backend endpoint directly from UI for coverage checks.</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <select
                value={manualMethod}
                onChange={(e) => setManualMethod(e.target.value as 'GET' | 'POST' | 'PATCH' | 'DELETE')}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
              <input
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="md:col-span-3 px-3 py-2 border rounded-lg"
                placeholder="/admin/stats"
              />
            </div>

            <textarea
              value={manualBody}
              onChange={(e) => setManualBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg mb-3 font-mono text-sm"
              placeholder='{"key":"value"} (optional for GET/DELETE)'
            />

            <button
              onClick={runManualRequest}
              disabled={runningManual || !manualUrl.trim()}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-400"
            >
              {runningManual ? 'Running...' : 'Run Request'}
            </button>

            {manualResponse && (
              <pre className="mt-4 bg-gray-50 p-3 rounded-lg text-xs overflow-auto whitespace-pre-wrap">{manualResponse}</pre>
            )}
          </div>
          <ApiInspector />
        </div>
      )}

      {activeTab === 'checklist' && (
        <TestChecklist />
      )}

      {activeTab === 'accounts' && (
        <AccountSwitcher />
      )}
    </div>
  );
};
