import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils';
import { DoctorMatchRequestsPage } from '../DoctorMatchRequestsPage';
import type { MatchRequest } from '../../../lib/types/api';

const { mockToast, mockGetPending, mockSocket } = vi.hoisted(() => ({
  mockToast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  mockGetPending: vi.fn(),
  mockSocket: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    acceptMatch: vi.fn(),
    rejectMatch: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({ default: mockToast }));
vi.mock('../../../api', () => ({ matchingApi: { getPending: (...args: unknown[]) => mockGetPending(...args) } }));
vi.mock('../../../lib/socket/matching.socket', () => ({ matchingSocket: mockSocket }));

function buildRequest(overrides: Partial<MatchRequest> = {}): MatchRequest {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    patientId: crypto.randomUUID(),
    specialty: 'CARDIOLOGY',
    status: 'MATCHED',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as MatchRequest;
}

async function renderWith(requests: MatchRequest[]) {
  mockGetPending.mockResolvedValue(requests);
  render(<DoctorMatchRequestsPage />);
  await screen.findAllByText('New Patient Match');
}

describe('DoctorMatchRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report an accepted match only after the server confirms it', async () => {
    const request = buildRequest();
    let confirm!: () => void;
    mockSocket.acceptMatch.mockReturnValue(new Promise((resolve) => (confirm = () => resolve({ matchRequestId: request.id }))));
    await renderWith([request]);

    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    expect(mockSocket.acceptMatch).toHaveBeenCalledWith(request.id);
    await new Promise((r) => setTimeout(r, 20));
    expect(mockToast.success).not.toHaveBeenCalled();

    confirm();
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Match accepted! Consultation created.'));
  });

  it.each([
    ['the server refuses it', 'Match request is no longer available'],
    ['the socket is not connected', 'Not connected to the matching service. Try again in a moment.'],
  ])('should show the error, not a success, when %s', async (_case, message) => {
    mockSocket.acceptMatch.mockRejectedValue(new Error(message));
    await renderWith([buildRequest()]);

    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(message));
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('should confirm a decline only after the server does, and show its error otherwise', async () => {
    const request = buildRequest();
    mockSocket.rejectMatch.mockResolvedValueOnce({ matchRequestId: request.id });
    await renderWith([request]);

    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Match declined'));

    mockSocket.rejectMatch.mockRejectedValueOnce(new Error('Not your match request'));
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Not your match request'));
  });

  it('should answer one offer at a time', async () => {
    const [first, second] = [buildRequest(), buildRequest()];
    mockSocket.acceptMatch.mockReturnValue(new Promise(() => undefined));
    await renderWith([first, second]);
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });

    fireEvent.click(acceptButtons[0]);
    fireEvent.click(acceptButtons[1]);

    expect(mockSocket.acceptMatch).toHaveBeenCalledTimes(1);
    expect(mockSocket.acceptMatch).toHaveBeenCalledWith(first.id);
  });

  it('should refresh the pending list after an answer, whether it succeeded or not', async () => {
    mockSocket.acceptMatch.mockRejectedValue(new Error('gone'));
    await renderWith([buildRequest()]);
    const callsBefore = mockGetPending.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => expect(mockGetPending.mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
