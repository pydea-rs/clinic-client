import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { aiAgentsApi } from '../../../api/ai-agents.api';
import { Bot, ChevronRight, MessageCircle, Sparkles } from 'lucide-react';

export const ConversationHistory: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-conversations', { take: 5 }],
    queryFn: () => aiAgentsApi.listConversations({ take: 5 }),
  });

  if (isLoading) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Recent AI Chats</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const conversations = data?.data || [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="font-semibold text-sm text-gray-900">Recent AI Chats</h3>
        </div>
        <Link to="/ai/history" className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors">
          View all
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400 mb-1">No conversations yet</p>
          <Link to="/ai/new" className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors">
            Start your first chat
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              to={`/ai/${conv.id}`}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50/80 transition-all duration-200 group"
            >
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors duration-200">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate group-hover:text-gray-900 transition-colors">
                  {conv.topic || `Chat — ${new Date(conv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                </p>
                <p className="text-[11px] text-gray-400">
                  {new Date(conv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {conv.soap && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-semibold flex-shrink-0 ring-1 ring-emerald-500/10">
                  <Sparkles className="w-2.5 h-2.5" />
                  SOAP
                </span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 flex-shrink-0 transition-all duration-200" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
