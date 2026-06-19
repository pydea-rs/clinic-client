import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../features/auth/hooks/useAuth';
import { AuthGuard, PatientGuard, DoctorGuard, AdminGuard } from '../lib/guards/route-guards';
import { Shell } from '../components/Shell';
const AuthForm = React.lazy(() => import('../features/auth/components/AuthForm').then(m => ({ default: m.AuthForm })));
const ChatInterface = React.lazy(() => import('../features/ai-chat/components/ChatInterface').then(m => ({ default: m.ChatInterface })));
const ConversationHistoryPage = React.lazy(() => import('../features/ai-chat/ConversationHistoryPage').then(m => ({ default: m.ConversationHistoryPage })));
const DashboardPage = React.lazy(() => import('../features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PatientProfilePage = React.lazy(() => import('../features/patient/PatientProfilePage').then(m => ({ default: m.PatientProfilePage })));
const PatientConsultationsListPage = React.lazy(() => import('../features/patient/PatientConsultationsListPage').then(m => ({ default: m.PatientConsultationsListPage })));
const PatientSOAPListPage = React.lazy(() => import('../features/patient/PatientSOAPListPage').then(m => ({ default: m.PatientSOAPListPage })));
const SOAPDetailPage = React.lazy(() => import('../features/patient/SOAPDetailPage').then(m => ({ default: m.SOAPDetailPage })));
const UserDetailPage = React.lazy(() => import('../features/patient/UserDetailPage').then(m => ({ default: m.UserDetailPage })));
const DoctorWorkspacePage = React.lazy(() => import('../features/doctor/DoctorWorkspacePage').then(m => ({ default: m.DoctorWorkspacePage })));
const DoctorDocumentsPage = React.lazy(() => import('../features/doctor/DoctorDocumentsPage').then(m => ({ default: m.DoctorDocumentsPage })));
const DoctorListPage = React.lazy(() => import('../features/doctor/DoctorListPage').then(m => ({ default: m.DoctorListPage })));
const DoctorProfilePage = React.lazy(() => import('../features/doctor/DoctorProfilePage').then(m => ({ default: m.DoctorProfilePage })));
const ConsultationCreatePage = React.lazy(() => import('../features/consultation/ConsultationCreatePage').then(m => ({ default: m.ConsultationCreatePage })));
const ConsultationListPage = React.lazy(() => import('../features/consultation/ConsultationListPage').then(m => ({ default: m.ConsultationListPage })));
const ConsultationDetailPage = React.lazy(() => import('../features/consultation/ConsultationDetailPage').then(m => ({ default: m.ConsultationDetailPage })));
const SchedulingPage = React.lazy(() => import('../features/scheduling/SchedulingPage').then(m => ({ default: m.SchedulingPage })));
const AvailabilityPanel = React.lazy(() => import('../features/scheduling/AvailabilityPanel').then(m => ({ default: m.AvailabilityPanel })));
const SlotDurationsPanel = React.lazy(() => import('../features/scheduling/SlotDurationsPanel').then(m => ({ default: m.SlotDurationsPanel })));
const ExceptionsPanel = React.lazy(() => import('../features/scheduling/ExceptionsPanel').then(m => ({ default: m.ExceptionsPanel })));
const SlotExplorer = React.lazy(() => import('../features/scheduling/SlotExplorer').then(m => ({ default: m.SlotExplorer })));
const BookingPage = React.lazy(() => import('../features/scheduling/BookingPage').then(m => ({ default: m.BookingPage })));
const AppointmentsPage = React.lazy(() => import('../features/scheduling/AppointmentsPage').then(m => ({ default: m.AppointmentsPage })));
const AppointmentDetailPage = React.lazy(() => import('../features/scheduling/AppointmentDetailPage').then(m => ({ default: m.AppointmentDetailPage })));
const ReviewCreatePage = React.lazy(() => import('../features/review/ReviewCreatePage').then(m => ({ default: m.ReviewCreatePage })));
const ReviewFeedPage = React.lazy(() => import('../features/review/ReviewFeedPage').then(m => ({ default: m.ReviewFeedPage })));
const AdminDashboardPage = React.lazy(() => import('../features/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminUserManagementPage = React.lazy(() => import('../features/admin/AdminUserManagementPage').then(m => ({ default: m.AdminUserManagementPage })));
const AdminDoctorVerificationPage = React.lazy(() => import('../features/admin/AdminDoctorVerificationPage').then(m => ({ default: m.AdminDoctorVerificationPage })));
const AdminReviewModerationPage = React.lazy(() => import('../features/admin/AdminReviewModerationPage').then(m => ({ default: m.AdminReviewModerationPage })));
const ChatListPage = React.lazy(() => import('../features/chat/ChatListPage').then(m => ({ default: m.ChatListPage })));
const ChatRoomPage = React.lazy(() => import('../features/chat/ChatRoomPage').then(m => ({ default: m.ChatRoomPage })));

// Placeholder components for unsupported modules
const PlaceholderPage: React.FC<{ title: string; phase: string }> = ({ title, phase }) => (
  <div className="flex items-center justify-center h-full min-h-[60vh]">
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-gray-600">Not available in current backend ({phase})</p>
    </div>
  </div>
);

const LazyPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <React.Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">Loading...</div>}>
    {children}
  </React.Suspense>
);

function App() {
  const { isAuthenticated, initializing, login, register } = useAuth();

  if (initializing) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <ErrorBoundary>
      <ToastProvider />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/auth'} replace />} />
          <Route path="/auth" element={!isAuthenticated ? <LazyPage><AuthForm onLogin={login} onRegister={register} /></LazyPage> : <Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<AuthGuard><Shell><LazyPage><DashboardPage /></LazyPage></Shell></AuthGuard>} />

          {/* AI Chat — inside Shell */}
          <Route path="/ai" element={<AuthGuard><Shell><LazyPage><ChatInterface /></LazyPage></Shell></AuthGuard>} />
          <Route path="/ai/new" element={<AuthGuard><Shell><LazyPage><ChatInterface forceNew /></LazyPage></Shell></AuthGuard>} />
          <Route path="/ai/history" element={<AuthGuard><Shell><LazyPage><ConversationHistoryPage /></LazyPage></Shell></AuthGuard>} />
          <Route path="/ai/:conversationId" element={<AuthGuard><Shell><LazyPage><ChatInterface /></LazyPage></Shell></AuthGuard>} />

          {/* Patient routes */}
          <Route path="/patient" element={<PatientGuard><Navigate to="/patient/consultations" replace /></PatientGuard>} />
          <Route path="/patient/profile" element={<PatientGuard><Shell><LazyPage><PatientProfilePage /></LazyPage></Shell></PatientGuard>} />
          <Route path="/patient/consultations" element={<PatientGuard><Shell><LazyPage><PatientConsultationsListPage /></LazyPage></Shell></PatientGuard>} />
          <Route path="/patient/consultations/create" element={<PatientGuard><Shell><LazyPage><ConsultationCreatePage /></LazyPage></Shell></PatientGuard>} />
          <Route path="/patient/soaps" element={<PatientGuard><Shell><LazyPage><PatientSOAPListPage /></LazyPage></Shell></PatientGuard>} />
          <Route path="/soap/:id" element={<AuthGuard><Shell><LazyPage><SOAPDetailPage /></LazyPage></Shell></AuthGuard>} />
          <Route path="/user/:id" element={<AuthGuard><Shell><LazyPage><UserDetailPage /></LazyPage></Shell></AuthGuard>} />

          {/* Doctor routes */}
          <Route path="/doctor" element={<DoctorGuard><Navigate to="/doctor/workspace" replace /></DoctorGuard>} />
          <Route path="/doctors" element={<AuthGuard><Shell><LazyPage><DoctorListPage /></LazyPage></Shell></AuthGuard>} />
          <Route path="/doctor/:id" element={<AuthGuard><Shell><LazyPage><DoctorProfilePage /></LazyPage></Shell></AuthGuard>} />
          <Route path="/doctor/:id/review" element={<PatientGuard><Shell><LazyPage><ReviewCreatePage /></LazyPage></Shell></PatientGuard>} />
          <Route path="/doctor/workspace" element={<DoctorGuard><Shell><LazyPage><DoctorWorkspacePage /></LazyPage></Shell></DoctorGuard>} />
          <Route path="/doctor/profile" element={<DoctorGuard><Shell><LazyPage><DoctorProfilePage /></LazyPage></Shell></DoctorGuard>} />
          <Route path="/doctor/documents" element={<DoctorGuard><Shell><LazyPage><DoctorDocumentsPage /></LazyPage></Shell></DoctorGuard>} />
          <Route path="/doctor/consultations" element={<DoctorGuard><Shell><LazyPage><ConsultationListPage /></LazyPage></Shell></DoctorGuard>} />
          <Route path="/doctor/scheduling" element={<DoctorGuard><Shell><LazyPage><SchedulingPage /></LazyPage></Shell></DoctorGuard>} />
          <Route path="/doctor/scheduling/availability" element={<DoctorGuard><Shell><LazyPage><AvailabilityPanel /></LazyPage></Shell></DoctorGuard>} />
          <Route path="/doctor/scheduling/durations" element={<DoctorGuard><Shell><LazyPage><SlotDurationsPanel /></LazyPage></Shell></DoctorGuard>} />
          <Route path="/doctor/scheduling/exceptions" element={<DoctorGuard><Shell><LazyPage><ExceptionsPanel /></LazyPage></Shell></DoctorGuard>} />
          <Route path="/doctor/chat" element={<DoctorGuard><Shell><LazyPage><ChatListPage /></LazyPage></Shell></DoctorGuard>} />
          <Route path="/doctor/settings" element={<DoctorGuard><Shell><div className="p-6 text-center text-gray-500">Settings Coming Soon</div></Shell></DoctorGuard>} />

          {/* Consultation routes */}
          <Route path="/consultations" element={<AuthGuard><Shell><LazyPage><ConsultationListPage /></LazyPage></Shell></AuthGuard>} />
          <Route path="/consultation/:id" element={<AuthGuard><Shell><LazyPage><ConsultationDetailPage /></LazyPage></Shell></AuthGuard>} />

          {/* Scheduling routes — now wrapped in Shell */}
          <Route path="/slots/:doctorId" element={<AuthGuard><Shell><LazyPage><SlotExplorer /></LazyPage></Shell></AuthGuard>} />
          <Route path="/booking/:doctorId" element={<AuthGuard><Shell><LazyPage><BookingPage /></LazyPage></Shell></AuthGuard>} />
          <Route path="/appointments" element={<AuthGuard><Shell><LazyPage><AppointmentsPage /></LazyPage></Shell></AuthGuard>} />
          <Route path="/appointments/:id" element={<AuthGuard><Shell><LazyPage><AppointmentDetailPage /></LazyPage></Shell></AuthGuard>} />

          {/* Review routes */}
          <Route path="/doctor/:id/reviews" element={<AuthGuard><Shell><LazyPage><ReviewFeedPage /></LazyPage></Shell></AuthGuard>} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminGuard><Shell><LazyPage><AdminDashboardPage /></LazyPage></Shell></AdminGuard>} />
          <Route path="/admin/users" element={<AdminGuard><Shell><LazyPage><AdminUserManagementPage /></LazyPage></Shell></AdminGuard>} />
          <Route path="/admin/verifications" element={<AdminGuard><Shell><LazyPage><AdminDoctorVerificationPage /></LazyPage></Shell></AdminGuard>} />
          <Route path="/admin/reviews" element={<AdminGuard><Shell><LazyPage><AdminReviewModerationPage /></LazyPage></Shell></AdminGuard>} />

          {/* Chat routes */}
          <Route path="/chat" element={<AuthGuard><Shell><LazyPage><ChatListPage /></LazyPage></Shell></AuthGuard>} />
          <Route path="/chat/:id" element={<AuthGuard><Shell><LazyPage><ChatRoomPage /></LazyPage></Shell></AuthGuard>} />

          {/* Unsupported modules placeholders */}
          <Route path="/calls" element={<AuthGuard><Shell><PlaceholderPage title="Calls & WebRTC" phase="Phase 6 pending" /></Shell></AuthGuard>} />
          <Route path="/notifications" element={<AuthGuard><Shell><PlaceholderPage title="Notifications" phase="Frontend pending" /></Shell></AuthGuard>} />
          <Route path="/payment" element={<AuthGuard><Shell><PlaceholderPage title="Payment" phase="Frontend pending" /></Shell></AuthGuard>} />
          <Route path="/nurse" element={<AuthGuard><Shell><PlaceholderPage title="Nurse Management" phase="Phase 9 pending" /></Shell></AuthGuard>} />

          {/* 404 */}
          <Route path="*" element={<div className="flex items-center justify-center min-h-screen">404 - Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
