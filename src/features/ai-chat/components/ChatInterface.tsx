import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatHeader } from './ChatHeader';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { MessageInput } from './MessageInput';
import { SOAPReadyBanner } from './SOAPReadyBanner';
import { useChat } from '../hooks/useChat';
import { soapApi } from '../../../api/soap.api';
import { queryClient } from '../../../lib/queryClient';
import { Loader2, RefreshCw, Stethoscope, Heart, Brain, Thermometer, Pill, ArrowDown } from 'lucide-react';

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
    initializeChat,
    sendMessage,
    setSoapReadyCallback,
  } = useChat({ conversationId: routeConversationId, forceNew });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [soapData, setSoapData] = useState<{ id: string; assessment?: string; suggestedSpecialty?: string | null; triageLevel?: string | null } | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const handleChoiceSelect = useCallback((value: string, label: string) => {
    sendMessage(value, { value, label });
  }, [sendMessage]);

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
    void queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      <div className="flex items-center justify-center flex-1 bg-gray-50 dark:bg-slate-900">
        <div className="text-center animate-scale-in">
          <div className={`w-14 h-14 ${hasError ? 'bg-red-50 dark:bg-red-950/30 ring-1 ring-red-100 dark:ring-red-900/50' : 'bg-brand-50 dark:bg-brand-950/30 ring-1 ring-brand-100 dark:ring-brand-800/50'} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft`}>
            {hasError
              ? <RefreshCw className="w-6 h-6 text-red-500" />
              : <Loader2 className="w-6 h-6 animate-spin text-brand-600 dark:text-brand-400" />
            }
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-sm font-medium">
            {hasError ? connectionStatus.error : 'Connecting to AI...'}
          </p>
          {hasError && (
            <button
              onClick={initializeChat}
              className="mt-4 btn-primary px-6 py-2.5 text-sm"
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
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50 dark:bg-slate-900">
      <ChatHeader
        connectionStatus={connectionStatus}
        onRetry={initializeChat}
      />

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth relative bg-mesh"
      >
        <div className="max-w-3xl mx-auto px-4 py-6 min-h-full">
          {/* Welcome state */}
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in py-8">
              <div className="relative w-16 h-16 mb-6">
                {/* Morphing blob background */}
                <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-brand-200/30 dark:bg-brand-800/20 blob animate-morph" />
                {/* Decorative spinning ring */}
                <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-brand-200/30 dark:border-brand-700/30 rounded-full animate-spin-slow" />
                {/* Icon container */}
                <div className="relative w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-soft-lg shadow-brand-500/20 animate-float z-[1]">
                  <Stethoscope className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">How can I help you today?</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
                Describe your symptoms or health concerns. I'll help assess your condition and guide you to the right care.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg stagger-children">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => sendMessage(s.text)}
                    className="card-shine cursor-pointer group flex items-center gap-3 p-4 text-left text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:shadow-soft-lg hover:-translate-y-0.5 hover:border-gray-200 dark:hover:border-slate-600 animate-slide-in-up"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/40 transition-colors duration-200">
                      <s.icon className="w-4 h-4 text-brand-400 dark:text-brand-400 group-hover:text-brand-600 dark:group-hover:text-brand-300 flex-shrink-0 transition-colors duration-200" />
                    </div>
                    <span className="leading-snug">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((message) => (
            <Message key={message.id} message={message} onChoiceSelect={handleChoiceSelect} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        <button
          onClick={scrollToBottom}
          className={`absolute bottom-4 right-4 w-9 h-9 bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-gray-200 dark:border-slate-600 rounded-full shadow-elevation-2 flex items-center justify-center hover:shadow-elevation-3 hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 ease-spring z-10 ${
            !isNearBottom && messages.length > 0
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-75 pointer-events-none'
          }`}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4 text-gray-600 dark:text-slate-300" />
        </button>
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
