export interface MessageChoice {
  label: string;
  value: string;
}

export interface AiChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
  choices?: MessageChoice[];
  isQuickReply?: boolean;
  selectedChoice?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  reconnecting?: boolean;
}

export interface ChatState {
  messages: AiChatMessage[];
  conversationId: string | null;
  connectionStatus: ConnectionStatus;
  isTyping: boolean;
  isSending: boolean;
}
