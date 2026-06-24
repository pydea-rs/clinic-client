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

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">AI-Clinic</span>
        </div>
        <div className="flex items-center gap-1">
          {isAuthenticated && <NotificationBell />}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100
          flex flex-col transform transition-transform duration-200 ease-out
          lg:translate-x-0 flex-shrink-0
          ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Logo */}
          <div className="hidden lg:flex p-5 border-b border-gray-100 items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">AI-Clinic</span>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-100 mt-auto">
            {isAuthenticated && user && (
              <div className="px-3 py-2 mb-1">
                <div className="font-medium text-sm text-gray-900 truncate">{user.firstname} {user.lastname}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{user.role}</div>
              </div>
            )}
            <button
              onClick={() => { void handleLogout(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
};
