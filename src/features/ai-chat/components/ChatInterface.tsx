import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatHeader } from './ChatHeader';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { MessageInput } from './MessageInput';
import { SOAPReadyBanner } from './SOAPReadyBanner';
import { useChat } from '../hooks/useChat';
import { soapApi } from '../../../api/soap.api';
import { Loader2, MessageCircle, RefreshCw } from 'lucide-react';

interface ChatInterfaceProps {
  forceNew?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ forceNew }) => {
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const {
    messages,
    connectionStatus,
    isTyping,
    conversationId,
    deliveryMode,
    toggleDeliveryMode,
    initializeChat,
    sendMessage,
    setSoapReadyCallback,
  } = useChat({ conversationId: routeConversationId, forceNew });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [soapData, setSoapData] = useState<{ id: string; assessment?: string; suggestedSpecialty?: string | null; triageLevel?: string | null } | null>(null);

  // Handle SOAP ready event
  const handleSoapReady = useCallback(async (data: { soapId: string; conversationId: string }) => {
    try {
      const soap = await soapApi.getById(data.soapId);
      setSoapData({
        id: soap.id,
        assessment: soap.assessment,
        suggestedSpecialty: soap.suggestedSpecialty,
        triageLevel: soap.triageLevel,
      });
    } catch {
      setSoapData({ id: data.soapId });
    }
  }, []);

  useEffect(() => {
    setSoapReadyCallback?.(handleSoapReady);
    return () => setSoapReadyCallback?.(null);
  }, [setSoapReadyCallback, handleSoapReady]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initialize chat on component mount
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  if (!conversationId) {
    const hasError = !!connectionStatus.error;
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] animate-fade-in">
        <div className="text-center animate-slide-in-up">
          <div className={`w-16 h-16 ${hasError ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-blue-600 to-blue-700'} rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-float`}>
            {hasError
              ? <RefreshCw className="w-8 h-8 text-white" />
              : <Loader2 className="w-8 h-8 animate-spin text-white" />
            }
          </div>
          <p className="text-gray-600 font-medium text-lg">
            {hasError ? connectionStatus.error : 'Initializing AI conversation...'}
          </p>
          {hasError ? (
            <button
              onClick={initializeChat}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-md"
            >
              Try Again
            </button>
          ) : (
            <div className="mt-4 flex justify-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 animate-fade-in">
      <ChatHeader
        connectionStatus={connectionStatus}
        deliveryMode={deliveryMode}
        onRetry={initializeChat}
        onToggleDeliveryMode={toggleDeliveryMode}
      />

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 custom-scrollbar">
        <div className="h-full px-4 py-4 max-w-4xl mx-auto">
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
                  Describe your symptoms and the AI will help assess your condition.
                </p>
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

      {soapData && (
        <SOAPReadyBanner
          soapId={soapData.id}
          assessment={soapData.assessment}
          suggestedSpecialty={soapData.suggestedSpecialty}
          triageLevel={soapData.triageLevel}
          onFindDoctor={() => {
            const params = new URLSearchParams();
            if (soapData.suggestedSpecialty) params.set('specialty', soapData.suggestedSpecialty);
            params.set('soapId', soapData.id);
            navigate(`/doctors?${params.toString()}`);
          }}
          onViewSOAP={() => navigate(`/soap/${soapData.id}`)}
          onDismiss={() => setSoapData(null)}
        />
      )}

      <MessageInput
        onSend={sendMessage}
        disabled={!connectionStatus.connected}
      />
    </div>
  );
};
