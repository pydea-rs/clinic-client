import { create } from 'zustand';
import { AuthUser } from '../lib/types/api';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  sessionLoaded: boolean;
  
  // Actions
  setUser: (user: AuthUser | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  loadSession: (user: AuthUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  sessionLoaded: false,

  setUser: (user) => set({ user }),
  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  setInitializing: (initializing) => set({ isInitializing: initializing }),
  
  loadSession: (user) => set({
    user,
    isAuthenticated: true,
    isInitializing: false,
    sessionLoaded: true,
  }),
  
  clearSession: () => set({
    user: null,
    isAuthenticated: false,
    isInitializing: false,
    sessionLoaded: false,
  }),
}));
