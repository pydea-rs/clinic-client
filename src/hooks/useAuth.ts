import { useState, useEffect } from 'react';
import { AuthState } from '../types/chat';
import { ApiService } from '../services/api';

const apiService = ApiService.get();

export const useAuth = (): AuthState & { login: (token: string) => void; logout: () => void } => {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    if (storedToken) {
      apiService.setAuthToken(storedToken);
      setAuthState({
        token: storedToken,
        isAuthenticated: true,
      });
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem('jwt_token', token);
    apiService.setAuthToken(token);
    setAuthState({
      token,
      isAuthenticated: true,
    });
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    apiService.clearAuthToken();
    setAuthState({
      token: null,
      isAuthenticated: false,
    });
  };

  return {
    ...authState,
    login,
    logout,
  };
};