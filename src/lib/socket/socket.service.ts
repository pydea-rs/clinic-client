import { io, Socket } from 'socket.io-client';

interface SocketServiceOptions {
  namespace?: string;
  withCredentials?: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private namespace: string;
  private withCredentials: boolean;

  constructor(options: SocketServiceOptions = {}) {
    this.namespace = options.namespace || '/chat';
    this.withCredentials = options.withCredentials ?? true;
  }

  connect(): Socket {
    if (this.socket) {
      return this.socket;
    }

    const baseUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const url = `${baseUrl}${this.namespace}`;

    this.socket = io(url, {
      withCredentials: this.withCredentials,
      transports: ['websocket', 'polling'],
    });

    // Connection handlers
    this.socket.on('connect', () => {
      console.log('[WS] Connected to', this.namespace);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected from', this.namespace, 'reason:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Join a chat room
  joinRoom(room: string): void {
    this.socket?.emit('chat:join', { room });
  }

  // Leave a chat room
  leaveRoom(room: string): void {
    this.socket?.emit('chat:leave', { room });
  }

  // Send a message
  sendMessage(chatId: string, content: string, type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM' = 'TEXT'): void {
    this.socket?.emit('chat:message', { chatId, content, type });
  }

  // Send typing indicator
  sendTyping(chatId: string, isTyping: boolean): void {
    this.socket?.emit('chat:typing', { chatId, isTyping });
  }

  // Mark message as read
  markAsRead(chatId: string, messageId: number): void {
    this.socket?.emit('chat:read', { chatId, messageId });
  }

  // Edit a message
  editMessage(chatId: string, messageId: number, content: string): void {
    this.socket?.emit('chat:edit', { chatId, messageId, content });
  }

  // Delete a message
  deleteMessage(chatId: string, messageId: number): void {
    this.socket?.emit('chat:delete', { chatId, messageId });
  }
}

export const socketService = new SocketService({ namespace: '/chat' });
