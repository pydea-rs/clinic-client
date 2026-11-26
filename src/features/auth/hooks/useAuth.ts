import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../lib/stores/auth.store';
import { authApi } from '../../../api';
import { queryClient } from '../../../lib/queryClient';
import { socketService } from '../../../lib/socket/socket.service';
import { matchingSocket } from '../../../lib/socket/matching.socket';
import { User } from '../../../lib/types/api';

type RegisterPayload = {
  firstname: string;
  lastname?: string;
  email: string;
  password: string;
  role?: 'PATIENT' | 'DOCTOR';
};

export const useAuth = (): {
  user: User | null;
  isAuthenticated: boolean;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
} => {
  const { user, isAuthenticated, initializing, setUser, setAuthenticated, setInitializing, clearAuth } = useAuthStore();

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
      } catch (error: unknown) {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403) {
          clearAuth();
        } else {
          clearAuth();
          toast.error('Unable to reach the server. Please check your connection.');
        }
      } finally {
        setInitializing(false);
      }
    };
    bootstrap();
  }, [setUser, setAuthenticated, setInitializing, clearAuth]);

  const login = async (email: string, password: string) => {
    await authApi.login(email, password);
    const me = await authApi.me();
    setUser(me);
    setAuthenticated(true);
  };

  const register = async (payload: RegisterPayload) => {
    await authApi.register({
      ...payload,
      lastname: payload.lastname ?? '',
    });
    const me = await authApi.me();
    setUser(me);
    setAuthenticated(true);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      socketService.disconnect();
      matchingSocket.disconnect();
      queryClient.clear();
      clearAuth();
    }
  };

  return {
    user,
    isAuthenticated,
    initializing,
    login,
    register,
    logout,
  };
};
