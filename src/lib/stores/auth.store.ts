import { create } from 'zustand';
import { User, AuthState } from '../types/api';

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  initializing: true,
  
  setUser: (user) => set({ user }),
  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  setInitializing: (initializing) => set({ initializing }),
  
  clearAuth: () => set({ user: null, isAuthenticated: false, initializing: false }),
}));
