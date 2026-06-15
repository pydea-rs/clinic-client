import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatHeader } from './ChatHeader';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { MessageInput } from './MessageInput';
import { SOAPReadyBanner } from './SOAPReadyBanner';
import { useChat } from '../hooks/useChat';
import { soapApi } from '../../../api/soap.api';
import { Loader2, RefreshCw, Stethoscope, Heart, Brain, Thermometer, Pill } from 'lucide-react';

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [soapData, setSoapData] = useState<{ id: string; assessment?: string; suggestedSpecialty?: string | null; triageLevel?: string | null } | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

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

  // Smart auto-scroll: only auto-scroll if user is near the bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 120;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setIsNearBottom(distanceFromBottom < threshold);
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isNearBottom]);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Loading / error state
  if (!conversationId) {
    const hasError = !!connectionStatus.error;
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center animate-fade-in">
          <div className={`w-14 h-14 ${hasError ? 'bg-red-50' : 'bg-blue-50'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
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
              className="mt-3 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition-colors btn-press"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const suggestions = [
    { text: "I have a headache that won't go away", icon: Brain },
    { text: "I've been feeling tired and weak", icon: Thermometer },
    { text: "I need help understanding my symptoms", icon: Heart },
    { text: "What medication should I ask about?", icon: Pill },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50/80">
      <ChatHeader
        connectionStatus={connectionStatus}
        deliveryMode={deliveryMode}
        onRetry={initializeChat}
        onToggleDeliveryMode={toggleDeliveryMode}
      />

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Welcome state */}
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">How can I help you today?</h2>
              <p className="text-sm text-gray-500 max-w-md mb-8 leading-relaxed">
                Describe your symptoms or health concerns. I'll help assess your condition and guide you to the right care.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => sendMessage(s.text)}
                    className="flex items-center gap-3 p-3.5 text-left text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 hover:text-gray-900 transition-all group btn-press"
                  >
                    <s.icon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                    <span className="leading-snug">{s.text}</span>
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
