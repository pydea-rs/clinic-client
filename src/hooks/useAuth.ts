import { useState, useEffect } from 'react';
import { AuthState, User } from '../types/chat';
import { ApiService } from '../services/api';

const apiService = ApiService.get();

export const useAuth = (): AuthState & {
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name?: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
} => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const me = await apiService.me<User>();
        if (me) {
          setAuthState({ user: me, isAuthenticated: true });
        } else {
          setAuthState({ user: null, isAuthenticated: false });
        }
      } catch {
        setAuthState({ user: null, isAuthenticated: false });
      } finally {
        setInitializing(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    await apiService.login({ email, password });
    const me = await apiService.me<User>();
    setAuthState({ user: me ?? null, isAuthenticated: !!me });
  };

  const register = async (payload: { name?: string; email: string; password: string }) => {
    await apiService.register(payload);
    // Optionally auto-login after register depending on server behavior
    const me = await apiService.me<User>();
    setAuthState({ user: me ?? null, isAuthenticated: !!me });
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } finally {
      setAuthState({ user: null, isAuthenticated: false });
    }
  };

  return {
    ...authState,
    initializing,
    login,
    register,
    logout,
  };
};