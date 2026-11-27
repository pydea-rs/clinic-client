import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { chatApi } from '../../api';
import { socketService } from '../../lib/socket/socket.service';
import { useAuthStore } from '../../lib/stores/auth.store';
import { Chat, ChatParticipant } from '../../lib/types/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';
import { UserAvatar } from '../../components/UserAvatar';
import { MessageSquare, Search, ChevronRight, Users } from 'lucide-react';

type FilterTab = 'all' | 'active';

export const DoctorChatPage: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  // Presence changes seen since the list was fetched
  const [presence, setPresence] = useState<Map<string, boolean>>(new Map());
  const { user } = useAuthStore();

  useEffect(() => {
    loadChats();

    const socket = socketService.connect();

    const handleUserOnline = (data: { userId: string; isOnline?: boolean }) => {
      setPresence((prev) => new Map(prev).set(data.userId, data.isOnline !== false));
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

  const getOtherParticipant = (chat: Chat) => {
    if (!user) return null;
    if (chat.consultation?.patient) {
      return {
        ...chat.consultation.patient,
        role: 'PATIENT' as const,
        joinedAt: chat.createdAt,
      };
    }
    if (!chat.participants) return null;
    return chat.participants.find((p) => p.id !== user.id);
  };

  const isParticipantOnline = (participant: ChatParticipant) => {
    return presence.get(participant.id) ?? (participant.isOnline === true || socketService.isUserOnline(participant.id));
  };

  // Filtering
  const filteredChats = chats.filter((chat) => {
    // Tab filter
    if (filterTab === 'active' && chat.closedAt) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const other = getOtherParticipant(chat);
      const participantName = other
        ? `${other.firstname} ${other.lastname}`.toLowerCase()
        : '';
      const topic = (chat.topic || '').toLowerCase();
      if (!participantName.includes(query) && !topic.includes(query)) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-fade-in">
        {/* Shimmer header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="shimmer h-10 w-10 rounded-xl" />
          <div className="shimmer h-8 w-52 rounded-lg" />
        </div>
        {/* Shimmer search */}
        <div className="shimmer h-10 w-full rounded-xl mb-6" />
        {/* Shimmer cards */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-4">
                <div className="shimmer h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-5 w-40 rounded" />
                  <div className="shimmer h-4 w-64 rounded" />
                </div>
                <div className="shimmer h-4 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 animate-slide-in-up">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-soft">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Patient Chats</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Communicate with your patients</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 mb-6 animate-slide-in-up">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or topic..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white input-focus"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                filterTab === 'all'
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                filterTab === 'active'
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              Active
            </button>
          </div>
        </div>
      </div>

      {/* Chat List */}
      {filteredChats.length === 0 ? (
        <div className="card text-center py-16 px-6 animate-scale-in">
          <div className="w-16 h-16 bg-teal-50 dark:bg-teal-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float">
            <MessageSquare className="w-8 h-8 text-teal-400" />
          </div>
          <p className="text-gray-700 dark:text-slate-200 font-medium mb-1">
            {searchQuery ? 'No chats match your search' : 'No conversations yet'}
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {searchQuery
              ? 'Try a different search term.'
              : 'Chats will appear here when patients connect with you.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filteredChats.map((chat, index) => {
            const otherParticipant = getOtherParticipant(chat);
            const isOnline = otherParticipant ? isParticipantOnline(otherParticipant) : false;
            const displayName = otherParticipant
              ? `${otherParticipant.firstname} ${otherParticipant.lastname}`
              : chat.topic || 'Chat';
            const initials = otherParticipant
              ? `${otherParticipant.firstname[0] || ''}${otherParticipant.lastname[0] || ''}`.toUpperCase()
              : 'CH';

            return (
              <Link
                key={chat.id}
                to={`/chat/${chat.id}`}
                className="block card-interactive card-shine p-5 animate-slide-in-up group"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <UserAvatar
                      avatar={otherParticipant?.avatar}
                      firstname={otherParticipant?.firstname}
                      lastname={otherParticipant?.lastname}
                      alt={displayName}
                      fallback={<span className="text-sm font-bold text-white">{initials}</span>}
                      className={`w-12 h-12 bg-gradient-to-br from-brand-500 to-purple-500 rounded-full transition-transform duration-300 group-hover:scale-105 ${
                        isOnline ? 'ring-2 ring-emerald-400/60 ring-offset-2 dark:ring-offset-slate-800' : ''
                      }`}
                    />
                    {isOnline && (
                      <>
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full animate-pulse-ring" />
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full" />
                      </>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">{displayName}</h3>
                      {isOnline && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                      )}
                      {(chat.unreadCount ?? 0) > 0 && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-semibold rounded-full shadow-sm animate-pop-in">
                          {chat.unreadCount}
                        </span>
                      )}
                      {chat.closedAt && (
                        <span className="badge badge-red">Closed</span>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                        {chat.lastMessage.content}
                      </p>
                    )}
                    {chat.topic && otherParticipant && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{chat.topic}</p>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {chats.length > 0 && (
        <div className="mt-6 text-center animate-fade-in">
          <p className="text-sm text-gray-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {filteredChats.length} conversation{filteredChats.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
      )}
    </div>
  );
};
