import React, { useState, useEffect } from 'react';
import { chatApi } from '../../api/chat.api';
import { Link } from 'react-router-dom';
import { socketService } from '../../lib/socket/socket.service';
import { useAuthStore } from '../../lib/stores/auth.store';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';
import { Chat } from '../../lib/types/api';

export const ChatListPage: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChatParticipantId, setNewChatParticipantId] = useState('');
  const [newChatTopic, setNewChatTopic] = useState('');
  const [creating, setCreating] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { user } = useAuthStore();

  useEffect(() => {
    loadChats();

    // Connect to socket for presence updates
    const socket = socketService.connect();

    // Listen for presence events
    const handleUserOnline = (data: { userId: string; isOnline?: boolean }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (data.isOnline === false) {
          next.delete(data.userId);
        } else {
          next.add(data.userId);
        }
        return next;
      });
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
    if (!chat.participants || !user) return null;
    return chat.participants.find(p => p.userId !== user.id);
  };

  const isParticipantOnline = (userId: string) => {
    return onlineUsers.has(userId) || socketService.isUserOnline(userId);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
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
    <div className="p-6 max-w-4xl mx-auto animate-fade-in min-h-full">
      {/* Gradient header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl flex items-center justify-center shadow-glow-blue">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold gradient-text">Chats</h1>
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-1">No conversations yet</p>
          <p className="text-sm text-gray-400 mb-6">Start chatting with a participant</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-5 py-2.5"
          >
            Start a Chat
          </button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {chats.map((chat) => {
            const otherParticipant = getOtherParticipant(chat);
            const isOnline = otherParticipant ? isParticipantOnline(otherParticipant.userId) : false;

            return (
              <Link
                key={chat.id}
                to={`/chat/${chat.id}`}
                className="block card-interactive p-5 animate-slide-in-up"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {chat.topic || (otherParticipant?.user
                          ? `${otherParticipant.user.firstname} ${otherParticipant.user.lastname}`
                          : 'Chat')}
                      </h3>
                      {isOnline && (
                        <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                          <span className="status-dot status-dot-online"></span>
                          Online
                        </span>
                      )}
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-semibold rounded-full shadow-sm">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {chat.lastMessage.content}
                      </p>
                    )}
                    {otherParticipant?.user && (
                      <p className="text-xs text-gray-400 mt-1">
                        {otherParticipant.user.email}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-400">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </span>
                    {chat.closedAt && (
                      <p className="mt-1"><span className="badge badge-red">Closed</span></p>
                    )}
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
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => {
            if (!creating) {
              setShowCreateModal(false);
              setNewChatParticipantId('');
              setNewChatTopic('');
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6 max-w-md w-full mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-5">Create New Chat</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Participant ID (User ID)
                </label>
                <input
                  type="text"
                  value={newChatParticipantId}
                  onChange={(e) => setNewChatParticipantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-sm input-focus"
                  placeholder="Enter user ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Topic (Optional)
                </label>
                <input
                  type="text"
                  value={newChatTopic}
                  onChange={(e) => setNewChatTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-sm input-focus"
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
