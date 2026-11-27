import React, { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, CheckCircle2 } from 'lucide-react';
import { AiChatMessage } from '../../../lib/types/chat';
import { useAuthStore } from '../../../lib/stores/auth.store';
import { UserAvatar } from '../../../components/UserAvatar';
import { getMessageDirection } from '../../../lib/text-direction';

interface MessageProps {
  message: AiChatMessage;
  onChoiceSelect?: (value: string, label: string) => void;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable in insecure contexts
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white opacity-0 group-hover/code:opacity-100 transition-opacity"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const MarkdownContent: React.FC<{ text: string }> = ({ text }) => {
  const components: Components = useMemo(() => ({
    p: ({ children }) => (
      <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
    ul: ({ children }) => (
      <ul className="mb-2 last:mb-0 ms-4 space-y-0.5 list-disc">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-2 last:mb-0 ms-4 space-y-0.5 list-decimal">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    h1: ({ children }) => (
      <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-[15px] font-bold mb-1.5 mt-2.5 first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-s-2 border-brand-300 dark:border-brand-600 ps-3 my-2 text-gray-600 dark:text-slate-300 italic">{children}</blockquote>
    ),
    code: ({ className, children }) => {
      const isBlock = /^language-/.test(className || '');
      if (!isBlock) {
        return (
          <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-900 text-gray-800 dark:text-slate-200 rounded text-[13px] font-mono">
            {children}
          </code>
        );
      }
      const codeString = String(children).replace(/\n$/, '');
      return (
        <div className="relative group/code my-2" dir="ltr">
          <CopyButton text={codeString} />
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto text-[13px]">
            <code className={className}>{children}</code>
          </pre>
        </div>
      );
    },
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline transition-colors duration-200">
        {children}
      </a>
    ),
    hr: () => <hr className="my-3 border-gray-200 dark:border-slate-700" />,
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full text-sm border border-gray-200 dark:border-slate-700 rounded">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800 text-start font-medium border-b border-gray-200 dark:border-slate-700">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-800">{children}</td>
    ),
  }), []);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </ReactMarkdown>
  );
};

export const Message: React.FC<MessageProps> = ({ message, onChoiceSelect }) => {
  const { user } = useAuthStore();
  const direction = getMessageDirection(message.text);
  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (message.isUser) {
    const bubbleClass = message.isQuickReply
      ? 'bg-emerald-600 text-white shadow-sm'
      : 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-soft shadow-brand-500/15 shadow-inner-soft';
    const avatarBg = message.isQuickReply ? 'bg-emerald-100' : 'bg-brand-100';
    const avatarIcon = message.isQuickReply ? 'text-emerald-600' : 'text-brand-600';

    return (
      <div className="group flex justify-end mb-5 animate-msg-in">
        <div className="flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]">
          <div>
            <div
              dir={direction}
              className={`${bubbleClass} text-start px-4 py-3 rounded-2xl rounded-br-sm`}
              style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1), 0 2px 15px -3px rgba(0,0,0,0.07)' }}
            >
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-right pr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">{formatTime(message.timestamp)}</p>
          </div>
          <UserAvatar
            avatar={user?.avatar}
            firstname={user?.firstname}
            lastname={user?.lastname}
            alt={user ? `${user.firstname} ${user.lastname}`.trim() : 'Your avatar'}
            fallback={<User className={`w-3.5 h-3.5 ${avatarIcon}`} />}
            className={`w-7 h-7 rounded-full ${avatarBg} flex-shrink-0 mb-5 ring-2 ring-white`}
          />
        </div>
      </div>
    );
  }

  const botAccentBorder =
    direction === 'rtl' ? 'border-r-2 border-r-brand-200 dark:border-r-brand-600/60' : 'border-l-2 border-l-brand-200 dark:border-l-brand-600/60';

  return (
    <div className="group flex justify-start mb-5 animate-msg-in">
      <div className="flex items-end gap-2.5 max-w-[90%] sm:max-w-[80%] lg:max-w-[75%]">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 mb-5 shadow-sm shadow-brand-500/20 ring-2 ring-white dark:ring-slate-900">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <div
            dir={direction}
            className={`bg-gradient-to-br from-white to-brand-50/40 dark:from-slate-800 dark:to-slate-800/90 border border-gray-100 dark:border-slate-700/70 ${botAccentBorder} text-start px-4 py-3 rounded-2xl rounded-bl-sm shadow-soft`}
          >
            <div className="text-[14px] text-gray-800 dark:text-slate-100 prose-sm">
              <MarkdownContent text={message.text} />
            </div>
            {message.choices && message.choices.length > 0 && !message.isStreaming && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100/80 dark:border-slate-700/80">
                {message.choices.map((c) => {
                  const isSelected = message.selectedChoice === c.value;
                  const isClosed = message.selectedChoice === '__closed__';
                  const hasSelection = !!message.selectedChoice;

                  if (hasSelection) {
                    return (
                      <span
                        key={c.value}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium rounded-full border transition-all duration-200 ${
                          isSelected
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700/60 ring-1 ring-emerald-600/10'
                            : isClosed
                              ? 'text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-900/40 border-gray-200 dark:border-slate-700'
                              : 'text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-900/40 border-gray-200 dark:border-slate-700 line-through opacity-60'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                        {c.label}
                      </span>
                    );
                  }

                  return (
                    <button
                      key={c.value}
                      onClick={() => onChoiceSelect?.(c.value, c.label)}
                      className="px-3.5 py-1.5 text-[13px] font-medium text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-700/60 rounded-full hover:bg-brand-100 dark:hover:bg-brand-900/50 hover:border-brand-300 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 ease-spring btn-press"
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 pl-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">{formatTime(message.timestamp)}</p>
        </div>
      </div>
    </div>
  );
};
