import React from 'react';
import { ToastProvider } from '../components/Toast';
import { AuthForm } from '../features/auth/components/AuthForm';
import { ChatInterface } from '../features/ai-chat/components/ChatInterface';
import { useAuth } from '../features/auth/hooks/useAuth';

function App() {
  const { isAuthenticated, initializing, login, register, logout } = useAuth();

  return (
    <>
      <ToastProvider />
      {!isAuthenticated ? (
        <AuthForm onLogin={login} onRegister={register} initializing={initializing} />
      ) : (
        <ChatInterface onLogout={logout} />
      )}
    </>
  );
}

export default App;
