import React, { useState } from 'react';
import { ApiInspector } from './components/ApiInspector';
import { TransportHealth } from './components/TransportHealth';
import { SessionStatus } from './components/SessionStatus';
import { WebSocketDebugPanel } from './components/WebSocketDebugPanel';
import { TestChecklist } from './components/TestChecklist';
import { AccountSwitcher } from './components/AccountSwitcher';

export const DebugPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'checklist' | 'accounts'>('diagnostics');

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
