import React from 'react';
import { Bot } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start mb-5 animate-msg-in">
      <div className="flex items-end gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mb-5 shadow-sm">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <div className="bg-white border border-gray-200/80 px-5 py-4 rounded-2xl rounded-bl-sm shadow-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
