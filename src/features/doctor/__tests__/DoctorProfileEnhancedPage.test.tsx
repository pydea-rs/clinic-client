import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils';
import { DoctorProfileEnhancedPage } from '../DoctorProfileEnhancedPage';
import type { DoctorProfile } from '../../../lib/types/api';

const { mockToast, mockGetMyProfile, mockResubmit } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockGetMyProfile: vi.fn(),
  mockResubmit: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({ default: mockToast }));

vi.mock('../../../api', () => ({
  doctorApi: {
    getMyProfile: (...args: unknown[]) => mockGetMyProfile(...args),
    resubmitForReview: (...args: unknown[]) => mockResubmit(...args),
  },
}));

vi.mock('../DoctorDocumentsPage', () => ({ DoctorDocumentsPage: () => null }));
vi.mock('../DoctorProfileForm', () => ({ DoctorProfileForm: () => null }));

const randomName = () => `N${Math.random().toString(36).slice(2, 8)}`;

function buildProfile(overrides: Partial<DoctorProfile> = {}): DoctorProfile {
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    id: Math.floor(Math.random() * 100_000) + 1,
    userId,
    startedAt: now,
    specialty: 'CARDIOLOGY',
    secondarySpecialties: [],
    visitMethods: ['CHAT'],
    visitTypes: ['CONSULTATION'],
    languages: [],
    verified: false,
    createdAt: now,
    updatedAt: now,
    user: { id: userId, firstname: randomName(), lastname: randomName() },
    ...overrides,
  };
}

const resubmitButton = () => screen.queryByRole('button', { name: /re-submit for review/i });

describe('DoctorProfileEnhancedPage verification status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show the rejection reason and a re-submit button when rejected', async () => {
    const reason = `Unreadable license ${randomName()}`;
    mockGetMyProfile.mockResolvedValue(buildProfile({ rejectionReason: reason }));

    render(<DoctorProfileEnhancedPage />);

    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(resubmitButton()).toBeEnabled();
  });

  it('should re-submit and then show the profile as pending', async () => {
    const rejected = buildProfile({ rejectionReason: 'Expired license' });
    mockGetMyProfile
      .mockResolvedValueOnce(rejected)
      .mockResolvedValue({ ...rejected, rejectionReason: undefined });
    mockResubmit.mockResolvedValue({ ...rejected, rejectionReason: undefined });

    render(<DoctorProfileEnhancedPage />);
    fireEvent.click(await screen.findByRole('button', { name: /re-submit for review/i }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Profile re-submitted for review');
    });
    expect(mockResubmit).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Pending Verification')).toBeInTheDocument();
    expect(screen.queryByText('Expired license')).not.toBeInTheDocument();
    expect(resubmitButton()).not.toBeInTheDocument();
    expect(mockGetMyProfile).toHaveBeenCalledTimes(2);
  });

  it('should show the server error and stay rejected when re-submitting fails', async () => {
    const message = 'Your verification status changed. Please reload and try again.';
    mockGetMyProfile.mockResolvedValue(buildProfile({ rejectionReason: 'Expired license' }));
    mockResubmit.mockRejectedValue({ statusCode: 409, message });

    render(<DoctorProfileEnhancedPage />);
    fireEvent.click(await screen.findByRole('button', { name: /re-submit for review/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(message);
    });
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(screen.getByText('Expired license')).toBeInTheDocument();
    expect(resubmitButton()).toBeEnabled();
  });

  it('should disable the button while re-submitting', async () => {
    mockGetMyProfile.mockResolvedValue(buildProfile({ rejectionReason: 'Expired license' }));
    mockResubmit.mockReturnValue(new Promise(() => undefined));

    render(<DoctorProfileEnhancedPage />);
    fireEvent.click(await screen.findByRole('button', { name: /re-submit for review/i }));

    expect(await screen.findByRole('button', { name: /re-submitting/i })).toBeDisabled();
  });

  it.each([
    ['pending', buildProfile(), 'Pending Verification'],
    ['verified', buildProfile({ verified: true, verifiedAt: new Date().toISOString() }), 'Verified'],
  ])('should not offer re-submitting when %s', async (_case, profile, badge) => {
    mockGetMyProfile.mockResolvedValue(profile);

    render(<DoctorProfileEnhancedPage />);

    expect(await screen.findByText(badge)).toBeInTheDocument();
    expect(resubmitButton()).not.toBeInTheDocument();
  });
});
