import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/stores/auth.store';
import { authApi } from '../api/auth.api';
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
} from 'lucide-react';

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
    { label: 'Doctors', icon: Search, path: '/doctors' },
    { label: 'Appointments', icon: Calendar, path: '/appointments', role: 'PATIENT' },
    { label: 'Patient', icon: User, path: '/patient', role: 'PATIENT' },
    { label: 'Doctor', icon: UserCheck, path: '/doctor', role: 'DOCTOR' },
    { label: 'Chat', icon: MessageSquare, path: '/chat' },
    { label: 'Admin', icon: Shield, path: '/admin', role: 'ADMIN' },
  ];

  const role = user?.role || 'NONE';
  const isAdmin = user?.isAdmin || false;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
    }
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.role === 'ADMIN') {
      return isAdmin;
    }
    return !item.role || item.role === role;
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">AI-Clinic</span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col transform transition-transform duration-300 lg:translate-x-0 flex-shrink-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Logo - hidden on mobile since mobile header shows it */}
          <div className="hidden lg:flex p-5 border-b items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">AI-Clinic</span>
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              const isExactOrChild = location.pathname === item.path || location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isExactOrChild
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-blue-600' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t mt-auto">
            {isAuthenticated && user && (
              <div className="px-3 py-2 mb-2">
                <div className="font-medium text-sm text-gray-900">{user.firstname} {user.lastname}</div>
                <div className="text-xs text-gray-400 mt-0.5">{user.role}</div>
              </div>
            )}
            <button
              onClick={() => { void handleLogout(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
};
