import io, { Socket } from 'socket.io-client';

export interface SocketConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastError?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private baseUrl: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  private connectionStatus: SocketConnectionStatus = {
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
  };
  private statusListeners: Array<(status: SocketConnectionStatus) => void> = [];
  private onlineUsers: Set<string> = new Set();

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
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
      this.updateStatus({ connected: true, reconnecting: false, reconnectAttempts: 0 });
    });

    this.socket.on('disconnect', () => {
      this.updateStatus({ connected: false, reconnecting: false, reconnectAttempts: 0 });
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      this.updateStatus({ connected: false, reconnecting: true, reconnectAttempts: attempt });
    });

    this.socket.on('reconnect', () => {
      this.updateStatus({ connected: true, reconnecting: false, reconnectAttempts: 0 });
    });

    this.socket.on('reconnect_failed', () => {
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
    });

    this.socket.on('chat:error', (error) => {
      console.error('[Socket] Chat error:', error);
    });

    // Listen for presence events (backend emits only user:online with isOnline flag)
    this.socket.on('user:online', (data: { userId: string; isOnline?: boolean }) => {
      if (data.isOnline === false) {
        this.onlineUsers.delete(data.userId);
      } else {
        this.onlineUsers.add(data.userId);
      }
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

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  onStatusChange(callback: (status: SocketConnectionStatus) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  private updateStatus(status: Partial<SocketConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...status };
    this.statusListeners.forEach(listener => listener(this.connectionStatus));
  }

  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
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

  markAsRead(chatId: string, messageId: string): void {
    this.emit('chat:read', { chatId, messageId });
  }

  editMessage(chatId: string, messageId: string, content: string): void {
    this.emit('chat:edit', { messageId, content });
  }

  deleteMessage(chatId: string, messageId: string): void {
    this.emit('chat:delete', { messageId });
  }
}

export const socketService = new SocketService();
