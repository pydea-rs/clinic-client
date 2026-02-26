import io, { Socket } from 'socket.io-client';

export interface SocketConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastError?: string;
}

export interface SocketEventLog {
  timestamp: Date;
  type: 'emit' | 'receive';
  event: string;
  data?: any;
}

class SocketService {
  private socket: Socket | null = null;
  private baseUrl: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  private connectionStatus: SocketConnectionStatus = {
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
  };
  private eventLogs: SocketEventLog[] = [];
  private maxLogs = 100;
  private statusListeners: Array<(status: SocketConnectionStatus) => void> = [];
  private onlineUsers: Set<string> = new Set();

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(`${this.baseUrl}/chat`, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to chat namespace');
      this.updateStatus({ connected: true, reconnecting: false, reconnectAttempts: 0 });
      this.logEvent('receive', 'connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected from chat namespace:', reason);
      this.updateStatus({ connected: false, reconnecting: false, reconnectAttempts: 0 });
      this.logEvent('receive', 'disconnect', { reason });
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log('[Socket] Reconnection attempt:', attempt);
      this.updateStatus({ connected: false, reconnecting: true, reconnectAttempts: attempt });
    });

    this.socket.on('reconnect', (attempt) => {
      console.log('[Socket] Reconnected after', attempt, 'attempts');
      this.updateStatus({ connected: true, reconnecting: false, reconnectAttempts: 0 });
      this.logEvent('receive', 'reconnect', { attempt });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed');
      this.updateStatus({ 
        connected: false, 
        reconnecting: false, 
        reconnectAttempts: 0,
        lastError: 'Reconnection failed after maximum attempts'
      });
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
      this.updateStatus({ 
        ...this.connectionStatus, 
        lastError: error.message || 'Unknown error' 
      });
      this.logEvent('receive', 'error', error);
    });

    this.socket.on('chat:error', (error) => {
      console.error('[Socket] Chat error:', error);
      this.logEvent('receive', 'chat:error', error);
    });

    // Listen for presence events
    this.socket.on('user:online', (data: { userId: string }) => {
      this.onlineUsers.add(data.userId);
      this.logEvent('receive', 'user:online', data);
    });

    this.socket.on('user:offline', (data: { userId: string }) => {
      this.onlineUsers.delete(data.userId);
      this.logEvent('receive', 'user:offline', data);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.onlineUsers.clear();
      this.updateStatus({ connected: false, reconnecting: false, reconnectAttempts: 0 });
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getConnectionStatus(): SocketConnectionStatus {
    return { ...this.connectionStatus };
  }

  getEventLogs(): SocketEventLog[] {
    return [...this.eventLogs];
  }

  clearEventLogs(): void {
    this.eventLogs = [];
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  onStatusChange(callback: (status: SocketConnectionStatus) => void): () => void {
    this.statusListeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  private updateStatus(status: Partial<SocketConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...status };
    this.statusListeners.forEach(listener => listener(this.connectionStatus));
  }

  private logEvent(type: 'emit' | 'receive', event: string, data?: any): void {
    this.eventLogs.push({
      timestamp: new Date(),
      type,
      event,
      data,
    });
    
    // Keep only last maxLogs entries
    if (this.eventLogs.length > this.maxLogs) {
      this.eventLogs = this.eventLogs.slice(-this.maxLogs);
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      this.logEvent('emit', event, data);
    } else {
      console.warn(`[Socket] Cannot emit '${event}' - socket not connected`);
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      const wrappedCallback = (...args: any[]) => {
        this.logEvent('receive', event, args);
        callback(...args);
      };
      this.socket.on(event, wrappedCallback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Chat-specific methods
  joinRoom(chatId: string): void {
    this.emit('chat:join', { chatId });
  }

  leaveRoom(chatId: string): void {
    this.emit('chat:leave', { chatId });
  }

  sendMessage(chatId: string, content: string, type: string = 'TEXT'): void {
    this.emit('chat:message', { chatId, content, type });
  }

  sendTyping(chatId: string, isTyping: boolean): void {
    this.emit('chat:typing', { chatId, isTyping });
  }

  markAsRead(chatId: string, messageId: number): void {
    this.emit('chat:read', { chatId, messageId });
  }

  editMessage(chatId: string, messageId: number, content: string): void {
    this.emit('chat:edit', { chatId, messageId, content });
  }

  deleteMessage(chatId: string, messageId: number): void {
    this.emit('chat:delete', { chatId, messageId });
  }
}

export const socketService = new SocketService();
