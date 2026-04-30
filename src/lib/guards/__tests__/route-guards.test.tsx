import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { AuthGuard, PatientGuard, DoctorGuard, AdminGuard, SuperAdminGuard } from '../route-guards';
import { useAuthStore } from '../../stores/auth.store';
import { mockPatientUser, mockDoctorUser, mockAdminUser, mockSuperAdminUser } from '../../../test/mockData';

vi.mock('../../stores/auth.store');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  };
});

describe('Route Guards', () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;
  type AuthStoreSnapshot = ReturnType<typeof useAuthStore>;

  const createMockAuthStore = (overrides: Partial<AuthStoreSnapshot>): AuthStoreSnapshot => ({
    user: null,
    isAuthenticated: false,
    initializing: false,
    setUser: vi.fn(),
    setAuthenticated: vi.fn(),
    setInitializing: vi.fn(),
    clearAuth: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthGuard', () => {
    it('should render children when authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: true,
        user: mockPatientUser,
        initializing: false,
      }));

      render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should redirect to /auth when not authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: false,
        user: null,
        initializing: false,
      }));

      render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(screen.getByTestId('navigate')).toHaveTextContent('/auth');
    });

    it('should show loading when initializing', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: false,
        user: null,
        initializing: true,
      }));

      render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('PatientGuard', () => {
    it('should render children for patient role', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: true,
        user: mockPatientUser,
        initializing: false,
      }));

      render(
        <PatientGuard>
          <TestComponent />
        </PatientGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should redirect to / for non-patient role', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: true,
        user: mockDoctorUser,
        initializing: false,
      }));

      render(
        <PatientGuard>
          <TestComponent />
        </PatientGuard>
      );

      expect(screen.getByTestId('navigate')).toHaveTextContent('/');
    });

    it('should redirect to /auth when not authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: false,
        user: null,
        initializing: false,
      }));

      render(
        <PatientGuard>
          <TestComponent />
        </PatientGuard>
      );

      expect(screen.getByTestId('navigate')).toHaveTextContent('/auth');
    });
  });

  describe('DoctorGuard', () => {
    it('should render children for doctor role', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: true,
        user: mockDoctorUser,
        initializing: false,
      }));

      render(
        <DoctorGuard>
          <TestComponent />
        </DoctorGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should redirect to / for non-doctor role', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: true,
        user: mockPatientUser,
        initializing: false,
      }));

      render(
        <DoctorGuard>
          <TestComponent />
        </DoctorGuard>
      );

      expect(screen.getByTestId('navigate')).toHaveTextContent('/');
    });
  });

  describe('AdminGuard', () => {
    it('should render children for admin user', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: true,
        user: mockAdminUser,
        initializing: false,
      }));

      render(
        <AdminGuard>
          <TestComponent />
        </AdminGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should render children for superadmin user', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: true,
        user: mockSuperAdminUser,
        initializing: false,
      }));

      render(
        <AdminGuard>
          <TestComponent />
        </AdminGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should redirect to / for non-admin user', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: true,
        user: mockPatientUser,
        initializing: false,
      }));

      render(
        <AdminGuard>
          <TestComponent />
        </AdminGuard>
      );

      expect(screen.getByTestId('navigate')).toHaveTextContent('/');
    });
  });

  describe('SuperAdminGuard', () => {
    it('should render children for superadmin user', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: true,
        user: mockSuperAdminUser,
        initializing: false,
      }));

      render(
        <SuperAdminGuard>
          <TestComponent />
        </SuperAdminGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should redirect to / for non-superadmin user', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: true,
        user: mockAdminUser,
        initializing: false,
      }));

      render(
        <SuperAdminGuard>
          <TestComponent />
        </SuperAdminGuard>
      );

      expect(screen.getByTestId('navigate')).toHaveTextContent('/');
    });

    it('should redirect to / for regular user', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockAuthStore({
        isAuthenticated: true,
        user: mockPatientUser,
        initializing: false,
      }));

      render(
        <SuperAdminGuard>
          <TestComponent />
        </SuperAdminGuard>
      );

      expect(screen.getByTestId('navigate')).toHaveTextContent('/');
    });
  });
});
