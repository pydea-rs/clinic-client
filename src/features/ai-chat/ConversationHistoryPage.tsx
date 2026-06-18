import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiAgentsApi } from '../../api/ai-agents.api';
import { Bot, FileText, Plus, ChevronRight, Loader2, MessageCircle, Pencil, Check, X } from 'lucide-react';

export const ConversationHistoryPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['ai-conversations', page],
    queryFn: () => aiAgentsApi.listConversations({ skip: page * limit, take: limit }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, topic }: { id: string; topic: string }) =>
      aiAgentsApi.renameConversation(id, topic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      setEditingId(null);
    },
  });

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEditing = (id: string, currentTopic: string | null, createdAt: string) => {
    setEditingId(id);
    setEditValue(currentTopic || `Conversation on ${new Date(createdAt).toLocaleDateString()}`);
  };

  const submitRename = () => {
    if (!editingId || !editValue.trim()) return;
    renameMutation.mutate({ id: editingId, topic: editValue.trim() });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitRename();
    if (e.key === 'Escape') cancelEditing();
  };

  const conversations = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Chat History</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} conversation{total !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/ai/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors btn-press"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-7 h-7 text-gray-300" />
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">No conversations yet</h3>
          <p className="text-sm text-gray-400 mb-4">Start chatting with the AI assistant.</p>
          <Link to="/ai/new" className="text-sm text-blue-600 hover:underline font-medium">
            Start your first conversation
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {conversations.map((conv) => {
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <Link
                    to={`/ai/${conv.id}`}
                    className="w-9 h-9 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0"
                  >
                    <Bot className="w-4 h-4 text-blue-600" />
                  </Link>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          maxLength={120}
                          className="flex-1 text-sm font-medium text-gray-900 bg-white border border-blue-300 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500/20"
                          disabled={renameMutation.isPending}
                        />
                        <button
                          onClick={submitRename}
                          disabled={renameMutation.isPending || !editValue.trim()}
                          className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-40"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={renameMutation.isPending}
                          className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Link to={`/ai/${conv.id}`} className="block">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conv.topic || `Conversation on ${new Date(conv.createdAt).toLocaleDateString()}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(conv.createdAt).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </Link>
                    )}
                  </div>

                  {!isEditing && (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          startEditing(conv.id, conv.topic, conv.createdAt);
                        }}
                        className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-md opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                        title="Rename"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {conv.soap && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs font-medium flex-shrink-0">
                          <FileText className="w-3 h-3" />
                          SOAP
                        </span>
                      )}
                      <Link to={`/ai/${conv.id}`} className="flex-shrink-0">
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                      </Link>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
