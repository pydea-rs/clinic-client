import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/stores/auth.store';
import { authApi } from '../api/auth.api';
import { queryClient } from '../lib/queryClient';
import { socketService } from '../lib/socket/socket.service';
import {
  Home,
  Bot,
  Search,
  Calendar,
  User,
  UserCheck,
  Shield,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Stethoscope,
  Zap,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { NotificationBell } from '../features/notification/NotificationBell';

interface ShellProps {
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const navItems = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'AI Chat', icon: Bot, path: '/ai' },
    { label: 'Find Match', icon: Zap, path: '/matching/request', role: 'PATIENT' },
    { label: 'Match Requests', icon: Zap, path: '/matching/pending', role: 'DOCTOR' },
    { label: 'Doctors', icon: Search, path: '/doctors' },
    { label: 'Appointments', icon: Calendar, path: '/appointments', role: 'PATIENT' },
    { label: 'Patient', icon: User, path: '/patient', role: 'PATIENT' },
    { label: 'Doctor', icon: UserCheck, path: '/doctor', role: 'DOCTOR' },
    { label: 'Chat', icon: MessageSquare, path: '/chat' },
    { label: 'Notifications', icon: Bell, path: '/notifications' },
    { label: 'Admin', icon: Shield, path: '/admin', role: 'ADMIN' },
  ];

  const role = user?.role || 'NONE';
  const isAdmin = user?.isAdmin || false;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      socketService.disconnect();
      queryClient.clear();
      clearAuth();
    }
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.role === 'ADMIN') return isAdmin;
    return !item.role || item.role === role;
  });

  const userInitials = user ? `${user.firstname?.[0] || ''}${user.lastname?.[0] || ''}`.toUpperCase() : '';

  return (
    <div className="h-screen flex flex-col bg-gray-50/80 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white/80 backdrop-blur-lg border-b border-gray-200/60 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center shadow-sm shadow-brand-500/20">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight">AI-Clinic</span>
        </div>
        <div className="flex items-center gap-1">
          {isAuthenticated && <NotificationBell />}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-50 w-[260px] bg-white/90 backdrop-blur-xl border-r border-gray-200/60
          flex flex-col transform transition-transform duration-300 ease-spring
          lg:translate-x-0 flex-shrink-0
          ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Logo */}
          <div className="hidden lg:flex p-5 items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 via-brand-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 animate-gradient">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-[17px] text-gray-900 tracking-tight">AI-Clinic</span>
              <span className="block text-[10px] text-gray-400 font-medium tracking-wider uppercase">Telemedicine</span>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-4 hidden lg:block" />

          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium
                    transition-all duration-200 ease-spring relative
                    ${isActive
                      ? 'bg-brand-50 text-brand-700 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r-full" />
                  )}
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200 ${
                    isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`} />
                  {item.label}
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 mt-auto">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-3" />
            {isAuthenticated && user && (
              <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center text-brand-700 text-xs font-bold shadow-sm ring-1 ring-brand-200/50">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 truncate">{user.firstname} {user.lastname}</div>
                  <div className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">{user.role === 'NONE' ? 'Guest' : user.role}</div>
                </div>
              </div>
            )}
            <button
              onClick={() => { void handleLogout(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="page-enter">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
};
