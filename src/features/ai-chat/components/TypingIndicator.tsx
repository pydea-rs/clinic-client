import React from 'react';
import { Bot } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-end gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
            <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
            <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
          </div>
        </div>
      </div>
    </div>
  );
};
