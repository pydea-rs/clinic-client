import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '../../../test/test-utils';
import { ChatListPage } from '../ChatListPage';
import { useAuthStore } from '../../../lib/stores/auth.store';
import type { ApiError, Chat } from '../../../lib/types/api';
import { buildChat, buildChatParticipant, mockPatientUser } from '../../../test/mockData';

const { mockToast, mockList, mockCreate, socketHandlers } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockList: vi.fn(),
  mockCreate: vi.fn(),
  socketHandlers: {} as Record<string, (data: unknown) => void>,
}));

vi.mock('react-hot-toast', () => ({ default: mockToast }));

vi.mock('../../../api', () => ({
  chatApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
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

const apiError = (status: number, message: string): ApiError => ({
  status,
  message,
  contents: null,
  timestamp: new Date().toISOString(),
  path: '/chat',
});

async function startChatWith(participantId: string) {
  render(<ChatListPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Start a Chat' }));
  fireEvent.change(screen.getByPlaceholderText('Enter user ID'), {
    target: { value: participantId },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
}

describe('ChatListPage — starting a chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ chats: [], total: 0 });
  });

  it('should create the chat, close the dialog and reload the list', async () => {
    const participantId = crypto.randomUUID();
    mockCreate.mockResolvedValue({ id: crypto.randomUUID() });

    await startChatWith(participantId);

    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Chat created successfully'));
    expect(mockCreate).toHaveBeenCalledWith({ participantId, topic: undefined });
    expect(mockList).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Create New Chat')).not.toBeInTheDocument();
  });

  it.each([
    'You can only start chats with your own patients',
    'You can only start chats with doctors you are assigned to',
    'You cannot start a chat with this user',
  ])('should show the server refusal "%s" and keep the dialog open', async (message) => {
    mockCreate.mockRejectedValue(apiError(403, message));

    await startChatWith(crypto.randomUUID());

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(message));
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(screen.getByText('Create New Chat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });
});

describe('ChatListPage — listing chats', () => {
  const fullName = (p: { firstname: string; lastname: string }) => `${p.firstname} ${p.lastname}`;

  async function renderList(chats: Chat[]) {
    mockList.mockResolvedValue({ chats, total: chats.length });
    render(<ChatListPage />);
    await screen.findByRole('heading', { name: 'Chats' });
  }

  const cardOf = (title: string) => within(screen.getByRole('heading', { name: title }).closest('a') as HTMLElement);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: mockPatientUser, isAuthenticated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('should title each chat without a topic with the other participant\'s name', async () => {
    const others = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => buildChatParticipant());

    await renderList(others.map((other) => buildChat([other])));

    for (const other of others) {
      expect(screen.getByRole('heading', { name: fullName(other) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', { name: 'Chat' })).not.toBeInTheDocument();
  });

  it('should prefer the topic over the participant\'s name', async () => {
    const other = buildChatParticipant();
    const topic = `Topic ${Math.random().toString(36).slice(2, 8)}`;

    await renderList([buildChat([other], { topic })]);

    expect(screen.getByRole('heading', { name: topic })).toBeInTheDocument();
    expect(screen.queryByText(fullName(other))).not.toBeInTheDocument();
  });

  it('should mark only the participants the server reports online', async () => {
    const online = buildChatParticipant({ isOnline: true });
    const offline = buildChatParticipant({ isOnline: false });

    await renderList([buildChat([online]), buildChat([offline])]);

    expect(cardOf(fullName(online)).getByText('Online')).toBeInTheDocument();
    expect(cardOf(fullName(offline)).queryByText('Online')).not.toBeInTheDocument();
  });

  it('should follow presence changes after the list was loaded', async () => {
    const wentOffline = buildChatParticipant({ isOnline: true });
    const cameOnline = buildChatParticipant({ isOnline: false });
    await renderList([buildChat([wentOffline]), buildChat([cameOnline])]);

    act(() => {
      socketHandlers['user:online']({ userId: wentOffline.id, isOnline: false });
      socketHandlers['user:online']({ userId: cameOnline.id, isOnline: true });
    });

    expect(cardOf(fullName(wentOffline)).queryByText('Online')).not.toBeInTheDocument();
    expect(cardOf(fullName(cameOnline)).getByText('Online')).toBeInTheDocument();
  });

  it('should show the unread badge only when there are unread messages', async () => {
    const unread = 1 + Math.floor(Math.random() * 9);
    const withUnread = buildChatParticipant();
    const allRead = buildChatParticipant();

    await renderList([
      buildChat([withUnread], { unreadCount: unread }),
      buildChat([allRead], { unreadCount: 0 }),
    ]);

    expect(cardOf(fullName(withUnread)).getByText(String(unread))).toBeInTheDocument();
    expect(cardOf(fullName(allRead)).queryByText('0')).not.toBeInTheDocument();
  });
});
