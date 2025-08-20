import React from 'react';
import { Bot } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-start gap-3 p-4 animate-slide-in-up">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 flex items-center justify-center shadow-lg animate-float">
        <Bot className="w-5 h-5 animate-pulse-slow" />
      </div>
      
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-md border border-gray-200 hover-lift">
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
          </div>
          <span className="text-xs text-gray-500 ml-2 font-medium animate-pulse-slow">AI is typing...</span>
        </div>
      </div>
    </div>
  );
};