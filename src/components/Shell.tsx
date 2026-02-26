import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/stores/auth.store';
import { 
  MessageCircle, 
  User, 
  UserCheck, 
  Shield, 
  MessageSquare, 
  Activity, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface ShellProps {
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const navItems = [
    { label: 'AI Chat', icon: MessageCircle, path: '/ai' },
    { label: 'Patient', icon: User, path: '/patient', role: 'PATIENT' },
    { label: 'Doctor', icon: UserCheck, path: '/doctor', role: 'DOCTOR' },
    { label: 'Admin', icon: Shield, path: '/admin', role: 'ADMIN' },
    { label: 'Chat', icon: MessageSquare, path: '/chat' },
    { label: 'Debug', icon: Activity, path: '/debug' },
  ];

  const role = user?.role || 'NONE';
  const isAdmin = user?.isAdmin || false;

  const filteredNavItems = navItems.filter(item => {
    if (item.role === 'ADMIN') {
      return isAdmin;
    }
    return !item.role || item.role === role;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-lg">AI-Clinic</span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-300 lg:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 border-b flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-xl">AI-Clinic</span>
          </div>

          <nav className="p-4 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 w-full p-4 border-t">
            {isAuthenticated && user && (
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Logged in as</div>
                <div className="font-medium">{user.firstname} {user.lastname}</div>
                <div className="text-xs text-gray-400">{user.role}</div>
              </div>
            )}
            <button
              onClick={clearAuth}
              className="flex items-center gap-2 w-full px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
};
