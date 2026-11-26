import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/test-utils';
import { Shell } from '../Shell';
import { PatientProfilePage } from '../../features/patient/PatientProfilePage';
import { useAuthStore } from '../../lib/stores/auth.store';
import { getApiBaseUrl, setApiBaseUrl } from '../../lib/api/client';
import { mockPatientUser } from '../../test/mockData';

const { mockUploadAvatar, mockGetCurrentUser, mockUpdateProfile, mockToast } = vi.hoisted(() => ({
  mockUploadAvatar: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockUpdateProfile: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({ default: mockToast }));

vi.mock('../../api', () => ({
  authApi: { logout: vi.fn() },
  userApi: {
    uploadAvatar: (...args: unknown[]) => mockUploadAvatar(...args),
    getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
    changePassword: vi.fn(),
  },
  nurseApi: { getAssignments: vi.fn().mockResolvedValue([]), getInvitations: vi.fn().mockResolvedValue([]) },
  notificationApi: { list: vi.fn().mockResolvedValue({ notifications: [], unreadCount: 0 }), getUnreadCount: vi.fn().mockResolvedValue({ count: 0 }) },
}));

vi.mock('../../features/notification/NotificationBell', () => ({ NotificationBell: () => null }));
vi.mock('../../features/nurse/useNurseAssignments', () => ({
  useNurseAssignments: () => ({ assignments: [], isLoading: false }),
}));
vi.mock('../../features/nurse/NurseInvitationsBanner', () => ({ NurseInvitationsBanner: () => null }));
vi.mock('../ThemeCustomizer', () => ({ ThemeCustomizer: () => null }));
vi.mock('../../lib/socket/socket.service', () => ({ socketService: { disconnect: vi.fn() } }));

const API_BASE_URL = 'https://api.clinic.test';

describe('Sidebar & Profile Avatar sync', () => {
  const originalBaseUrl = getApiBaseUrl();

  beforeEach(() => {
    vi.clearAllMocks();
    setApiBaseUrl(API_BASE_URL);
  });

  afterEach(() => {
    setApiBaseUrl(originalBaseUrl);
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('shows the user avatar in the sidebar corner when set, and initials otherwise', () => {
    const avatar = `/uploads/avatars/${crypto.randomUUID()}.png`;
    useAuthStore.setState({ user: { ...mockPatientUser, avatar }, isAuthenticated: true });

    const { rerender } = render(<Shell><div>content</div></Shell>);
    expect(screen.getByAltText(`${mockPatientUser.firstname} ${mockPatientUser.lastname}`))
      .toHaveAttribute('src', `${API_BASE_URL}${avatar}`);

    useAuthStore.setState({ user: { ...mockPatientUser, avatar: undefined }, isAuthenticated: true });
    rerender(<Shell><div>content</div></Shell>);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('JP')).toBeInTheDocument();
  });

  it('updates sidebar corner avatar immediately after uploading in ProfileModal', async () => {
    const uploadedAvatar = `/uploads/avatars/${crypto.randomUUID()}.png`;
    useAuthStore.setState({ user: { ...mockPatientUser, avatar: undefined }, isAuthenticated: true });
    mockUploadAvatar.mockResolvedValue({ id: mockPatientUser.id, avatar: uploadedAvatar });

    const { container } = render(<Shell><div>content</div></Shell>);
    expect(screen.getByText('JP')).toBeInTheDocument();

    fireEvent.click(screen.getByText(`${mockPatientUser.firstname} ${mockPatientUser.lastname}`).closest('button') as HTMLElement);
    await screen.findByRole('button', { name: 'Profile' });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['png'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByAltText('Avatar').getAttribute('src')).toMatch(/^data:image\/png;base64,/),
    );

    const uploadBtn = await screen.findByRole('button', { name: 'Upload' });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Avatar updated');
    });
    expect(useAuthStore.getState().user?.avatar).toBe(uploadedAvatar);
    const avatars = screen.getAllByAltText(`${mockPatientUser.firstname} ${mockPatientUser.lastname}`);
    expect(avatars[0]).toHaveAttribute('src', `${API_BASE_URL}${uploadedAvatar}`);
  });

  it('updates auth store avatar and keeps preview after uploading in PatientProfilePage', async () => {
    const uploadedAvatar = `/uploads/avatars/${crypto.randomUUID()}.png`;
    useAuthStore.setState({ user: { ...mockPatientUser }, isAuthenticated: true });
    mockGetCurrentUser.mockResolvedValue({ ...mockPatientUser });
    mockUploadAvatar.mockResolvedValue({ id: mockPatientUser.id, avatar: uploadedAvatar });

    const { container } = render(<PatientProfilePage />);
    await screen.findByDisplayValue(mockPatientUser.firstname);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['png'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByAltText('Avatar').getAttribute('src')).toMatch(/^data:image\/png;base64,/),
    );

    const uploadBtn = await screen.findByRole('button', { name: 'Upload Avatar' });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Avatar uploaded successfully');
    });
    expect(useAuthStore.getState().user?.avatar).toBe(uploadedAvatar);
    expect(screen.getByAltText('Avatar')).toHaveAttribute('src', `${API_BASE_URL}${uploadedAvatar}`);
  });
});
