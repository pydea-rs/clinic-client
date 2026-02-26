import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../lib/stores/auth.store';
import { authApi } from '../../../api/auth.api';

export const useAuth = (): {
  user: any;
  isAuthenticated: boolean;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { firstname: string; lastname?: string; email: string; password: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
} => {
  const { user, isAuthenticated, initializing, setUser, setAuthenticated, setInitializing, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      setInitializing(true);
      try {
        const me = await authApi.me();
        if (me) {
          setUser(me);
          setAuthenticated(true);
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setInitializing(false);
      }
    };
    bootstrap();
  }, [setUser, setAuthenticated, setInitializing, clearAuth]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authApi.login(email, password);
      const me = await authApi.me();
      setUser(me);
      setAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { firstname: string; lastname?: string; email: string; password: string; role?: string }) => {
    setIsLoading(true);
    try {
      await authApi.register(payload);
      const me = await authApi.me();
      setUser(me);
      setAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      setIsLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    initializing: initializing || isLoading,
    login,
    register,
    logout,
  };
};
