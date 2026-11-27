import React, { useState, useEffect } from 'react';
import { chatApi } from '../../api';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, ChevronRight, X } from 'lucide-react';
import { socketService } from '../../lib/socket/socket.service';
import { useAuthStore } from '../../lib/stores/auth.store';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';
import { Chat, ChatParticipant } from '../../lib/types/api';
import { UserAvatar } from '../../components/UserAvatar';

export const ChatListPage: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChatParticipantId, setNewChatParticipantId] = useState('');
  const [newChatTopic, setNewChatTopic] = useState('');
  const [creating, setCreating] = useState(false);
  // Presence changes seen since the list was fetched
  const [presence, setPresence] = useState<Map<string, boolean>>(new Map());
  const { user } = useAuthStore();

  useEffect(() => {
    loadChats();

    // Connect to socket for presence updates
    const socket = socketService.connect();

    // Listen for presence events
    const handleUserOnline = (data: { userId: string; isOnline?: boolean }) => {
      setPresence(prev => new Map(prev).set(data.userId, data.isOnline !== false));
    };

    socket.on('user:online', handleUserOnline);

    return () => {
      socket.off('user:online', handleUserOnline);
    };
  }, []);

  const loadChats = async () => {
    try {
      const data = await chatApi.list();
      setChats(data?.chats || []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load chats'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async () => {
    if (!newChatParticipantId.trim()) {
      toast.error('Please enter a participant ID');
      return;
    }

    setCreating(true);
    try {
      await chatApi.create({
        participantId: newChatParticipantId,
        topic: newChatTopic || undefined,
      });
      toast.success('Chat created successfully');
      setShowCreateModal(false);
      setNewChatParticipantId('');
      setNewChatTopic('');
      await loadChats();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create chat'));
    } finally {
      setCreating(false);
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    if (!user) return null;
    if (chat.consultation) {
      if (user.role === 'PATIENT' && chat.consultation.doctor?.user) {
        return {
          ...chat.consultation.doctor.user,
          role: 'DOCTOR' as const,
          joinedAt: chat.createdAt,
        };
      }
      if ((user.role === 'DOCTOR' || user.role === 'NURSE') && chat.consultation.patient) {
        return {
          ...chat.consultation.patient,
          role: 'PATIENT' as const,
          joinedAt: chat.createdAt,
        };
      }
    }
    if (!chat.participants) return null;
    return chat.participants.find(p => p.id !== user.id);
  };

  const isParticipantOnline = (participant: ChatParticipant) => {
    return presence.get(participant.id) ?? (participant.isOnline === true || socketService.isUserOnline(participant.id));
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-fade-in">
        {/* Shimmer header */}
        <div className="flex items-center justify-between mb-8">
          <div className="shimmer h-8 w-40 rounded-lg"></div>
          <div className="shimmer h-10 w-28 rounded-xl"></div>
        </div>
        {/* Shimmer chat cards */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-3">
                  <div className="shimmer h-5 w-48 rounded"></div>
                  <div className="shimmer h-4 w-64 rounded"></div>
                  <div className="shimmer h-3 w-36 rounded"></div>
                </div>
                <div className="shimmer h-4 w-20 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Gradient header */}
      <div className="flex items-center justify-between gap-3 mb-8 animate-slide-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl flex items-center justify-center shadow-glow-blue">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Chats</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">Your direct & consultation conversations</p>
          </div>
        </div>
        {chats.length > 0 && (
          <span className="badge badge-brand">
            {chats.length} conversation{chats.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {chats.length === 0 ? (
        <div className="card text-center py-16 px-6 animate-scale-in">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float">
            <MessageSquare className="w-8 h-8 text-brand-500 dark:text-brand-400" />
          </div>
          <p className="text-gray-700 dark:text-slate-200 font-semibold mb-1">No conversations yet</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mb-6">Start chatting with a participant</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-5 py-2.5 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Start a Chat
          </button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {chats.map((chat) => {
            const otherParticipant = getOtherParticipant(chat);
            const isOnline = otherParticipant ? isParticipantOnline(otherParticipant) : false;
            const participantName = otherParticipant
              ? `${otherParticipant.firstname} ${otherParticipant.lastname}`
              : 'Chat';
            const initials = otherParticipant
              ? `${otherParticipant.firstname?.[0] || ''}${otherParticipant.lastname?.[0] || ''}`.toUpperCase()
              : 'CH';

            return (
              <Link
                key={chat.id}
                to={`/chat/${chat.id}`}
                className="block card-interactive card-shine p-5 animate-slide-in-up group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <UserAvatar
                        avatar={otherParticipant?.avatar}
                        firstname={otherParticipant?.firstname}
                        lastname={otherParticipant?.lastname}
                        alt={participantName}
                        fallback={<span className="text-sm font-bold text-white">{initials}</span>}
                        className={`w-11 h-11 bg-gradient-to-br from-brand-500 to-purple-500 rounded-full transition-transform duration-300 group-hover:scale-105 ${
                          isOnline ? 'ring-2 ring-emerald-400/60 ring-offset-2 dark:ring-offset-slate-800' : ''
                        }`}
                      />
                      {isOnline && (
                        <>
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full animate-pulse-ring" />
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full" />
                        </>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                          {chat.topic || (otherParticipant
                            ? `${otherParticipant.firstname} ${otherParticipant.lastname}`
                            : 'Chat')}
                        </h3>
                        {isOnline && (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <span className="status-dot status-dot-online"></span>
                            Online
                          </span>
                        )}
                        {(chat.unreadCount ?? 0) > 0 && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-semibold rounded-full shadow-sm animate-pop-in">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 truncate">
                          {chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </span>
                      {chat.closedAt && (
                        <p className="mt-1"><span className="badge badge-red">Closed</span></p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-brand-500 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Chat Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => {
            if (!creating) {
              setShowCreateModal(false);
              setNewChatParticipantId('');
              setNewChatTopic('');
            }
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-slate-700/60 p-6 max-w-md w-full mx-4 animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create New Chat</h2>
              <button
                type="button"
                onClick={() => {
                  if (!creating) {
                    setShowCreateModal(false);
                    setNewChatParticipantId('');
                    setNewChatTopic('');
                  }
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Participant ID (User ID)
                </label>
                <input
                  type="text"
                  value={newChatParticipantId}
                  onChange={(e) => setNewChatParticipantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white input-focus"
                  placeholder="Enter user ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Topic (Optional)
                </label>
                <input
                  type="text"
                  value={newChatTopic}
                  onChange={(e) => setNewChatTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white input-focus"
                  placeholder="Enter chat topic"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewChatParticipantId('');
                  setNewChatTopic('');
                }}
                className="flex-1 btn-secondary px-4 py-2.5"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChat}
                disabled={creating || !newChatParticipantId.trim()}
                className="flex-1 btn-primary px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
