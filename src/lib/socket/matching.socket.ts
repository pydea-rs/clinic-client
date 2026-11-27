import io, { Socket } from 'socket.io-client';
import { socketTarget } from './socket-url';

type MatchEventCallback = (data: Record<string, unknown>) => void;

const ANSWER_TIMEOUT_MS = 10_000;

export interface MatchSocketStatus {
  connected: boolean;
  reconnecting: boolean;
}

class MatchingSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<MatchEventCallback>> = new Map();
  private statusListeners: Array<(status: MatchSocketStatus) => void> = [];
  private status: MatchSocketStatus = { connected: false, reconnecting: false };

  connect(): Socket {
    if (this.socket && (this.socket.connected || this.socket.active)) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.io?.removeAllListeners();
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    const { url, path } = socketTarget('/matching');
    this.socket = io(url, {
      path,
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

    this.socket.io?.on('reconnect_attempt', () => {
      this.updateStatus({ connected: false, reconnecting: true });
    });

    this.socket.io?.on('reconnect', () => {
      this.updateStatus({ connected: true, reconnecting: false });
    });

    this.socket.io?.on('reconnect_failed', () => {
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
      this.socket.io?.removeAllListeners();
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

  /** Resolves once the server confirms (match:accepted); rejects on its error, a timeout, or no connection. */
  acceptMatch(matchRequestId: string, timeoutMs = ANSWER_TIMEOUT_MS): Promise<Record<string, unknown>> {
    return this.answerOffer('match:accept', 'match:accepted', matchRequestId, timeoutMs);
  }

  /** Resolves once the server confirms (match:rejected); rejects on its error, a timeout, or no connection. */
  rejectMatch(matchRequestId: string, timeoutMs = ANSWER_TIMEOUT_MS): Promise<Record<string, unknown>> {
    return this.answerOffer('match:reject', 'match:rejected', matchRequestId, timeoutMs);
  }

  // match:error and WsException's `exception` carry no request id: answer one offer at a time.
  private answerOffer(
    event: string,
    confirmation: string,
    matchRequestId: string,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const socket = this.socket;
      if (!socket?.connected) {
        reject(new Error('Not connected to the matching service. Try again in a moment.'));
        return;
      }
      const settle = (outcome: () => void) => {
        clearTimeout(timer);
        socket.off(confirmation, onConfirmed);
        socket.off('match:error', onError);
        socket.off('exception', onError);
        socket.off('match:offer_expired', onWithdrawn);
        socket.off('match:cancelled', onWithdrawn);
        socket.off('match:timeout', onWithdrawn);
        socket.off('disconnect', onDisconnect);
        outcome();
      };
      const onConfirmed = (data: Record<string, unknown>) => {
        if (data?.matchRequestId === matchRequestId) settle(() => resolve(data));
      };
      const onError = (data: Record<string, unknown>) =>
        settle(() => reject(new Error(typeof data?.message === 'string' ? data.message : 'The server refused the request.')));
      const onWithdrawn = (data: Record<string, unknown>) => {
        if (data?.matchRequestId === matchRequestId) {
          settle(() => reject(new Error('Match request is no longer available.')));
        }
      };
      const onDisconnect = () =>
        settle(() => reject(new Error('Disconnected from the matching service. Try again in a moment.')));
      const timer = setTimeout(
        () => settle(() => reject(new Error('The server did not answer. Try again.'))),
        timeoutMs,
      );
      socket.on(confirmation, onConfirmed);
      socket.on('match:error', onError);
      socket.on('exception', onError);
      socket.on('match:offer_expired', onWithdrawn);
      socket.on('match:cancelled', onWithdrawn);
      socket.on('match:timeout', onWithdrawn);
      socket.on('disconnect', onDisconnect);
      socket.emit(event, { matchRequestId });
    });
  }

  cancelMatch(matchRequestId: string): void {
    this.emit('match:cancel', { matchRequestId });
  }
}

export const matchingSocket = new MatchingSocketService();
