import { create } from 'zustand';

export interface RequestLogEntry {
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

interface DiagnosticsState {
  requestLogs: RequestLogEntry[];
  maxRequestLogEntries: number;
  sseStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  wsStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastSseEvent?: string;
  lastWsEvent?: string;
  showRawEnvelope: boolean;
  debugMode: boolean;
  
  addRequestLog: (entry: RequestLogEntry) => void;
  clearRequestLogs: () => void;
  setSseStatus: (status: DiagnosticsState['sseStatus']) => void;
  setWsStatus: (status: DiagnosticsState['wsStatus']) => void;
  setLastSseEvent: (event: string) => void;
  setLastWsEvent: (event: string) => void;
  toggleRawEnvelope: () => void;
  setDebugMode: (enabled: boolean) => void;
  toggleDebugMode: () => void;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set, get) => ({
  requestLogs: [],
  maxRequestLogEntries: 50,
  sseStatus: 'disconnected',
  wsStatus: 'disconnected',
  showRawEnvelope: false,
  debugMode: false,

  addRequestLog: (entry) => {
    const { requestLogs, maxRequestLogEntries } = get();
    const newLog = [entry, ...requestLogs].slice(0, maxRequestLogEntries);
    set({ requestLogs: newLog });
  },
  
  clearRequestLogs: () => set({ requestLogs: [] }),
  
  setSseStatus: (status) => set({ sseStatus: status }),
  setWsStatus: (status) => set({ wsStatus: status }),
  setLastSseEvent: (event) => set({ lastSseEvent: event }),
  setLastWsEvent: (event) => set({ lastWsEvent: event }),
  
  toggleRawEnvelope: () => set((state) => ({ showRawEnvelope: !state.showRawEnvelope })),
  setDebugMode: (enabled) => set({ debugMode: enabled }),
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
}));
