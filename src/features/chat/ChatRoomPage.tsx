import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  const [chatInfo, setChatInfo] = useState<Chat | null>(null);
  // Presence changes seen since the chat was fetched
  const [presence, setPresence] = useState<Map<string, boolean>>(new Map());
  const [socketConnected, setSocketConnected] = useState(socketService.isConnected());
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

  const handleDelete = async (messageId: string) => {
    if (!id || !confirm('Are you sure you want to delete this message?')) return;
    if (!socketService.isConnected()) {
      toast.error('Not connected — message not deleted');
      return;
    }

    try {
      socketService.deleteMessage(id, messageId);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete message'));
    }
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
      <div className="flex flex-col h-full bg-gray-50 animate-fade-in">
        {/* Shimmer header */}
        <div className="glass shadow-soft border-t-0 px-6 py-4 flex items-center gap-4 animate-slide-in-down">
          <div className="shimmer h-8 w-16 rounded-lg"></div>
          <div className="space-y-2">
            <div className="shimmer h-5 w-36 rounded"></div>
            <div className="shimmer h-3 w-20 rounded"></div>
          </div>
        </div>
        {/* Shimmer messages */}
        <div className="flex-1 px-6 py-4 space-y-4">
          <div className="flex justify-start"><div className="shimmer h-12 w-52 rounded-2xl"></div></div>
          <div className="flex justify-end"><div className="shimmer h-12 w-64 rounded-2xl"></div></div>
          <div className="flex justify-start"><div className="shimmer h-16 w-48 rounded-2xl"></div></div>
          <div className="flex justify-end"><div className="shimmer h-12 w-56 rounded-2xl"></div></div>
          <div className="flex justify-start"><div className="shimmer h-12 w-44 rounded-2xl"></div></div>
        </div>
        {/* Shimmer input */}
        <div className="px-6 py-4">
          <div className="shimmer h-12 w-full rounded-xl"></div>
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
    <div className="flex flex-col h-full bg-gray-50 animate-fade-in">
      {/* Header */}
      <div className="glass shadow-soft px-6 py-4 flex items-center justify-between animate-slide-in-down">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(chatListPath)}
            className="btn-press text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Back
          </button>
          {otherParticipant && (
            <UserAvatar
              avatar={otherParticipant.avatar}
              firstname={otherParticipant.firstname}
              lastname={otherParticipant.lastname}
              alt={`${otherParticipant.firstname} ${otherParticipant.lastname}`}
              className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-500 rounded-full text-sm font-bold text-white flex-shrink-0"
            />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
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
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 underline"
                >
                  View Consultation
                </Link>
              )}
            </div>
            {isOnline && (
              <p className="text-sm text-green-600 flex items-center gap-1.5 font-medium">
                <span className="status-dot status-dot-online"></span>
                Online
              </p>
            )}
          </div>
        </div>

        <div className="text-sm">
          {socketConnected ? (
            <span className="text-emerald-500 flex items-center gap-1.5 font-medium">
              <span className="status-dot status-dot-online"></span>
              Connected
            </span>
          ) : (
            <span className="text-red-500 flex items-center gap-1.5 font-medium">
              <span className="status-dot bg-red-500"></span>
              Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <Virtuoso
          ref={virtuosoRef}
          data={flatItems}
          followOutput="smooth"
          initialTopMostItemIndex={Math.max(0, flatItems.length - 1)}
          className="custom-scrollbar px-6 py-4"
          itemContent={(_index, item) => {
            if (item.type === 'date') {
              return (
                <div className="text-center my-4">
                  <span className="px-4 py-1.5 bg-brand-50 text-brand-700 text-xs font-medium rounded-full shadow-sm">
                    {item.label}
                  </span>
                </div>
              );
            }

            const msg = item.message;
            const isOwn = msg.senderId === user?.id;
            const isEditing = editingMessageId === msg.id;
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
              <div className={`flex mb-4 animate-msg-in ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {showSenderHeader && senderInfo && (
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-xs font-semibold text-gray-600">
                        {senderInfo.role === 'DOCTOR' ? 'Dr. ' : ''}
                        {senderInfo.firstname} {senderInfo.lastname}
                      </span>
                      {senderInfo.role === 'NURSE' && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                          {consultationDoctorLastname
                            ? `Nurse · Dr. ${consultationDoctorLastname}'s team`
                            : 'Nurse'}
                        </span>
                      )}
                      {senderInfo.role === 'DOCTOR' && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          Doctor
                        </span>
                      )}
                    </div>
                  )}
                  {isEditing ? (
                    <div className="w-full">
                      <input
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 border input-focus mb-2"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') {
                            setEditingMessageId(null);
                            setEditContent('');
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="btn-primary px-3 py-1 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditContent('');
                          }}
                          className="btn-secondary px-3 py-1 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        dir={direction}
                        className={`px-4 py-2.5 ${
                          isOwn
                            ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl rounded-br-md shadow-sm'
                            : 'bg-white text-gray-800 border border-gray-100 shadow-soft rounded-2xl rounded-bl-md'
                        } ${isDeleted ? 'opacity-50 italic' : ''} transition-all duration-200 ease-spring`}
                      >
                        <p>{msg.content}</p>
                        {msg.editedAt && !isDeleted && (
                          <p className="text-xs opacity-70 mt-1">(edited)</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                        <span>{formatTime(msg.createdAt)}</span>

                        {isOwn && msg.readBy && msg.readBy.length > 0 && (
                          <span className="text-brand-400 font-medium">✓✓ Read</span>
                        )}

                        {isOwn && !isDeleted && (
                          <div className="flex gap-2 ml-2">
                            <button
                              onClick={() => handleEdit(msg)}
                              className="text-brand-500 hover:text-brand-700 transition-colors btn-press"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(String(msg.id))}
                              className="text-red-500 hover:text-red-700 transition-colors btn-press"
                            >
                              Delete
                            </button>
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

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start px-6 pb-2 animate-msg-in">
            <div className="bg-white border border-gray-100 shadow-soft rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
                </div>
                <span className="text-xs text-gray-500 ml-1">
                  {typingUsers.map(u => u.name || 'Someone').join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="glass border-t-0 shadow-soft-lg px-6 py-4">
        {isClosed ? (
          <p className="text-sm text-center text-gray-500 py-1">
            This conversation has been closed.
          </p>
        ) : (
          <div className="flex gap-3">
            <input
              type="text"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1 input-focus px-4 py-2.5 border"
              placeholder="Type a message..."
            />
            <button
              onClick={handleSend}
              disabled={!content.trim()}
              className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
