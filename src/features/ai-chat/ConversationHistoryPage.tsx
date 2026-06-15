import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { aiAgentsApi } from '../../api/ai-agents.api';
import { MessageCircle, FileText, Plus, ChevronRight, Loader2 } from 'lucide-react';

export const ConversationHistoryPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['ai-conversations', page],
    queryFn: () => aiAgentsApi.listConversations({ skip: page * limit, take: limit }),
  });

  const conversations = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Chat History</h1>
          <p className="text-gray-500 text-sm mt-1">{total} conversation{total !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/ai/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No conversations yet</h3>
          <p className="text-gray-500 mb-4">Start chatting with the AI assistant to see your history here.</p>
          <Link to="/ai/new" className="text-blue-600 hover:underline font-medium">
            Start your first conversation
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border divide-y">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                to={`/ai/${conv.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {conv.topic || `Conversation on ${new Date(conv.createdAt).toLocaleDateString()}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(conv.createdAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {conv.soap && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex-shrink-0">
                    <FileText className="w-3 h-3" />
                    SOAP Generated
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
