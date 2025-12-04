import React, { useEffect, useState } from 'react';
import { Message as MessageType } from '../types/chat';
import { User, Bot } from 'lucide-react';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.isUser;

  // Local state for typewriter-style streaming of bot messages
  const [displayedText, setDisplayedText] = useState(
    isUser ? message.text : ''
  );

  useEffect(() => {
    // User messages are shown immediately without animation
    if (isUser) {
      setDisplayedText(message.text);
      return;
    }

    const fullText = message.text || '';

    // If the new text is shorter or equal, just sync directly
    if (fullText.length <= displayedText.length) {
      setDisplayedText(fullText);
      return;
    }

    let currentIndex = displayedText.length;
    const interval = setInterval(() => {
      currentIndex += 1;
      const next = fullText.slice(0, currentIndex);
      setDisplayedText(next);

      if (currentIndex >= fullText.length) {
        clearInterval(interval);
      }
    }, 15); // Adjust speed as desired (ms per character)

    return () => clearInterval(interval);
  }, [isUser, message.text]);

  return (
    <div
      className={`flex items-start gap-3 p-4 message-bubble transition-all-smooth ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover-lift transition-all-smooth ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
            : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
        }`}
      >
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 animate-pulse-slow" />}
      </div>
      
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-md hover-lift transition-all-smooth ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md'
            : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 rounded-bl-md border border-gray-200'
        }`}
      >
        <p className="text-sm leading-relaxed font-medium">{displayedText}</p>
        <time
          className={`text-xs mt-2 block font-medium ${
            isUser ? 'text-blue-100' : 'text-gray-400'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </time>
      </div>
    </div>
  );
};