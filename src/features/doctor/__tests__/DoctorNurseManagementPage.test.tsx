import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '../../../test/test-utils';
import { DoctorNurseManagementPage } from '../DoctorNurseManagementPage';
import type { NurseAssignment, NursePermission } from '../../../lib/types/api';

const { mockToast, mockGetAssignments, mockUpdatePermissions, mockAssign, mockRemove, mockSearchUsers } =
  vi.hoisted(() => ({
    mockToast: { success: vi.fn(), error: vi.fn() },
    mockGetAssignments: vi.fn(),
    mockUpdatePermissions: vi.fn(),
    mockAssign: vi.fn(),
    mockRemove: vi.fn(),
    mockSearchUsers: vi.fn(),
  }));

vi.mock('react-hot-toast', () => ({ default: mockToast }));

vi.mock('../../../api', () => ({
  nurseApi: {
    getAssignments: (...args: unknown[]) => mockGetAssignments(...args),
    updatePermissions: (...args: unknown[]) => mockUpdatePermissions(...args),
    assign: (...args: unknown[]) => mockAssign(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
  userApi: { searchUsers: (...args: unknown[]) => mockSearchUsers(...args) },
}));

const randomName = () => `N${Math.random().toString(36).slice(2, 8)}`;

function buildAssignment(overrides: Partial<NurseAssignment> = {}): NurseAssignment {
  const nurseId = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    id: Math.floor(Math.random() * 100_000) + 1,
    doctorId: Math.floor(Math.random() * 100_000) + 1,
    nurseId,
    permissions: ['VIEW_PATIENTS', 'VIEW_SOAPS'],
    isActive: true,
    status: 'ACCEPTED',
    createdAt: now,
    updatedAt: now,
    nurse: {
      id: nurseId,
      firstname: randomName(),
      lastname: randomName(),
      email: `${randomName().toLowerCase()}@test.local`,
    },
    ...overrides,
  };
}

async function renderWith(assignment: NurseAssignment) {
  mockGetAssignments.mockResolvedValue([assignment]);
  render(<DoctorNurseManagementPage />);
  const name = `${assignment.nurse?.firstname} ${assignment.nurse?.lastname}`;
  const heading = await screen.findByText(name);
  return within(heading.closest('.card') as HTMLElement);
}

describe('DoctorNurseManagementPage', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchUsers.mockResolvedValue([]);
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  describe('Revoke All', () => {
    it('should send an empty permission list once confirmed', async () => {
      const assignment = buildAssignment();
      mockUpdatePermissions.mockResolvedValue({ ...assignment, permissions: [] });
      const card = await renderWith(assignment);

      fireEvent.click(card.getByRole('button', { name: 'Revoke All' }));

      await waitFor(() => {
        expect(mockUpdatePermissions).toHaveBeenCalledWith(assignment.id, []);
      });
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Permissions updated');
      });
    });

    it('should do nothing when not confirmed', async () => {
      confirmSpy.mockReturnValue(false);
      const card = await renderWith(buildAssignment());

      fireEvent.click(card.getByRole('button', { name: 'Revoke All' }));

      expect(mockUpdatePermissions).not.toHaveBeenCalled();
    });

    it('should be disabled when the nurse has no permissions', async () => {
      const card = await renderWith(buildAssignment({ permissions: [] }));

      expect(card.getByRole('button', { name: 'Revoke All' })).toBeDisabled();
    });

    it('should show the server error when revoking fails', async () => {
      const message = 'Cannot update permissions on an inactive assignment.';
      mockUpdatePermissions.mockRejectedValue({ statusCode: 400, message });
      const card = await renderWith(buildAssignment());

      fireEvent.click(card.getByRole('button', { name: 'Revoke All' }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(message);
      });
      expect(mockToast.success).not.toHaveBeenCalled();
    });
  });

  describe('permission toggles', () => {
    it('should send an empty list when the last permission is turned off', async () => {
      const permission: NursePermission = 'VIEW_SOAPS';
      const assignment = buildAssignment({ permissions: [permission] });
      mockUpdatePermissions.mockResolvedValue({ ...assignment, permissions: [] });
      const card = await renderWith(assignment);

      fireEvent.click(card.getByRole('button', { name: /view soaps/i }));

      await waitFor(() => {
        expect(mockUpdatePermissions).toHaveBeenCalledWith(assignment.id, []);
      });
    });

    it('should add a permission that is turned on', async () => {
      const assignment = buildAssignment({ permissions: ['VIEW_PATIENTS'] });
      mockUpdatePermissions.mockResolvedValue(assignment);
      const card = await renderWith(assignment);

      fireEvent.click(card.getByRole('button', { name: /view soaps/i }));

      await waitFor(() => {
        expect(mockUpdatePermissions).toHaveBeenCalledWith(assignment.id, ['VIEW_PATIENTS', 'VIEW_SOAPS']);
      });
    });
  });

  describe('inviting a nurse', () => {
    const patient = () => ({
      id: crypto.randomUUID(),
      firstname: randomName(),
      lastname: randomName(),
      email: `${randomName().toLowerCase()}@test.local`,
      role: 'PATIENT',
    });

    async function pickAndInvite(user: ReturnType<typeof patient>) {
      mockGetAssignments.mockResolvedValue([]);
      mockSearchUsers.mockResolvedValue([user]);
      render(<DoctorNurseManagementPage />);
      fireEvent.change(screen.getByPlaceholderText('Search by name or email...'), {
        target: { value: user.firstname },
      });
      fireEvent.click(await screen.findByText(`${user.firstname} ${user.lastname}`));
      fireEvent.click(screen.getByRole('button', { name: /Send Invitation/ }));
    }

    it('should send the invitation straight away, with no role-change dialog', async () => {
      const user = patient();
      mockAssign.mockResolvedValue(buildAssignment({ nurseId: user.id, status: 'PENDING', isActive: false }));

      await pickAndInvite(user);

      await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Invitation sent'));
      expect(mockAssign).toHaveBeenCalledWith(user.id, undefined);
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(screen.queryByText('Role Change Required')).not.toBeInTheDocument();
    });

    it.each([
      'Only verified doctors can invite nurses.',
      'This user already has a pending invitation from you.',
    ])('should show the server refusal "%s"', async (message) => {
      mockAssign.mockRejectedValue({ status: 403, message });

      await pickAndInvite(patient());

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(message));
      expect(mockToast.success).not.toHaveBeenCalled();
    });
  });

  describe('a pending invitation', () => {
    const invitation = () => buildAssignment({ status: 'PENDING', isActive: false });

    it('should show as Invited, without Revoke All, and with permissions read-only', async () => {
      const card = await renderWith(invitation());

      expect(card.getByText('Invited')).toBeInTheDocument();
      expect(card.queryByRole('button', { name: 'Revoke All' })).not.toBeInTheDocument();
      expect(card.getByText('Permissions offered')).toBeInTheDocument();
      fireEvent.click(card.getByRole('button', { name: 'View Patients' }));
      expect(mockUpdatePermissions).not.toHaveBeenCalled();
    });

    it('should be cancelled once confirmed', async () => {
      const pending = invitation();
      mockRemove.mockResolvedValue(pending);
      const card = await renderWith(pending);

      fireEvent.click(card.getByRole('button', { name: 'Cancel invitation' }));

      expect(confirmSpy).toHaveBeenCalledWith(
        `Cancel the invitation to ${pending.nurse?.firstname} ${pending.nurse?.lastname}?`,
      );
      await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(pending.id));
      await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Invitation cancelled'));
    });

    it('should stay when the cancellation is not confirmed', async () => {
      confirmSpy.mockReturnValue(false);
      const card = await renderWith(invitation());

      fireEvent.click(card.getByRole('button', { name: 'Cancel invitation' }));

      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('should still remove an active nurse with the removal wording', async () => {
      const active = buildAssignment();
      mockRemove.mockResolvedValue({ ...active, isActive: false });
      const card = await renderWith(active);

      expect(card.getByText('Active')).toBeInTheDocument();
      fireEvent.click(card.getByRole('button', { name: 'Remove nurse' }));

      await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Nurse removed successfully'));
    });
  });
});
