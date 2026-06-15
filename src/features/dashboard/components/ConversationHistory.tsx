import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { aiAgentsApi } from '../../../api/ai-agents.api';
import { MessageCircle, FileText, ChevronRight } from 'lucide-react';

export const ConversationHistory: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-conversations', { take: 5 }],
    queryFn: () => aiAgentsApi.listConversations({ take: 5 }),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent AI Chats</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const conversations = data?.data || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Recent AI Chats</h3>
        <Link to="/ai/history" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-6">
          <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No conversations yet</p>
          <Link to="/ai/new" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
            Start your first chat
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              to={`/ai/${conv.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {conv.topic || `Conversation on ${new Date(conv.createdAt).toLocaleDateString()}`}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(conv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {conv.soap && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0">
                  <FileText className="w-3 h-3" />
                  SOAP
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
