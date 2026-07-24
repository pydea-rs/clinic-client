import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../auth.store';
import { mockPatientUser, mockDoctorUser } from '../../../test/mockData';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      initializing: true,
    });
  });

  describe('initial state', () => {
    it('should start with null user and not authenticated', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.initializing).toBe(true);
    });
  });

  describe('setUser', () => {
    it('should set user', () => {
      useAuthStore.getState().setUser(mockPatientUser);
      expect(useAuthStore.getState().user).toEqual(mockPatientUser);
    });

    it('should overwrite existing user', () => {
      useAuthStore.getState().setUser(mockPatientUser);
      useAuthStore.getState().setUser(mockDoctorUser);
      expect(useAuthStore.getState().user).toEqual(mockDoctorUser);
    });

    it('should set user to null', () => {
      useAuthStore.getState().setUser(mockPatientUser);
      useAuthStore.getState().setUser(null);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('setAuthenticated', () => {
    it('should set authenticated to true', () => {
      useAuthStore.getState().setAuthenticated(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should set authenticated to false', () => {
      useAuthStore.getState().setAuthenticated(true);
      useAuthStore.getState().setAuthenticated(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('setInitializing', () => {
    it('should set initializing to false', () => {
      useAuthStore.getState().setInitializing(false);
      expect(useAuthStore.getState().initializing).toBe(false);
    });
  });

  describe('clearAuth', () => {
    it('should reset user, authentication, and initializing', () => {
      useAuthStore.getState().setUser(mockPatientUser);
      useAuthStore.getState().setAuthenticated(true);
      useAuthStore.getState().setInitializing(true);

      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.initializing).toBe(false);
    });

    it('should be safe to call when already cleared', () => {
      useAuthStore.getState().clearAuth();
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
