import io, { Socket } from 'socket.io-client';

type MatchEventCallback = (data: Record<string, unknown>) => void;

export interface MatchSocketStatus {
  connected: boolean;
  reconnecting: boolean;
}

class MatchingSocketService {
  private socket: Socket | null = null;
  private baseUrl: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  private listeners: Map<string, Set<MatchEventCallback>> = new Map();
  private statusListeners: Array<(status: MatchSocketStatus) => void> = [];
  private status: MatchSocketStatus = { connected: false, reconnecting: false };

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = io(`${this.baseUrl}/matching`, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.updateStatus({ connected: true, reconnecting: false });
    });

    this.socket.on('disconnect', () => {
      this.updateStatus({ connected: false, reconnecting: false });
    });

    this.socket.on('reconnect_attempt', () => {
      this.updateStatus({ connected: false, reconnecting: true });
    });

    this.socket.on('reconnect', () => {
      this.updateStatus({ connected: true, reconnecting: false });
    });

    this.socket.on('reconnect_failed', () => {
      this.updateStatus({ connected: false, reconnecting: false });
    });

    for (const [event, callbacks] of this.listeners) {
      for (const cb of callbacks) {
        this.socket.on(event, cb as (...args: unknown[]) => void);
      }
    }

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.updateStatus({ connected: false, reconnecting: false });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  onStatusChange(callback: (status: MatchSocketStatus) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  private updateStatus(status: MatchSocketStatus): void {
    this.status = status;
    this.statusListeners.forEach(cb => cb(this.status));
  }

  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: MatchEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    if (this.socket) {
      this.socket.on(event, callback as (...args: unknown[]) => void);
    }
  }

  off(event: string, callback: MatchEventCallback): void {
    this.listeners.get(event)?.delete(callback);
    if (this.socket) {
      this.socket.off(event, callback as (...args: unknown[]) => void);
    }
  }

  requestMatch(payload: { soapId?: string; specialty?: string }): void {
    this.emit('match:request', payload);
  }

  acceptMatch(matchRequestId: string): void {
    this.emit('match:accept', { matchRequestId });
  }

  rejectMatch(matchRequestId: string): void {
    this.emit('match:reject', { matchRequestId });
  }

  cancelMatch(matchRequestId: string): void {
    this.emit('match:cancel', { matchRequestId });
  }
}

export const matchingSocket = new MatchingSocketService();
