import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChatHeader } from './ChatHeader';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { MessageInput } from './MessageInput';
import { SOAPReadyBanner } from './SOAPReadyBanner';
import { useChat } from '../hooks/useChat';
import { soapApi } from '../../../api/soap.api';
import { Bot, Loader2, RefreshCw, Stethoscope, MessageCircle, FileText } from 'lucide-react';

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Loading / error state
  if (!conversationId) {
    const hasError = !!connectionStatus.error;
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className={`w-14 h-14 ${hasError ? 'bg-red-100' : 'bg-blue-100'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
            {hasError
              ? <RefreshCw className="w-6 h-6 text-red-500" />
              : <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            }
          </div>
          <p className="text-gray-600 text-sm font-medium">
            {hasError ? connectionStatus.error : 'Connecting to AI...'}
          </p>
          {hasError && (
            <button
              onClick={initializeChat}
              className="mt-3 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <ChatHeader
        connectionStatus={connectionStatus}
        deliveryMode={deliveryMode}
        onRetry={initializeChat}
        onToggleDeliveryMode={toggleDeliveryMode}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Welcome state */}
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">How can I help you today?</h2>
              <p className="text-sm text-gray-500 max-w-md mb-8">
                Describe your symptoms or health concerns. I'll help assess your condition and generate a SOAP note if needed.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  { text: 'I have a headache that won\'t go away', icon: MessageCircle },
                  { text: 'I\'ve been feeling tired lately', icon: MessageCircle },
                  { text: 'I need help understanding my symptoms', icon: Stethoscope },
                  { text: 'What should I know before seeing a doctor?', icon: FileText },
                ].map((suggestion) => (
                  <button
                    key={suggestion.text}
                    onClick={() => sendMessage(suggestion.text)}
                    className="flex items-start gap-2.5 p-3 text-left text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <suggestion.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* SOAP Banner */}
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
