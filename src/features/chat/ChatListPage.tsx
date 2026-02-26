import React, { useState, useEffect } from 'react';
import { chatApi } from '../../api/chat.api';
import { Link } from 'react-router-dom';
import { socketService } from '../../lib/socket/socket.service';
import { useAuthStore } from '../../lib/stores/auth.store';
import toast from 'react-hot-toast';

interface ChatWithParticipants {
  id: string;
  topic?: string;
  consultationId?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  participants?: Array<{
    userId: string;
    user?: {
      id: string;
      firstname: string;
      lastname: string;
      email: string;
    };
    joinedAt: string;
    lastSeenAt?: string;
  }>;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount?: number;
}

export const ChatListPage: React.FC = () => {
  const [chats, setChats] = useState<ChatWithParticipants[]>([]);
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
    const handleUserOnline = (data: { userId: string }) => {
      setOnlineUsers(prev => new Set(prev).add(data.userId));
    };
    
    const handleUserOffline = (data: { userId: string }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };
    
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    
    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, []);

  const loadChats = async () => {
    try {
      const data = await chatApi.list();
      setChats(data || []);
    } catch (error: any) {
      console.error('Failed to load chats:', error);
      toast.error(error.message || 'Failed to load chats');
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
      const newChat = await chatApi.create({
        participantId: newChatParticipantId,
        topic: newChatTopic || undefined,
      });
      toast.success('Chat created successfully');
      setShowCreateModal(false);
      setNewChatParticipantId('');
      setNewChatTopic('');
      await loadChats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  const getOtherParticipant = (chat: ChatWithParticipants) => {
    if (!chat.participants || !user) return null;
    return chat.participants.find(p => p.userId !== user.id);
  };

  const isParticipantOnline = (userId: string) => {
    return onlineUsers.has(userId) || socketService.isUserOnline(userId);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chats</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          New Chat
        </button>
      </div>
      
      {chats.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No chats yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start a Chat
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {chats.map((chat) => {
            const otherParticipant = getOtherParticipant(chat);
            const isOnline = otherParticipant ? isParticipantOnline(otherParticipant.userId) : false;
            
            return (
              <Link
                key={chat.id}
                to={`/chat/${chat.id}`}
                className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {chat.topic || (otherParticipant?.user 
                          ? `${otherParticipant.user.firstname} ${otherParticipant.user.lastname}`
                          : 'Chat')}
                      </h3>
                      {isOnline && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                          Online
                        </span>
                      )}
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
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
                      <p className="text-xs text-red-500 mt-1">Closed</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Create New Chat</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participant ID (User ID)
                </label>
                <input
                  type="text"
                  value={newChatParticipantId}
                  onChange={(e) => setNewChatParticipantId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter user ID"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic (Optional)
                </label>
                <input
                  type="text"
                  value={newChatTopic}
                  onChange={(e) => setNewChatTopic(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter chat topic"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewChatParticipantId('');
                  setNewChatTopic('');
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChat}
                disabled={creating || !newChatParticipantId.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
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
