import React from 'react';
import { Bot, User } from 'lucide-react';
import { Message as MessageType } from '../../../lib/types/chat';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (message.isUser) {
    return (
      <div className="flex justify-end mb-4 message-bubble">
        <div className="flex items-end gap-2 max-w-[80%] lg:max-w-[60%]">
          <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
            <p className="text-[10px] text-blue-200 mt-1 text-right">{formatTime(message.timestamp)}</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4 message-bubble">
      <div className="flex items-end gap-2 max-w-[80%] lg:max-w-[70%]">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="bg-white border border-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm">
          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
            {message.text}
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-4 ml-0.5 align-middle bg-gray-400 animate-pulse" />
            )}
          </p>
          <p className="text-[10px] text-gray-300 mt-1">{formatTime(message.timestamp)}</p>
        </div>
      </div>
    </div>
  );
};
