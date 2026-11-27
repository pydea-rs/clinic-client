import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '../../../test/test-utils';
import { MatchWaitingPage } from '../MatchWaitingPage';

const { mockGetStatus, mockSocketHandlers, mockSocket } = vi.hoisted(() => {
  const handlers = new Map<string, Set<(data: Record<string, unknown>) => void>>();
  return {
    mockGetStatus: vi.fn(),
    mockSocketHandlers: handlers,
    mockSocket: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn((evt: string, cb: (data: Record<string, unknown>) => void) => {
        if (!handlers.has(evt)) handlers.set(evt, new Set());
        handlers.get(evt)?.add(cb);
      }),
      off: vi.fn((evt: string, cb: (data: Record<string, unknown>) => void) => {
        handlers.get(evt)?.delete(cb);
      }),
    },
  };
});

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../../../api', () => ({
  matchingApi: {
    getStatus: (...args: unknown[]) => mockGetStatus(...args),
    cancel: vi.fn(),
    browse: vi.fn(),
  },
}));

vi.mock('../../../lib/socket/matching.socket', () => ({
  matchingSocket: mockSocket,
}));

describe('MatchWaitingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocketHandlers.clear();
  });

  it('refetches and updates displayed doctor immediately when match:offered arrives on cascade', async () => {
    const matchId = crypto.randomUUID();
    const now = new Date().toISOString();

    mockGetStatus
      .mockResolvedValueOnce({
        id: matchId,
        patientId: 'p1',
        status: 'MATCHED',
        matchedDoctorId: 1,
        matchedDoctor: {
          user: { id: 'u1', firstname: 'Sara', lastname: 'First' },
        },
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        id: matchId,
        patientId: 'p1',
        status: 'MATCHED',
        matchedDoctorId: 2,
        matchedDoctor: {
          user: { id: 'u2', firstname: 'Reza', lastname: 'Second' },
        },
        createdAt: now,
        updatedAt: now,
      });

    render(
      <Routes>
        <Route path="/matching/:id/waiting" element={<MatchWaitingPage />} />
      </Routes>,
      { initialEntries: [`/matching/${matchId}/waiting`] },
    );

    expect(await screen.findByText(/Dr\. Sara First/i)).toBeInTheDocument();

    for (const cb of mockSocketHandlers.get('match:offered') ?? []) {
      cb({ matchRequestId: matchId, doctorId: 2 });
    }

    await waitFor(() => {
      expect(screen.getByText(/Dr\. Reza Second/i)).toBeInTheDocument();
    });
  });
});
