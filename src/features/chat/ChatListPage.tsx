import React, { useState, useEffect } from 'react';
import { chatApi } from '../../api/chat.api';
import { Link } from 'react-router-dom';

export const ChatListPage: React.FC = () => {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChats = async () => {
      try {
        const data = await chatApi.list();
        setChats(data || []);
      } catch (error) {
        console.error('Failed to load chats:', error);
      } finally {
        setLoading(false);
      }
    };
    loadChats();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Chats</h1>
      
      {chats.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No chats yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {chats.map((chat) => (
            <Link
              key={chat.id}
              to={`/chat/${chat.id}`}
              className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{chat.topic || 'Chat'}</h3>
                  <p className="text-sm text-gray-500">ID: {chat.id.substring(0, 8)}...</p>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(chat.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
