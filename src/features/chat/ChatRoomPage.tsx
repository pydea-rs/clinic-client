import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useParams, useNavigate } from 'react-router-dom';
import { chatApi } from '../../api/chat.api';
import { socketService } from '../../lib/socket/socket.service';
import { useAuthStore } from '../../lib/stores/auth.store';
import { Chat, Message } from '../../lib/types/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/api/error.utils';

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
  const [onlineParticipants, setOnlineParticipants] = useState<Set<string>>(new Set());
  const [socketConnected, setSocketConnected] = useState(socketService.isConnected());
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingStateRef = useRef<boolean>(false);

  const loadChatAndMessages = useCallback(async () => {
    if (!id) return;

    try {
      const [chatData, messagesData] = await Promise.all([
        chatApi.getById(id),
        chatApi.getMessages(id, { limit: 100 })
      ]);

      setChatInfo(chatData);
      setMessages(messagesData.messages || []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load chat'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    loadChatAndMessages();

    const socket = socketService.connect();

    // Join the chat room
    socketService.joinRoom(id);

    // Listen for incoming messages
    const handleNewMessage = (data: { message: Message }) => {
      if (cancelled) return;
      if (data?.message?.chatId === id) {
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
              const updated = [...prev];
              updated[optimisticIdx] = data.message;
              return updated;
            }
          }
          return [...prev, data.message];
        });

        if (data.message.senderId !== user?.id) {
          socketService.markAsRead(id, String(data.message.id));
        }
      }
    };

    // Listen for typing indicators
    const handleTyping = (data: { userId: string; isTyping: boolean; firstname?: string }) => {
      if (cancelled) return;
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
      setOnlineParticipants(prev => {
        const next = new Set(prev);
        if (data.isOnline === false) {
          next.delete(data.userId);
        } else {
          next.add(data.userId);
        }
        return next;
      });
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:read', handleRead);
    socket.on('chat:edited', handleEdited);
    socket.on('chat:deleted', handleDeleted);
    socket.on('user:online', handleUserOnline);

    const unsubStatus = socketService.onStatusChange((status) => {
      setSocketConnected(status.connected);
    });

    return () => {
      cancelled = true;
      socketService.leaveRoom(id);
      unsubStatus();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      socket.off('chat:message', handleNewMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:read', handleRead);
      socket.off('chat:edited', handleEdited);
      socket.off('chat:deleted', handleDeleted);
      socket.off('user:online', handleUserOnline);
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
    if (!content.trim() || !id || !user) return;

    const trimmed = content.trim();
    handleTyping(false);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chatId: id,
      senderId: user.id,
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

    // Rollback if server never confirms within 10s
    setTimeout(() => {
      setMessages(prev => {
        const stillTemp = prev.find(m => m.id === tempId);
        if (stillTemp) {
          toast.error('Message may not have been delivered');
        }
        return prev;
      });
    }, 10000);
  };

  const handleEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !id || editingMessageId === null) return;

    try {
      socketService.editMessage(id, editingMessageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent('');
      toast.success('Message edited');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to edit message'));
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!id || !confirm('Are you sure you want to delete this message?')) return;

    try {
      socketService.deleteMessage(id, messageId);
      toast.success('Message deleted');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete message'));
    }
  };

  const getOtherParticipant = () => {
    if (!chatInfo?.participants || !user) return null;
    return chatInfo.participants.find((p) => p.userId !== user.id);
  };

  const isParticipantOnline = (userId: string) => {
    return onlineParticipants.has(userId) || socketService.isUserOnline(userId);
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
  const isOnline = otherParticipant ? isParticipantOnline(otherParticipant.userId) : false;

  return (
    <div className="flex flex-col h-full bg-gray-50 animate-fade-in">
      {/* Header */}
      <div className="glass shadow-soft px-6 py-4 flex items-center justify-between animate-slide-in-down">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/chat')}
            className="btn-press text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {chatInfo?.topic || (otherParticipant?.user
                ? `${otherParticipant.user.firstname} ${otherParticipant.user.lastname}`
                : 'Chat')}
            </h1>
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
          initialTopMostItemIndex={flatItems.length - 1}
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

            return (
              <div className={`flex mb-4 animate-msg-in ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
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
                      <div className={`px-4 py-2.5 ${
                        isOwn
                          ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl rounded-br-md shadow-sm'
                          : 'bg-white text-gray-800 border border-gray-100 shadow-soft rounded-2xl rounded-bl-md'
                      } ${isDeleted ? 'opacity-50 italic' : ''} transition-all duration-200 ease-spring`}>
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
      </div>
    </div>
  );
};
