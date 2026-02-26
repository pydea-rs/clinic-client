import { create } from 'zustand';
import { ApiError } from '../types/api';

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

interface DiagnosticsStore {
  requestLogs: RequestLog[];
  sseStatus: 'connected' | 'disconnected' | 'reconnecting';
  wsStatus: 'connected' | 'disconnected' | 'reconnecting';
  debugMode: boolean;
  lastSseEvent?: string;
  lastWsEvent?: string;
  
  addRequestLog: (log: Omit<RequestLog, 'id' | 'timestamp' | 'latency'>) => void;
  setSseStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
  setWsStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
  setDebugMode: (enabled: boolean) => void;
  setLastSseEvent: (event: string) => void;
  setLastWsEvent: (event: string) => void;
  clearRequestLogs: () => void;
}

export const useDiagnosticsStore = create<DiagnosticsStore>((set) => ({
  requestLogs: [],
  sseStatus: 'disconnected',
  wsStatus: 'disconnected',
  debugMode: false,
  
  addRequestLog: (log) => set((state) => ({
    requestLogs: [
      {
        ...log,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        timestamp: new Date().toISOString(),
        latency: 0,
      },
      ...state.requestLogs.slice(0, 99), // Keep last 100
    ],
  })),
  
  setSseStatus: (status) => set({ sseStatus: status }),
  setWsStatus: (status) => set({ wsStatus: status }),
  setDebugMode: (enabled) => set({ debugMode: enabled }),
  setLastSseEvent: (event) => set({ lastSseEvent: event }),
  setLastWsEvent: (event) => set({ lastWsEvent: event }),
  clearRequestLogs: () => set({ requestLogs: [] }),
}));
