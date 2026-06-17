import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check } from 'lucide-react';
import { Message as MessageType } from '../../../lib/types/chat';

interface MessageProps {
  message: MessageType;
  onChoiceSelect?: (value: string) => void;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
  const components = useMemo(() => ({
    p: ({ children }: any) => (
      <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic">{children}</em>
    ),
    ul: ({ children }: any) => (
      <ul className="mb-2 last:mb-0 ml-4 space-y-0.5 list-disc">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="mb-2 last:mb-0 ml-4 space-y-0.5 list-decimal">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="leading-relaxed">{children}</li>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-[15px] font-bold mb-1.5 mt-2.5 first:mt-0">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-2 border-gray-300 pl-3 my-2 text-gray-600 italic">{children}</blockquote>
    ),
    code: ({ inline, className, children }: any) => {
      if (inline) {
        return (
          <code className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-[13px] font-mono">
            {children}
          </code>
        );
      }
      const codeString = String(children).replace(/\n$/, '');
      return (
        <div className="relative group/code my-2">
          <CopyButton text={codeString} />
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto text-[13px]">
            <code className={className}>{children}</code>
          </pre>
        </div>
      );
    },
    a: ({ href, children }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {children}
      </a>
    ),
    hr: () => <hr className="my-3 border-gray-200" />,
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full text-sm border border-gray-200 rounded">{children}</table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="px-3 py-1.5 bg-gray-50 text-left font-medium border-b border-gray-200">{children}</th>
    ),
    td: ({ children }: any) => (
      <td className="px-3 py-1.5 border-b border-gray-100">{children}</td>
    ),
  }), []);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </ReactMarkdown>
  );
};

export const Message: React.FC<MessageProps> = ({ message, onChoiceSelect }) => {
  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (message.isUser) {
    return (
      <div className="flex justify-end mb-5 animate-msg-in">
        <div className="flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]">
          <div>
            <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-sm">
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-right pr-1">{formatTime(message.timestamp)}</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mb-5">
            <User className="w-3.5 h-3.5 text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-5 animate-msg-in">
      <div className="flex items-end gap-2.5 max-w-[90%] sm:max-w-[80%] lg:max-w-[75%]">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mb-5 shadow-sm">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <div className="bg-white border border-gray-200/80 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
            <div className="text-[14px] text-gray-800 prose-sm">
              <MarkdownContent text={message.text} />
              {message.isStreaming && (
                <span className="inline-block w-0.5 h-4 ml-0.5 align-middle bg-blue-500 animate-pulse rounded-full" />
              )}
            </div>
            {message.choices && message.choices.length > 0 && !message.isStreaming && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                {message.choices.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => onChoiceSelect?.(c.value)}
                    className="px-3.5 py-1.5 text-[13px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 hover:border-blue-300 transition-colors btn-press"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1 pl-1">{formatTime(message.timestamp)}</p>
        </div>
      </div>
    </div>
  );
};
