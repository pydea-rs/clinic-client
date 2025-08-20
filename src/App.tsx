import React from 'react';
import { ToastProvider } from './components/Toast';
import { AuthForm } from './components/AuthForm';
import { ChatInterface } from './components/ChatInterface';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated, token, login, logout } = useAuth();

  return (
    <>
      <ToastProvider />
      {!isAuthenticated || !token ? (
        <AuthForm onLogin={login} />
      ) : (
        <ChatInterface token={token} onLogout={logout} />
      )}
    </>
  );
}

export default App;