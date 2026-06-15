import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { aiAgentsApi } from '../../../api/ai-agents.api';
import { Bot, ChevronRight, MessageCircle } from 'lucide-react';

export const ConversationHistory: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-conversations', { take: 5 }],
    queryFn: () => aiAgentsApi.listConversations({ take: 5 }),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-medium text-sm text-gray-900 mb-3">Recent AI Chats</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-50 rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const conversations = data?.data || [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-gray-900">Recent AI Chats</h3>
        <Link to="/ai/history" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          View all
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No conversations yet</p>
          <Link to="/ai/new" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
            Start your first chat
          </Link>
        </div>
      ) : (
        <div className="space-y-0.5">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              to={`/ai/${conv.id}`}
              className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">
                  {conv.topic || `Chat — ${new Date(conv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                </p>
                <p className="text-[11px] text-gray-400">
                  {new Date(conv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {conv.soap && (
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-medium flex-shrink-0">
                  SOAP
                </span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
