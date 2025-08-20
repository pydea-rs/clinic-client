export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  reconnecting?: boolean;
}

export interface ChatState {
  messages: Message[];
  conversationId: string | null;
  connectionStatus: ConnectionStatus;
  isTyping: boolean;
  isSending: boolean;
}

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
}