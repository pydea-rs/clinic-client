import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { AuthForm } from '../features/auth/components/AuthForm';
import { ChatInterface } from '../features/ai-chat/components/ChatInterface';
import { useAuth } from '../features/auth/hooks/useAuth';
import { AuthGuard, PatientGuard, DoctorGuard, AdminGuard } from '../lib/guards/route-guards';
import { DebugPage } from '../features/debug/DebugPage';
import { Shell } from '../components/Shell';
import { PatientProfilePage } from '../features/patient/PatientProfilePage';
import { PatientConsultationsPage } from '../features/patient/PatientConsultationsPage';
import { SOAPDetailPage } from '../features/patient/SOAPDetailPage';
import { DoctorListPage } from '../features/doctor/DoctorListPage';
import { DoctorProfilePage } from '../features/doctor/DoctorProfilePage';
import { ConsultationCreatePage } from '../features/consultation/ConsultationCreatePage';
import { SchedulingPage } from '../features/scheduling/SchedulingPage';
import { ReviewCreatePage } from '../features/review/ReviewCreatePage';
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';
import { AdminUserManagementPage } from '../features/admin/AdminUserManagementPage';
import { AdminDoctorVerificationPage } from '../features/admin/AdminDoctorVerificationPage';
import { AdminReviewModerationPage } from '../features/admin/AdminReviewModerationPage';
import { ChatListPage } from '../features/chat/ChatListPage';
import { ChatRoomPage } from '../features/chat/ChatRoomPage';

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
          
          {/* AI Chat */}
          <Route path="/ai" element={isAuthenticated ? <ChatInterface onLogout={logout} /> : <Navigate to="/auth" replace />} />
          
          {/* Patient routes */}
          <Route path="/patient/profile" element={<PatientGuard><Shell><PatientProfilePage /></Shell></PatientGuard>} />
          <Route path="/patient/consultations" element={<PatientGuard><Shell><PatientConsultationsPage /></Shell></PatientGuard>} />
          <Route path="/patient/consultations/create" element={<PatientGuard><Shell><ConsultationCreatePage /></Shell></PatientGuard>} />
          <Route path="/soap/:id" element={<PatientGuard><Shell><SOAPDetailPage /></Shell></PatientGuard>} />
          
          {/* Doctor routes */}
          <Route path="/doctors" element={<DoctorListPage />} />
          <Route path="/doctor/:id" element={<DoctorProfilePage />} />
          <Route path="/doctor/:id/review" element={<PatientGuard><Shell><ReviewCreatePage doctorId={0} consultationId="" /></Shell></PatientGuard>} />
          <Route path="/doctor/:id/scheduling" element={<DoctorGuard><Shell><SchedulingPage /></Shell></DoctorGuard>} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminGuard><Shell><AdminDashboardPage /></Shell></AdminGuard>} />
          <Route path="/admin/users" element={<AdminGuard><Shell><AdminUserManagementPage /></Shell></AdminGuard>} />
          <Route path="/admin/verifications" element={<AdminGuard><Shell><AdminDoctorVerificationPage /></Shell></AdminGuard>} />
          <Route path="/admin/reviews" element={<AdminGuard><Shell><AdminReviewModerationPage /></Shell></AdminGuard>} />
          
          {/* Chat routes */}
          <Route path="/chat" element={<AuthGuard><Shell><ChatListPage /></Shell></AuthGuard>} />
          <Route path="/chat/:id" element={<AuthGuard><Shell><ChatRoomPage /></Shell></AuthGuard>} />
          
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
