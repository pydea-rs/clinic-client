import React from 'react';
import { ApiInspector } from './components/ApiInspector';
import { TransportHealth } from './components/TransportHealth';
import { SessionStatus } from './components/SessionStatus';
import { WebSocketDebugPanel } from './components/WebSocketDebugPanel';

export const DebugPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug & Diagnostics</h1>
      
      <div className="mb-6">
        <SessionStatus />
      </div>
      
      <div className="mb-6">
        <TransportHealth />
      </div>
      
      <div className="mb-6">
        <WebSocketDebugPanel />
      </div>
      
      <ApiInspector />
    </div>
  );
};
