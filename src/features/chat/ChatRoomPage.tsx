import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { chatApi } from '../../api/chat.api';
import { socketService } from '../../lib/socket/socket.service';
import toast from 'react-hot-toast';

export const ChatRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadMessages = async () => {
      if (!id) return;
      try {
        const data = await chatApi.getMessages(id);
        setMessages(data.data || []);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const socket = socketService.connect();
    
    // Listen for incoming messages
    socket.on('chat:message', (data: any) => {
      if (data.chatId === id) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  const handleSend = async () => {
    if (!content.trim() || !id) return;
    
    setSending(true);
    try {
      await chatApi.sendMessage(id, { content });
      setContent('');
      toast.success('Message sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-6">Chat Room</h1>
      
      <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow p-4 mb-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === 'current' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md px-4 py-2 rounded-lg ${
              msg.senderId === 'current' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <p>{msg.content}</p>
              <p className="text-xs opacity-50 mt-1">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-4 py-2 border rounded-lg"
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          disabled={sending || !content.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
        >
          Send
        </button>
      </div>
    </div>
  );
};
