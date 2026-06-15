import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Describe your symptoms...',
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !disabled) {
        onSend(input.trim());
        setInput('');
      }
    }
  };

  const canSend = input.trim().length > 0 && !disabled;

  return (
    <div className="flex-shrink-0 border-t bg-white px-4 py-3">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="relative flex items-end bg-gray-50 border border-gray-200 rounded-2xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent px-4 py-3 pr-12 text-sm resize-none focus:outline-none placeholder-gray-400 disabled:text-gray-400 max-h-40"
          />
          <button
            type="submit"
            disabled={!canSend}
            className={`absolute right-2 bottom-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              canSend
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 text-center mt-2">
          AI may make mistakes. Always consult a real doctor for medical advice.
        </p>
      </form>
    </div>
  );
};
