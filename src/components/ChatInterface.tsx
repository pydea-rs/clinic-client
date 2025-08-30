import React, { useEffect, useRef } from 'react';
import { ChatHeader } from './ChatHeader';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { MessageInput } from './MessageInput';
import { useChat } from '../hooks/useChat';
import { Loader2, MessageCircle } from 'lucide-react';

interface ChatInterfaceProps {
  token: string;
  onLogout: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ token, onLogout }) => {
  const {
    messages,
    connectionStatus,
    isTyping,
    isSending,
    conversationId,
    initializeChat,
    sendMessage,
  } = useChat(token);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initialize chat on component mount
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  if (!conversationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center animate-fade-in">
        <div className="text-center animate-slide-in-up">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-float">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
          <p className="text-gray-600 font-medium text-lg">🤖 Initializing AI conversation...</p>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 animate-fade-in">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        <ChatHeader
          connectionStatus={connectionStatus}
          onRetry={initializeChat}
          onLogout={onLogout}
        />

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 custom-scrollbar">
          <div className="h-full">
            {messages.length === 0 && !isTyping && (
              <div className="flex items-center justify-center h-full text-center">
                <div className="animate-slide-in-up">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-float">
                    <MessageCircle className="w-10 h-10 text-blue-600 animate-pulse-slow" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Ready to chat!
                  </h3>
                  <p className="text-gray-600 max-w-sm font-medium leading-relaxed">
                    Start a conversation with your AI assistant. Ask questions or just say hello!
                  </p>
                  <div className="mt-6 flex justify-center gap-2">
                    <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium animate-bounce-slow">💬 Say hello!</div>
                    <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium animate-bounce-slow" style={{ animationDelay: '0.5s' }}>🤔 Ask anything</div>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <MessageInput
          onSendMessage={sendMessage}
          disabled={!connectionStatus.connected}
          isSending={isSending}
        />
      </div>
    </div>
  );
};