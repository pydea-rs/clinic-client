import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '../../../test/test-utils';
import { NurseInvitationsPage } from '../NurseInvitationsPage';
import { NurseInvitationsBanner } from '../NurseInvitationsBanner';
import { useAuthStore } from '../../../lib/stores/auth.store';
import type { NurseAssignment, User } from '../../../lib/types/api';

const { mockToast, mockNavigate, mockGetInvitations, mockAccept, mockDecline, mockMe } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockNavigate: vi.fn(),
  mockGetInvitations: vi.fn(),
  mockAccept: vi.fn(),
  mockDecline: vi.fn(),
  mockMe: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({ default: mockToast }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../api', () => ({
  nurseApi: {
    getInvitations: (...args: unknown[]) => mockGetInvitations(...args),
    acceptInvitation: (...args: unknown[]) => mockAccept(...args),
    declineInvitation: (...args: unknown[]) => mockDecline(...args),
  },
  authApi: { me: (...args: unknown[]) => mockMe(...args) },
}));

const randomName = () => `N${Math.random().toString(36).slice(2, 8)}`;

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: crypto.randomUUID(),
    firstname: randomName(),
    lastname: randomName(),
    email: `${randomName().toLowerCase()}@test.local`,
    role: 'PATIENT',
    isAdmin: false,
    isSuperAdmin: false,
    ...overrides,
  } as User;
}

function buildInvitation(overrides: Partial<NurseAssignment> = {}): NurseAssignment {
  const now = new Date().toISOString();
  return {
    id: Math.floor(Math.random() * 100_000) + 1,
    doctorId: Math.floor(Math.random() * 100_000) + 1,
    nurseId: crypto.randomUUID(),
    permissions: ['VIEW_PATIENTS', 'CHAT_WITH_PATIENTS'],
    isActive: false,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
    doctor: {
      specialty: 'CARDIOLOGY',
      user: { id: crypto.randomUUID(), firstname: randomName(), lastname: randomName() },
    } as NurseAssignment['doctor'],
    ...overrides,
  };
}

const doctorName = (invitation: NurseAssignment) =>
  `Dr. ${invitation.doctor?.user?.firstname} ${invitation.doctor?.user?.lastname}`;

async function renderPage(invitations: NurseAssignment[], user = buildUser()) {
  useAuthStore.setState({ user, isAuthenticated: true });
  mockGetInvitations.mockResolvedValue(invitations);
  render(<NurseInvitationsPage />);
  if (invitations.length === 0) return null;
  const heading = await screen.findByText(doctorName(invitations[0]));
  return within(heading.closest('.card') as HTMLElement);
}

describe('NurseInvitationsPage', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('should list each invitation with the doctor, specialty and offered permissions', async () => {
    const card = await renderPage([buildInvitation()]);

    expect(card!.getByText('Cardiology')).toBeInTheDocument();
    expect(card!.getByText('View Patients')).toBeInTheDocument();
    expect(card!.getByText('Chat With Patients')).toBeInTheDocument();
  });

  it('should say so when there are no invitations', async () => {
    await renderPage([]);

    expect(await screen.findByText('No pending invitations')).toBeInTheDocument();
  });

  it('should warn a patient, accept, refresh their role and open the nurse dashboard', async () => {
    const invitation = buildInvitation();
    const patient = buildUser();
    const asNurse = { ...patient, role: 'NURSE' } as User;
    mockAccept.mockResolvedValue({ ...invitation, status: 'ACCEPTED', isActive: true });
    mockMe.mockResolvedValue(asNurse);
    const card = await renderPage([invitation], patient);

    fireEvent.click(card!.getByRole('button', { name: 'Accept' }));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining(doctorName(invitation)));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('no longer use it as a patient'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/nurse/dashboard'));
    expect(mockAccept).toHaveBeenCalledWith(invitation.id);
    expect(useAuthStore.getState().user).toEqual(asNurse);
    expect(mockToast.success).toHaveBeenCalledWith(`You joined ${doctorName(invitation)}'s team`);
  });

  it('should do nothing when the patient does not confirm', async () => {
    confirmSpy.mockReturnValue(false);
    const card = await renderPage([buildInvitation()]);

    fireEvent.click(card!.getByRole('button', { name: 'Accept' }));

    expect(mockAccept).not.toHaveBeenCalled();
  });

  it('should accept without the warning for someone who already is a nurse', async () => {
    const invitation = buildInvitation();
    const nurse = buildUser({ role: 'NURSE' });
    mockAccept.mockResolvedValue({ ...invitation, status: 'ACCEPTED' });
    mockMe.mockResolvedValue(nurse);
    const card = await renderPage([invitation], nurse);

    fireEvent.click(card!.getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(mockAccept).toHaveBeenCalledWith(invitation.id));
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['accept', 'Accept', mockAccept],
    ['decline', 'Decline', mockDecline],
  ])('should show the server refusal when %s fails, and stay', async (_case, button, mock) => {
    const message = 'This invitation has already been answered.';
    mock.mockRejectedValue({ status: 409, message });
    const card = await renderPage([buildInvitation()]);

    fireEvent.click(card!.getByRole('button', { name: button }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(message));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockMe).not.toHaveBeenCalled();
  });

  it('should decline without changing the user or leaving the page', async () => {
    const invitation = buildInvitation();
    mockDecline.mockResolvedValue({ ...invitation, status: 'DECLINED' });
    const card = await renderPage([invitation]);

    fireEvent.click(card!.getByRole('button', { name: 'Decline' }));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Invitation declined'));
    expect(mockDecline).toHaveBeenCalledWith(invitation.id);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(mockMe).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('NurseInvitationsBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/dashboard');
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  const renderBanner = (user: User | null) => {
    useAuthStore.setState({ user, isAuthenticated: !!user });
    return render(<NurseInvitationsBanner />);
  };

  it.each(['PATIENT', 'NONE', 'NURSE'] as const)('should link a %s with invitations to them', async (role) => {
    mockGetInvitations.mockResolvedValue([buildInvitation()]);

    renderBanner(buildUser({ role }));

    const link = await screen.findByRole('link', { name: /invited you to join their team/ });
    expect(link).toHaveAttribute('href', '/invitations');
  });

  it('should count several invitations', async () => {
    const count = 2 + Math.floor(Math.random() * 3);
    mockGetInvitations.mockResolvedValue(Array.from({ length: count }, () => buildInvitation()));

    renderBanner(buildUser());

    expect(await screen.findByText(new RegExp(`${count} doctors invited you`))).toBeInTheDocument();
  });

  it('should show nothing without invitations', async () => {
    mockGetInvitations.mockResolvedValue([]);

    renderBanner(buildUser());

    await waitFor(() => expect(mockGetInvitations).toHaveBeenCalled());
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it.each([
    ['a doctor', () => buildUser({ role: 'DOCTOR' })],
    ['an admin', () => buildUser({ role: 'NONE', isAdmin: true })],
    ['nobody', () => null],
  ])('should not even ask for invitations for %s', async (_case, user) => {
    renderBanner(user());

    await new Promise((r) => setTimeout(r, 20));
    expect(mockGetInvitations).not.toHaveBeenCalled();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should hide on the invitations page itself', async () => {
    window.history.pushState({}, '', '/invitations');
    mockGetInvitations.mockResolvedValue([buildInvitation()]);

    renderBanner(buildUser());

    await waitFor(() => expect(mockGetInvitations).toHaveBeenCalled());
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
