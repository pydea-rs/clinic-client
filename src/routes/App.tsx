import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { AuthForm } from '../features/auth/components/AuthForm';
import { ChatInterface } from '../features/ai-chat/components/ChatInterface';
import { useAuth } from '../features/auth/hooks/useAuth';
import { AuthGuard, PatientGuard, DoctorGuard, AdminGuard } from '../lib/guards/route-guards';
import { DebugPage } from '../features/debug/DebugPage';
import { Shell } from '../components/Shell';

// Placeholder components for unsupported modules
const CallsPlaceholder = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">Calls & WebRTC</h2>
      <p className="text-gray-600">Not available in current backend (Phase 6 pending)</p>
    </div>
  </div>
);

const NotificationsPlaceholder = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">Notifications</h2>
      <p className="text-gray-600">Not available in current backend (Phase 7 pending)</p>
    </div>
  </div>
);

const PaymentPlaceholder = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">Payment</h2>
      <p className="text-gray-600">Not available in current backend (Phase 8 pending)</p>
    </div>
  </div>
);

const NursePlaceholder = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">Nurse Management</h2>
      <p className="text-gray-600">Not available in current backend (Phase 9 pending)</p>
    </div>
  </div>
);

function App() {
  const { isAuthenticated, initializing, login, register, logout } = useAuth();

  if (initializing) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      <ToastProvider />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to={isAuthenticated ? '/ai' : '/auth'} replace />} />
          <Route path="/auth" element={!isAuthenticated ? <AuthForm onLogin={login} onRegister={register} /> : <Navigate to="/ai" replace />} />
          
          {/* AI Chat (public if not authenticated, protected if authenticated) */}
          <Route path="/ai" element={isAuthenticated ? <ChatInterface onLogout={logout} /> : <Navigate to="/auth" replace />} />
          
          {/* Protected routes with Shell */}
          <Route path="/" element={<Shell><div className="p-8">Home (TBD)</div></Shell>} />
          
          {/* Patient routes */}
          <Route path="/patient/*" element={<PatientGuard><Shell><div className="p-8">Patient Dashboard (TBD)</div></Shell></PatientGuard>} />
          
          {/* Doctor routes */}
          <Route path="/doctor/*" element={<DoctorGuard><Shell><div className="p-8">Doctor Dashboard (TBD)</div></Shell></DoctorGuard>} />
          
          {/* Admin routes */}
          <Route path="/admin/*" element={<AdminGuard><Shell><div className="p-8">Admin Dashboard (TBD)</div></Shell></AdminGuard>} />
          
          {/* Chat routes */}
          <Route path="/chat/*" element={<AuthGuard><Shell><div className="p-8">Chat (TBD)</div></Shell></AuthGuard>} />
          
          {/* Debug routes */}
          <Route path="/debug/*" element={<AuthGuard><DebugPage /></AuthGuard>} />
          
          {/* Unsupported modules placeholders */}
          <Route path="/calls" element={<CallsPlaceholder />} />
          <Route path="/notifications" element={<NotificationsPlaceholder />} />
          <Route path="/payment" element={<PaymentPlaceholder />} />
          <Route path="/nurse" element={<NursePlaceholder />} />
          
          {/* 404 */}
          <Route path="*" element={<div className="flex items-center justify-center min-h-screen">404 - Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
