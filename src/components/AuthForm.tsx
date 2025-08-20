import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface AuthFormProps {
  onLogin: (token: string) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsLoading(true);
    // Simulate token validation (replace with actual auth logic)
    setTimeout(() => {
      onLogin(token.trim());
      setIsLoading(false);
    }, 500);
  };

  // For demo purposes, provide a sample token
  const handleDemoLogin = () => {
    const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo.token';
    setToken(demoToken);
    onLogin(demoToken);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 hover-lift animate-slide-in-up backdrop-blur-sm border border-white/20">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl hover-lift animate-float">
              <MessageCircle className="w-10 h-10 text-white animate-pulse-slow" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI Chat Assistant</h1>
            <p className="text-gray-600 font-medium">Enter your JWT token to connect</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                🔐 JWT Token
              </label>
              <textarea
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your JWT token here..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 resize-none transition-all-smooth shadow-sm hover:shadow-md font-mono text-sm"
                rows={4}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={!token.trim() || isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-2xl transition-all-smooth hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl btn-press"
            >
              {isLoading ? '🔄 Connecting...' : '🚀 Connect to AI'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleDemoLogin}
              className="w-full text-blue-600 hover:text-blue-700 font-bold py-2 transition-all-smooth hover-lift btn-press rounded-xl"
            >
              ✨ Use Demo Token
            </button>
            <p className="text-xs text-gray-500 text-center mt-2 font-medium">
              For testing purposes only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};