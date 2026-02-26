import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatApi } from '../../api/chat.api';
import { socketService } from '../../lib/socket/socket.service';
import { useAuthStore } from '../../lib/stores/auth.store';
import { Message } from '../../lib/types/api';
import toast from 'react-hot-toast';

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
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [onlineParticipants, setOnlineParticipants] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingStateRef = useRef<boolean>(false);

  useEffect(() => {
    if (!id) return;

    loadChatAndMessages();

    const socket = socketService.connect();
    
    // Join the chat room
    socketService.joinRoom(id);

    // Listen for incoming messages
    const handleNewMessage = (data: { chatId: string; message: Message }) => {
      if (data.chatId === id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message];
        });
        
        // Mark as read if not from current user
        if (data.message.senderId !== user?.id) {
          socketService.markAsRead(id, data.message.id);
        }
      }
    };

    // Listen for typing indicators
    const handleTyping = (data: { chatId: string; userId: string; isTyping: boolean; name?: string }) => {
      if (data.chatId === id && data.userId !== user?.id) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            if (!prev.some(u => u.userId === data.userId)) {
              return [...prev, { userId: data.userId, name: data.name }];
            }
          } else {
            return prev.filter(u => u.userId !== data.userId);
          }
          return prev;
        });
      }
    };

    // Listen for read receipts
    const handleRead = (data: { chatId: string; messageId: number; userId: string }) => {
      if (data.chatId === id) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
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
    const handleEdited = (data: { chatId: string; messageId: number; content: string; editedAt: string }) => {
      if (data.chatId === id) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, content: data.content, editedAt: data.editedAt }
            : msg
        ));
      }
    };

    // Listen for message deletes
    const handleDeleted = (data: { chatId: string; messageId: number; deletedAt: string }) => {
      if (data.chatId === id) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, deletedAt: data.deletedAt, content: '[Message deleted]' }
            : msg
        ));
      }
    };

    // Listen for presence events
    const handleUserOnline = (data: { userId: string }) => {
      setOnlineParticipants(prev => new Set(prev).add(data.userId));
    };

    const handleUserOffline = (data: { userId: string }) => {
      setOnlineParticipants(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:read', handleRead);
    socket.on('chat:edited', handleEdited);
    socket.on('chat:deleted', handleDeleted);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      // Leave the chat room
      socketService.leaveRoom(id);
      
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:read', handleRead);
      socket.off('chat:edited', handleEdited);
      socket.off('chat:deleted', handleDeleted);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [id, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatAndMessages = async () => {
    if (!id) return;
    
    try {
      const [chatData, messagesData] = await Promise.all([
        chatApi.getById(id),
        chatApi.getMessages(id, { limit: 100 })
      ]);
      
      setChatInfo(chatData);
      setMessages(messagesData.data || []);
    } catch (error: any) {
      console.error('Failed to load chat:', error);
      toast.error(error.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    if (!content.trim() || !id) return;
    
    setSending(true);
    handleTyping(false);
    
    try {
      // Send via REST API (will also trigger WebSocket event)
      await chatApi.sendMessage(id, { content: content.trim() });
      setContent('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to edit message');
    }
  };

  const handleDelete = async (messageId: number) => {
    if (!id || !confirm('Are you sure you want to delete this message?')) return;
    
    try {
      socketService.deleteMessage(id, messageId);
      toast.success('Message deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete message');
    }
  };

  const getOtherParticipant = () => {
    if (!chatInfo?.participants || !user) return null;
    return chatInfo.participants.find((p: any) => p.userId !== user.id);
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

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(msg => {
      const dateKey = formatDate(msg.createdAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    
    return groups;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const otherParticipant = getOtherParticipant();
  const isOnline = otherParticipant ? isParticipantOnline(otherParticipant.userId) : false;
  const messageGroups = groupMessagesByDate();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/chat')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold">
              {chatInfo?.topic || (otherParticipant?.user 
                ? `${otherParticipant.user.firstname} ${otherParticipant.user.lastname}`
                : 'Chat')}
            </h1>
            {isOnline && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                Online
              </p>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          {socketService.isConnected() ? (
            <span className="text-green-600">● Connected</span>
          ) : (
            <span className="text-red-600">● Disconnected</span>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date}>
            <div className="text-center my-4">
              <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                {date}
              </span>
            </div>
            
            {msgs.map((msg) => {
              const isOwn = msg.senderId === user?.id;
              const isEditing = editingMessageId === msg.id;
              const isDeleted = !!msg.deletedAt;
              
              return (
                <div key={msg.id} className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {isEditing ? (
                      <div className="w-full">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg mb-2"
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
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingMessageId(null);
                              setEditContent('');
                            }}
                            className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={`px-4 py-2 rounded-lg ${
                          isOwn 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-gray-800 border'
                        } ${isDeleted ? 'opacity-50 italic' : ''}`}>
                          <p>{msg.content}</p>
                          {msg.editedAt && !isDeleted && (
                            <p className="text-xs opacity-70 mt-1">(edited)</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                          <span>{formatTime(msg.createdAt)}</span>
                          
                          {isOwn && msg.readBy && msg.readBy.length > 0 && (
                            <span className="text-blue-600">✓✓ Read</span>
                          )}
                          
                          {isOwn && !isDeleted && (
                            <div className="flex gap-2 ml-2">
                              <button
                                onClick={() => handleEdit(msg)}
                                className="text-blue-600 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(msg.id)}
                                className="text-red-600 hover:underline"
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
            })}
          </div>
        ))}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start mb-4">
            <div className="px-4 py-2 bg-gray-200 rounded-lg text-gray-600 text-sm">
              {typingUsers.map(u => u.name || 'Someone').join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="bg-white border-t px-6 py-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Type a message..."
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !content.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};
