import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowDown,
  Send,
  Pencil,
  Trash2,
  Check,
  X,
  CheckCheck,
  Wifi,
  WifiOff,
  MessageSquare,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { chatApi } from '../../api';
import { socketService } from '../../lib/socket/socket.service';
import { useAuthStore } from '../../lib/stores/auth.store';
import { Chat, ChatParticipant, Message } from '../../lib/types/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';
import { getMessageDirection } from '../../lib/text-direction';
import { UserAvatar } from '../../components/UserAvatar';

interface TypingUser {
  userId: string;
  name?: string;
}

export const ChatRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<Chat | null>(null);
  // Presence changes seen since the chat was fetched
  const [presence, setPresence] = useState<Map<string, boolean>>(new Map());
  const [socketConnected, setSocketConnected] = useState(socketService.isConnected());
  const [isAtBottom, setIsAtBottom] = useState(true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingStateRef = useRef<boolean>(false);
  const deliveryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const loadChatAndMessages = useCallback(async (isCancelled: () => boolean) => {
    if (!id) return;

    try {
      const [chatData, messagesData] = await Promise.all([
        chatApi.getById(id),
        chatApi.getMessages(id, { limit: 100 })
      ]);
      if (isCancelled()) return;

      setChatInfo(chatData);
      // Keep what arrived over the socket while the history was loading.
      const history = messagesData.messages || [];
      const loaded = new Set(history.map(m => String(m.id)));
      setMessages(prev => [
        ...history,
        ...prev.filter(m => m.chatId === id && !loaded.has(String(m.id))),
      ]);
    } catch (error: unknown) {
      if (!isCancelled()) {
        toast.error(getErrorMessage(error, 'Failed to load chat'));
      }
    } finally {
      if (!isCancelled()) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setChatInfo(null);
    setTypingUsers([]);
    setPresence(new Map());
    setEditingMessageId(null);
    setEditContent('');
    setConfirmDeleteId(null);

    void loadChatAndMessages(() => cancelled);

    const socket = socketService.connect();

    // Join the chat room
    socketService.joinRoom(id);

    // Listen for incoming messages
    const handleNewMessage = (data: { message: Message }) => {
      if (cancelled) return;
      if (data?.message?.chatId === id) {
        let matchedTempId: string | null = null;
        setMessages(prev => {
          if (prev.some(m => String(m.id) === String(data.message.id))) {
            return prev;
          }
          // Replace optimistic message from same sender with real one
          if (data.message.senderId === user?.id) {
            const optimisticIdx = prev.findIndex(m =>
              String(m.id).startsWith('temp-') && m.senderId === user?.id && m.content === data.message.content
            );
            if (optimisticIdx !== -1) {
              matchedTempId = String(prev[optimisticIdx].id);
              const updated = [...prev];
              updated[optimisticIdx] = data.message;
              return updated;
            }
          }
          return [...prev, data.message];
        });

        if (matchedTempId) {
          const timer = deliveryTimeoutsRef.current.get(matchedTempId);
          if (timer) {
            clearTimeout(timer);
            deliveryTimeoutsRef.current.delete(matchedTempId);
          }
        }

        if (data.message.senderId !== user?.id) {
          socketService.markAsRead(id, String(data.message.id));
        }
      }
    };

    // Listen for typing indicators
    const handleTyping = (data: { chatId?: string; userId: string; isTyping: boolean; firstname?: string }) => {
      if (cancelled) return;
      if (data.chatId && data.chatId !== id) return;
      if (data.userId !== user?.id) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            if (!prev.some(u => u.userId === data.userId)) {
              return [...prev, { userId: data.userId, name: data.firstname }];
            }
          } else {
            return prev.filter(u => u.userId !== data.userId);
          }
          return prev;
        });
      }
    };

    // Listen for read receipts
    const handleRead = (data: { chatId: string; messageId: string; userId: string }) => {
      if (cancelled) return;
      if (data.chatId === id) {
        setMessages(prev => prev.map(msg => {
          if (String(msg.id) === String(data.messageId)) {
            const readBy = msg.readBy || [];
            if (!readBy.some(r => r.userId === data.userId)) {
              return {
                ...msg,
                readBy: [...readBy, { userId: data.userId, readAt: new Date().toISOString() }]
              };
            }
          }
          return msg;
        }));
      }
    };

    // Listen for message edits
    const handleEdited = (data: { message: Message }) => {
      if (cancelled) return;
      if (data?.message?.chatId === id) {
        setMessages(prev => prev.map(msg =>
          String(msg.id) === String(data.message.id)
            ? { ...msg, ...data.message }
            : msg
        ));
      }
    };

    // Listen for message deletes
    const handleDeleted = (data: { message: Message }) => {
      if (cancelled) return;
      if (data?.message?.chatId === id) {
        setMessages(prev => prev.map(msg =>
          String(msg.id) === String(data.message.id)
            ? { ...msg, ...data.message }
            : msg
        ));
      }
    };

    // Listen for presence events
    const handleUserOnline = (data: { userId: string; isOnline?: boolean }) => {
      if (cancelled) return;
      setPresence(prev => new Map(prev).set(data.userId, data.isOnline !== false));
    };

    const handleChatError = (data: { event?: string; message?: string }) => {
      if (cancelled) return;
      toast.error(data?.message || 'Chat action failed');
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:read', handleRead);
    socket.on('chat:edited', handleEdited);
    socket.on('chat:deleted', handleDeleted);
    socket.on('user:online', handleUserOnline);
    socket.on('chat:error', handleChatError);

    const unsubStatus = socketService.onStatusChange((status) => {
      if (!cancelled) setSocketConnected(status.connected);
    });

    const deliveryTimeouts = deliveryTimeoutsRef.current;
    return () => {
      cancelled = true;
      socketService.leaveRoom(id);
      unsubStatus();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      for (const timer of deliveryTimeouts.values()) {
        clearTimeout(timer);
      }
      deliveryTimeouts.clear();

      socket.off('chat:message', handleNewMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:read', handleRead);
      socket.off('chat:edited', handleEdited);
      socket.off('chat:deleted', handleDeleted);
      socket.off('user:online', handleUserOnline);
      socket.off('chat:error', handleChatError);
    };
  }, [id, user?.id, loadChatAndMessages]);

  const handleTyping = (isTyping: boolean) => {
    if (!id) return;

    // Only send if state changed
    if (lastTypingStateRef.current !== isTyping) {
      socketService.sendTyping(id, isTyping);
      lastTypingStateRef.current = isTyping;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendTyping(id, false);
        lastTypingStateRef.current = false;
      }, 3000);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    handleTyping(value.length > 0);
  };

  const handleSend = async () => {
    if (!content.trim() || !id || !user || chatInfo?.closedAt) return;

    const trimmed = content.trim();
    handleTyping(false);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chatId: id,
      senderId: user.id,
      sender: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        avatar: user.avatar,
        role: user.role,
      },
      content: trimmed,
      type: 'TEXT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setContent('');

    if (!socketService.isConnected()) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error('Not connected — message not sent');
      setContent(trimmed);
      return;
    }

    socketService.sendMessage(id, trimmed);

    // Remove optimistic message if server never confirms within 10s
    const timer = setTimeout(() => {
      deliveryTimeoutsRef.current.delete(tempId);
      let wasUnconfirmed = false;
      setMessages(prev => {
        if (!prev.some(m => m.id === tempId)) return prev;
        wasUnconfirmed = true;
        return prev.filter(m => m.id !== tempId);
      });
      if (wasUnconfirmed) {
        toast.error('Message may not have been delivered');
      }
    }, 10000);
    deliveryTimeoutsRef.current.set(tempId, timer);
  };

  const handleEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !id || editingMessageId === null) return;
    if (!socketService.isConnected()) {
      toast.error('Not connected — message not edited');
      return;
    }

    try {
      socketService.editMessage(id, editingMessageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to edit message'));
    }
  };

  const handleDelete = (messageId: string) => {
    if (!id) return;
    if (!socketService.isConnected()) {
      toast.error('Not connected — message not deleted');
      return;
    }

    try {
      socketService.deleteMessage(id, messageId);
      setConfirmDeleteId(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete message'));
    }
  };

  const scrollToBottom = () => {
    virtuosoRef.current?.scrollToIndex({
      index: Math.max(0, flatItems.length - 1),
      align: 'end',
      behavior: 'smooth',
    });
  };

  const getOtherParticipant = () => {
    if (!user) return null;
    if (chatInfo?.consultation) {
      if (user.role === 'PATIENT' && chatInfo.consultation.doctor?.user) {
        const docParticipant = chatInfo.participants?.find(
          (p) => p.id === chatInfo.consultation?.doctor?.userId,
        );
        return (
          docParticipant || {
            ...chatInfo.consultation.doctor.user,
            role: 'DOCTOR' as const,
            joinedAt: chatInfo.createdAt,
          }
        );
      }
      if (
        (user.role === 'DOCTOR' || user.role === 'NURSE') &&
        chatInfo.consultation.patient
      ) {
        const patientParticipant = chatInfo.participants?.find(
          (p) => p.id === chatInfo.consultation?.patientId,
        );
        return (
          patientParticipant || {
            ...chatInfo.consultation.patient,
            role: 'PATIENT' as const,
            joinedAt: chatInfo.createdAt,
          }
        );
      }
    }
    if (!chatInfo?.participants) return null;
    return chatInfo.participants.find((p) => p.id !== user.id);
  };

  const isParticipantOnline = (participant: ChatParticipant) => {
    return presence.get(participant.id) ?? (participant.isOnline === true || socketService.isUserOnline(participant.id));
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    const msgDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return msgDate.toLocaleDateString();
    }
  };

  type FlatItem = { type: 'date'; label: string } | { type: 'message'; message: Message };

  const flatItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const dateKey = formatDate(msg.createdAt);
      if (dateKey !== lastDate) {
        items.push({ type: 'date', label: dateKey });
        lastDate = dateKey;
      }
      items.push({ type: 'message', message: msg });
    }
    return items;
  }, [messages]);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-gray-50 dark:bg-slate-900 animate-fade-in">
        {/* Shimmer header */}
        <div className="glass border-b border-gray-200/60 dark:border-slate-700/60 px-4 sm:px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <div className="shimmer h-9 w-9 rounded-xl" />
          <div className="shimmer h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <div className="shimmer h-4 w-36 rounded" />
            <div className="shimmer h-3 w-20 rounded" />
          </div>
        </div>
        {/* Shimmer messages */}
        <div className="flex-1 min-h-0 px-6 py-6 space-y-5 overflow-hidden bg-mesh">
          <div className="flex justify-start"><div className="shimmer h-12 w-52 rounded-2xl" /></div>
          <div className="flex justify-end"><div className="shimmer h-12 w-64 rounded-2xl" /></div>
          <div className="flex justify-start"><div className="shimmer h-16 w-48 rounded-2xl" /></div>
          <div className="flex justify-end"><div className="shimmer h-12 w-56 rounded-2xl" /></div>
          <div className="flex justify-start"><div className="shimmer h-12 w-44 rounded-2xl" /></div>
        </div>
        {/* Shimmer input */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200/60 dark:border-slate-700/60 flex-shrink-0">
          <div className="shimmer h-12 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant();
  const isOnline = otherParticipant ? isParticipantOnline(otherParticipant) : false;
  const isClosed = Boolean(chatInfo?.closedAt);
  const chatListPath =
    user?.role === 'DOCTOR' ? '/doctor/chat' : user?.role === 'NURSE' ? '/nurse/chat' : '/chat';

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-gray-50 dark:bg-slate-900 animate-fade-in">
      {/* Header */}
      <div className="glass border-b border-gray-200/60 dark:border-slate-700/60 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 flex-shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(chatListPath)}
            className="btn-press p-2 -ml-1 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-slate-800/80 transition-all duration-200 flex items-center gap-1.5 text-sm font-medium"
            aria-label="Back to chats"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          {otherParticipant && (
            <div className="relative flex-shrink-0">
              <UserAvatar
                avatar={otherParticipant.avatar}
                firstname={otherParticipant.firstname}
                lastname={otherParticipant.lastname}
                alt={`${otherParticipant.firstname} ${otherParticipant.lastname}`}
                className={`w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-500 rounded-full text-sm font-bold text-white flex-shrink-0 shadow-sm ${
                  isOnline ? 'ring-2 ring-emerald-400/70 ring-offset-2 dark:ring-offset-slate-900' : 'ring-2 ring-white dark:ring-slate-800'
                }`}
              />
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
              )}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                {chatInfo?.topic || (otherParticipant
                  ? `${otherParticipant.firstname} ${otherParticipant.lastname}`
                  : 'Chat')}
              </h1>
              {user?.role === 'NURSE' && chatInfo?.consultation?.doctor?.user && (
                <span className="badge badge-purple text-[11px]">
                  Dr. {chatInfo.consultation.doctor.user.lastname}'s team
                </span>
              )}
              {chatInfo?.consultationId && (
                <Link
                  to={`/consultation/${chatInfo.consultationId}`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-brand-50 dark:bg-brand-950/50 text-xs font-medium text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
                >
                  View Consultation
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
            {isOnline && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium mt-0.5">
                <span className="status-dot status-dot-online"></span>
                Online
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {socketConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Connected</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200/70 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400 font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Disconnected</span>
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative bg-mesh">
        <div className="flex-1 min-h-0 relative">
          {flatItems.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-gray-200/60 dark:border-slate-700/60 shadow-soft flex items-center justify-center mb-4 animate-float">
                <MessageSquare className="w-7 h-7 text-brand-500 dark:text-brand-400" />
              </div>
              <p className="text-base font-semibold text-gray-800 dark:text-slate-200">No messages yet</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-xs">
                Send a message below to start the conversation.
              </p>
            </div>
          )}

          <Virtuoso
            ref={virtuosoRef}
            data={flatItems}
            followOutput="smooth"
            initialTopMostItemIndex={Math.max(0, flatItems.length - 1)}
            atBottomStateChange={(atBottom) => setIsAtBottom(atBottom)}
            style={{ height: '100%' }}
            className="h-full custom-scrollbar px-4 sm:px-6 py-4"
            itemContent={(_index, item) => {
              if (item.type === 'date') {
                return (
                  <div className="flex items-center gap-3 my-4 max-w-4xl mx-auto">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-200/80 dark:to-slate-700/80" />
                    <span className="px-3.5 py-1 bg-white/90 dark:bg-slate-800/90 border border-gray-200/60 dark:border-slate-700/60 text-brand-700 dark:text-brand-300 text-xs font-semibold rounded-full shadow-sm backdrop-blur-sm">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-200/80 dark:to-slate-700/80" />
                  </div>
                );
              }

              const msg = item.message;
              const isOwn = msg.senderId === user?.id;
              const isEditing = editingMessageId === msg.id;
              const isConfirmingDelete = confirmDeleteId === String(msg.id);
              const isDeleted = !!msg.deletedAt;
              const senderInfo =
                msg.sender || chatInfo?.participants?.find((p) => p.id === msg.senderId);
              const consultationDoctorLastname = chatInfo?.consultation?.doctor?.user?.lastname;
              const isSharedConsultationChat =
                Boolean(chatInfo?.consultationId) || (chatInfo?.participants?.length ?? 0) > 2;
              const showSenderHeader =
                !isOwn && (senderInfo?.role === 'NURSE' || isSharedConsultationChat);
              const direction = getMessageDirection(msg.content);

              return (
                <div className={`group flex mb-3.5 max-w-4xl mx-auto animate-msg-in ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {showSenderHeader && senderInfo && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          {senderInfo.role === 'DOCTOR' ? 'Dr. ' : ''}
                          {senderInfo.firstname} {senderInfo.lastname}
                        </span>
                        {senderInfo.role === 'NURSE' && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/50">
                            {consultationDoctorLastname
                              ? `Nurse · Dr. ${consultationDoctorLastname}'s team`
                              : 'Nurse'}
                          </span>
                        )}
                        {senderInfo.role === 'DOCTOR' && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">
                            Doctor
                          </span>
                        )}
                      </div>
                    )}
                    {isEditing ? (
                      <div className="w-full min-w-[260px] bg-white dark:bg-slate-800 p-3 rounded-2xl border border-brand-200 dark:border-brand-700 shadow-soft animate-scale-in">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 text-sm border input-focus mb-2"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') {
                              setEditingMessageId(null);
                              setEditContent('');
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingMessageId(null);
                              setEditContent('');
                            }}
                            className="btn-secondary px-3 py-1 text-xs inline-flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="btn-primary px-3 py-1 text-xs inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          dir={direction}
                          className={`px-4 py-2.5 text-start ${
                            isOwn
                              ? 'bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-2xl rounded-br-sm shadow-soft shadow-brand-500/15'
                              : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 border border-gray-100 dark:border-slate-700/70 shadow-soft rounded-2xl rounded-bl-sm'
                          } ${isDeleted ? 'opacity-50 italic' : ''} transition-all duration-200 ease-spring`}
                        >
                          <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                          {msg.editedAt && !isDeleted && (
                            <p className={`text-[11px] mt-1 ${isOwn ? 'text-white/75' : 'text-gray-400 dark:text-slate-500'}`}>(edited)</p>
                          )}
                        </div>

                        <div className={`flex items-center gap-2 mt-1 px-1 text-[11px] text-gray-400 dark:text-slate-500 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          <span>{formatTime(msg.createdAt)}</span>

                          {isOwn && msg.readBy && msg.readBy.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-brand-500 dark:text-brand-400 font-medium">
                              <CheckCheck className="w-3.5 h-3.5" />
                              Read
                            </span>
                          )}

                          {isOwn && !isDeleted && (
                            <div className={`flex items-center gap-1.5 transition-opacity duration-200 ${isConfirmingDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
                              {isConfirmingDelete ? (
                                <>
                                  <button
                                    onClick={() => handleDelete(String(msg.id))}
                                    className="px-2 py-0.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors btn-press text-[11px] font-medium"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-[11px]"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(msg)}
                                    className="p-1 rounded-lg text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors btn-press"
                                    title="Edit message"
                                    aria-label="Edit message"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(String(msg.id))}
                                    className="p-1 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors btn-press"
                                    title="Delete message"
                                    aria-label="Delete message"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            }}
          />

          {/* Scroll to bottom button */}
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
            className={`absolute bottom-4 right-5 w-9 h-9 bg-white/95 dark:bg-slate-800/95 backdrop-blur border border-gray-200 dark:border-slate-600 rounded-full shadow-elevation-2 flex items-center justify-center hover:shadow-elevation-3 hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 ease-spring z-10 ${
              !isAtBottom && flatItems.length > 0
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-75 pointer-events-none'
            }`}
          >
            <ArrowDown className="w-4 h-4 text-gray-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex-shrink-0 flex justify-start px-4 sm:px-6 pb-2.5 pt-1 animate-msg-in">
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/70 shadow-soft rounded-2xl rounded-bl-sm px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400 inline-block"></span>
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-500 inline-block"></span>
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>
                </div>
                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  {typingUsers.map(u => u.name || 'Someone').join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="glass border-t border-gray-200/60 dark:border-slate-700/60 px-4 sm:px-6 py-3.5 flex-shrink-0">
        {isClosed ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-slate-400 py-1.5">
            <Lock className="w-4 h-4" />
            <span>This conversation has been closed.</span>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-2xl p-1.5 pl-4 shadow-soft focus-within:border-brand-400 dark:focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 dark:focus-within:ring-brand-900/30 transition-all duration-200">
            <input
              type="text"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1 bg-transparent py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none"
              placeholder="Type a message..."
            />
            <button
              onClick={handleSend}
              disabled={!content.trim()}
              className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
