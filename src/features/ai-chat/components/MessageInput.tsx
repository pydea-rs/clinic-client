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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !disabled) {
        onSend(input.trim());
        setInput('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    }
  };

  const canSend = input.trim().length > 0 && !disabled;
  const showCharCounter = input.length > 200;

  return (
    <div className="flex-shrink-0 bg-gray-50 dark:bg-slate-900 border-t border-gray-200/60 dark:border-slate-700/60">
      {/* Subtle gradient accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />

      <div className="px-4 py-3.5">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-end bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-2xl shadow-soft focus-within:border-brand-400 dark:focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 dark:focus-within:ring-brand-900/30 focus-within:shadow-glow-blue transition-all duration-200 ease-spring">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="flex-1 bg-transparent px-4 py-3.5 pr-12 text-sm text-gray-900 dark:text-slate-100 resize-none focus:outline-none placeholder-gray-400 dark:placeholder-slate-500 disabled:text-gray-400 dark:disabled:text-slate-600 max-h-40 leading-relaxed"
            />
            <button
              type="submit"
              disabled={!canSend}
              className={`absolute right-2.5 bottom-2.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ease-spring btn-press ${
                canSend
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:shadow-glow-blue hover:from-brand-500 hover:to-brand-400 shadow-sm shadow-brand-600/20 animate-pop-in'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center flex-1">
              AI may make mistakes. Always consult a real doctor for medical advice.
            </p>
            {showCharCounter && (
              <span className={`text-[10px] ml-2 flex-shrink-0 transition-colors duration-200 ${
                input.length > 1800 ? 'text-amber-500' : 'text-gray-400 dark:text-slate-500'
              }`}>
                {input.length}/2000
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
