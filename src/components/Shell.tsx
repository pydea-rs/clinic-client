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
  Palette,
} from 'lucide-react';
import { NotificationBell } from '../features/notification/NotificationBell';
import { ThemeCustomizer } from './ThemeCustomizer';
import { ProfileModal } from './ProfileModal';

interface ShellProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: string | number }>;
  path: string;
  role?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [showCustomizer, setShowCustomizer] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);

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

  // Group filtered nav items into sections
  const navGroups: NavGroup[] = React.useMemo(() => {
    const mainPaths = ['/dashboard', '/ai'];
    const carePaths = ['/matching/request', '/matching/pending', '/doctors', '/appointments'];
    const accountPaths = ['/patient', '/doctor', '/chat', '/notifications'];
    const adminPaths = ['/admin'];

    const groups: NavGroup[] = [];

    const mainItems = filteredNavItems.filter(i => mainPaths.includes(i.path));
    if (mainItems.length > 0) groups.push({ label: 'Main', items: mainItems });

    const careItems = filteredNavItems.filter(i => carePaths.includes(i.path));
    if (careItems.length > 0) groups.push({ label: 'Care', items: careItems });

    const accountItems = filteredNavItems.filter(i => accountPaths.includes(i.path));
    if (accountItems.length > 0) groups.push({ label: 'Account', items: accountItems });

    const adminItems = filteredNavItems.filter(i => adminPaths.includes(i.path));
    if (adminItems.length > 0) groups.push({ label: 'Admin', items: adminItems });

    return groups;
  }, [filteredNavItems]);

  const userInitials = user ? `${user.firstname?.[0] || ''}${user.lastname?.[0] || ''}`.toUpperCase() : '';

  return (
    <div className="h-screen flex flex-col bg-gray-50/80 dark:bg-slate-900 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden flex-shrink-0">
        {/* Gradient accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-500" />
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200/60 dark:border-slate-700/60 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center shadow-sm shadow-brand-500/20">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white tracking-tight">AI-Clinic</span>
          </div>
          <div className="flex items-center gap-1">
            {isAuthenticated && <NotificationBell />}
            <button
              onClick={() => setShowCustomizer(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
            >
              <Palette className="w-5 h-5 text-gray-500 dark:text-slate-400" />
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
            >
              {isMenuOpen ? <X className="w-5 h-5 text-gray-700 dark:text-slate-300" /> : <Menu className="w-5 h-5 text-gray-700 dark:text-slate-300" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-50 w-[260px] border-r border-gray-200/60 dark:border-slate-700/60
          flex flex-col transform transition-transform duration-300 ease-spring
          lg:translate-x-0 flex-shrink-0
          ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Sidebar gradient background overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/50 backdrop-blur-xl" />
          <div className="relative flex flex-col h-full">

            {/* Logo */}
            <div className="hidden lg:flex p-5 items-center gap-3">
              <div className="relative">
                {/* Decorative gradient mesh orb behind logo */}
                <div className="absolute -inset-2 bg-gradient-to-br from-brand-200/40 via-brand-300/30 to-brand-100/20 dark:from-brand-800/30 dark:via-brand-700/20 dark:to-brand-900/10 rounded-3xl blur-lg" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 animate-gradient">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <span className="font-bold text-[17px] text-gray-900 dark:text-white tracking-tight">AI-Clinic</span>
                <span className="block text-[10px] text-gray-400 dark:text-slate-500 font-medium tracking-wider uppercase">Telemedicine</span>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700 to-transparent mx-4 hidden lg:block" />

            {/* Nav groups */}
            <nav className="flex-1 px-3 py-3 overflow-y-auto">
              {navGroups.map((group, groupIdx) => (
                <div key={group.label} className={groupIdx > 0 ? 'mt-4' : ''}>
                  {/* Section label */}
                  <div className="px-3 mb-1.5">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-300 dark:text-slate-600">
                      {group.label}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMenuOpen(false)}
                          className={`
                            group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium
                            transition-all duration-200 ease-spring relative overflow-hidden
                            ${isActive
                              ? 'nav-item-active text-brand-700 dark:text-brand-300 font-semibold'
                              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                            }
                          `}
                        >
                          {/* Hover background fill (slides in from left) — non-active only */}
                          {!isActive && (
                            <div className="absolute inset-0 bg-gray-50 dark:bg-slate-800 rounded-xl -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-spring" />
                          )}

                          {/* Active indicator bar */}
                          {isActive && (
                            <div className="nav-indicator absolute left-0 top-1/2 -translate-y-1/2 h-5" />
                          )}

                          <item.icon className={`relative z-10 flex-shrink-0 transition-all duration-200 ${
                            isActive
                              ? 'w-[20px] h-[20px] text-brand-600 dark:text-brand-400'
                              : 'w-[18px] h-[18px] text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300'
                          }`} />

                          <span className="relative z-10">{item.label}</span>

                          {/* Chevron — visible on hover for all items */}
                          <ChevronRight className={`relative z-10 w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                            isActive ? 'text-brand-400 dark:text-brand-500' : 'text-gray-300 dark:text-slate-600'
                          }`} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* User profile section */}
            <div className="p-3 mt-auto relative">
              {/* Subtle background mesh for user section */}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-50/30 dark:from-brand-950/20 via-transparent to-transparent pointer-events-none" />

              <div className="relative">
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700 to-transparent mb-3" />
                {isAuthenticated && user && (
                  <button
                    onClick={() => setShowProfile(true)}
                    className="w-full flex items-center gap-3 px-3 py-3 mb-1 rounded-xl bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-100/60 dark:hover:bg-slate-700/60 transition-colors duration-200 text-left cursor-pointer">
                    {/* Avatar with online dot */}
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/50 dark:to-brand-800/30 flex items-center justify-center text-brand-700 dark:text-brand-300 text-xs font-bold shadow-sm ring-2 ring-brand-300/50 dark:ring-brand-700/50">
                        {userInitials}
                      </div>
                      {/* Online status dot */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.firstname} {user.lastname}</div>
                      <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase badge-brand">
                        {user.role === 'NONE' ? 'Guest' : user.role}
                      </span>
                    </div>
                  </button>
                )}

                <div className="flex gap-1">
                  <button
                    onClick={() => setShowCustomizer(true)}
                    className="hidden lg:flex items-center gap-2.5 flex-1 px-3 py-2.5 text-[13px] font-medium text-gray-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-xl transition-all duration-200"
                  >
                    <Palette className="w-[18px] h-[18px]" />
                    Theme
                  </button>
                  <button
                    onClick={() => { void handleLogout(); }}
                    className="flex items-center gap-2.5 flex-1 px-3 py-2.5 text-[13px] font-medium text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all duration-200"
                  >
                    <LogOut className="w-[18px] h-[18px]" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50/50 dark:bg-slate-900">
          <div className="page-enter min-h-full flex flex-col">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Theme Customizer */}
      <ThemeCustomizer open={showCustomizer} onClose={() => setShowCustomizer(false)} />

      {/* Profile Modal */}
      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
};
