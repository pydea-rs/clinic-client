import { create } from 'zustand';

interface DiagnosticsState {
  requestLog: RequestLogEntry[];
  maxRequestLogEntries: number;
  sseStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  wsStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastSseEvent?: string;
  lastWsEvent?: string;
  showRawEnvelope: boolean;
  debugMode: boolean;
  
  addRequestLog: (entry: RequestLogEntry) => void;
  clearRequestLog: () => void;
  setSseStatus: (status: DiagnosticsState['sseStatus']) => void;
  setWsStatus: (status: DiagnosticsState['wsStatus']) => void;
  setLastSseEvent: (event: string) => void;
  setLastWsEvent: (event: string) => void;
  toggleRawEnvelope: () => void;
  toggleDebugMode: () => void;
}

export interface RequestLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  latency: number;
  requestPayload?: unknown;
  responsePayload?: unknown;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set, get) => ({
  requestLog: [],
  maxRequestLogEntries: 50,
  sseStatus: 'disconnected',
  wsStatus: 'disconnected',
  showRawEnvelope: false,
  debugMode: false,

  addRequestLog: (entry) => {
    const { requestLog, maxRequestLogEntries } = get();
    const newLog = [entry, ...requestLog].slice(0, maxRequestLogEntries);
    set({ requestLog: newLog });
  },
  
  clearRequestLog: () => set({ requestLog: [] }),
  
  setSseStatus: (status) => set({ sseStatus: status }),
  setWsStatus: (status) => set({ wsStatus: status }),
  setLastSseEvent: (event) => set({ lastSseEvent: event }),
  setLastWsEvent: (event) => set({ lastWsEvent: event }),
  
  toggleRawEnvelope: () => set((state) => ({ showRawEnvelope: !state.showRawEnvelope })),
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
}));
