import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '../../../test/test-utils';
import { DoctorNurseManagementPage } from '../DoctorNurseManagementPage';
import type { NurseAssignment, NursePermission } from '../../../lib/types/api';

const { mockToast, mockGetAssignments, mockUpdatePermissions } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockGetAssignments: vi.fn(),
  mockUpdatePermissions: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({ default: mockToast }));

vi.mock('../../../api', () => ({
  nurseApi: {
    getAssignments: (...args: unknown[]) => mockGetAssignments(...args),
    updatePermissions: (...args: unknown[]) => mockUpdatePermissions(...args),
    assign: vi.fn(),
    remove: vi.fn(),
  },
  userApi: { searchUsers: vi.fn().mockResolvedValue([]) },
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
});
