import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils';
import { ChatListPage } from '../ChatListPage';
import type { ApiError } from '../../../lib/types/api';

const { mockToast, mockList, mockCreate } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockList: vi.fn(),
  mockCreate: vi.fn(),
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
    connect: () => ({ on: vi.fn(), off: vi.fn() }),
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
