import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '../../../test/test-utils';
import { DoctorChatPage } from '../DoctorChatPage';
import { useAuthStore } from '../../../lib/stores/auth.store';
import type { Chat, ChatParticipant } from '../../../lib/types/api';
import { buildChat, buildChatParticipant, mockDoctorUser } from '../../../test/mockData';

const { mockList, socketHandlers } = vi.hoisted(() => ({
  mockList: vi.fn(),
  socketHandlers: {} as Record<string, (data: unknown) => void>,
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock('../../../api', () => ({
  chatApi: { list: (...args: unknown[]) => mockList(...args) },
}));

vi.mock('../../../lib/socket/socket.service', () => ({
  socketService: {
    connect: () => ({
      on: (event: string, handler: (data: unknown) => void) => { socketHandlers[event] = handler; },
      off: vi.fn(),
    }),
    isUserOnline: () => false,
  },
}));

const fullName = (p: ChatParticipant) => `${p.firstname} ${p.lastname}`;

async function renderPage(chats: Chat[]) {
  mockList.mockResolvedValue({ chats, total: chats.length });
  render(<DoctorChatPage />);
  await screen.findByRole('heading', { name: 'Patient Chats' });
}

const cardOf = (participant: ChatParticipant) =>
  within(screen.getByRole('heading', { name: fullName(participant) }).closest('a') as HTMLElement);

describe('DoctorChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: mockDoctorUser, isAuthenticated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('should show each patient\'s name and initials', async () => {
    const patients = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () =>
      buildChatParticipant({ role: 'PATIENT' }),
    );

    await renderPage(patients.map((p) => buildChat([p])));

    for (const patient of patients) {
      const initials = `${patient.firstname[0]}${patient.lastname[0]}`.toUpperCase();
      expect(cardOf(patient).getByText(initials)).toBeInTheDocument();
    }
  });

  it('should show the topic under the name when the chat has one', async () => {
    const patient = buildChatParticipant();
    const topic = `Topic ${Math.random().toString(36).slice(2, 8)}`;

    await renderPage([buildChat([patient], { topic })]);

    expect(cardOf(patient).getByText(topic)).toBeInTheDocument();
  });

  it('should find chats by the patient\'s name', async () => {
    const [wanted, other] = [buildChatParticipant(), buildChatParticipant()];
    await renderPage([buildChat([wanted]), buildChat([other])]);

    fireEvent.change(screen.getByPlaceholderText('Search by name or topic...'), {
      target: { value: wanted.lastname.toUpperCase() },
    });

    expect(screen.getByRole('heading', { name: fullName(wanted) })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: fullName(other) })).not.toBeInTheDocument();
  });

  it('should say so when no chat matches the search', async () => {
    await renderPage([buildChat([buildChatParticipant()])]);

    fireEvent.change(screen.getByPlaceholderText('Search by name or topic...'), {
      target: { value: `zz-${crypto.randomUUID()}` },
    });

    expect(screen.getByText('No chats match your search')).toBeInTheDocument();
  });

  it('should mark patients online from the list and from later presence changes', async () => {
    const [online, offline, wentOffline] = [
      buildChatParticipant({ isOnline: true }),
      buildChatParticipant({ isOnline: false }),
      buildChatParticipant({ isOnline: true }),
    ];
    await renderPage([online, offline, wentOffline].map((p) => buildChat([p])));

    expect(cardOf(online).getByText('Online')).toBeInTheDocument();
    expect(cardOf(offline).queryByText('Online')).not.toBeInTheDocument();

    act(() => socketHandlers['user:online']({ userId: wentOffline.id, isOnline: false }));

    expect(cardOf(wentOffline).queryByText('Online')).not.toBeInTheDocument();
    expect(cardOf(online).getByText('Online')).toBeInTheDocument();
  });

  it('should not show an unread badge for read chats', async () => {
    const patient = buildChatParticipant();

    await renderPage([buildChat([patient], { unreadCount: 0 })]);

    expect(cardOf(patient).queryByText('0')).not.toBeInTheDocument();
  });
});
