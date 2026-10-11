import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { ChatRoomPage } from '../ChatRoomPage';
import { useAuthStore } from '../../../lib/stores/auth.store';
import type { Chat, ChatParticipant, Message } from '../../../lib/types/api';
import { buildChat, buildChatParticipant, mockPatientUser } from '../../../test/mockData';

const { mockGetById, mockGetMessages, mockMarkAsRead, socketHandlers } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockGetMessages: vi.fn(),
  mockMarkAsRead: vi.fn(),
  socketHandlers: {} as Record<string, (data: unknown) => void>,
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock('react-virtuoso', () => ({
  Virtuoso: React.forwardRef(function Virtuoso(
    { data, itemContent }: { data: unknown[]; itemContent: (index: number, item: unknown) => React.ReactNode },
    _ref: React.Ref<unknown>,
  ) {
    return <div>{data.map((item, i) => <div key={i}>{itemContent(i, item)}</div>)}</div>;
  }),
}));

vi.mock('../../../api', () => ({
  chatApi: {
    getById: (...args: unknown[]) => mockGetById(...args),
    getMessages: (...args: unknown[]) => mockGetMessages(...args),
  },
}));

vi.mock('../../../lib/socket/socket.service', () => ({
  socketService: {
    connect: () => ({
      on: (event: string, handler: (data: unknown) => void) => { socketHandlers[event] = handler; },
      off: vi.fn(),
    }),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    onStatusChange: () => () => {},
    isConnected: () => true,
    isUserOnline: () => false,
    markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
    sendTyping: vi.fn(),
  },
}));

const me: ChatParticipant = buildChatParticipant({
  id: mockPatientUser.id,
  firstname: mockPatientUser.firstname,
  lastname: mockPatientUser.lastname,
  role: 'PATIENT',
});
const fullName = (p: ChatParticipant) => `${p.firstname} ${p.lastname}`;

/** The chat's messages, oldest first, alternating senders. */
function buildHistory(chat: Chat, other: ChatParticipant, count: number): Message[] {
  const start = Date.now() - count * 60_000;
  const firstId = 1 + Math.floor(Math.random() * 1e9);
  return Array.from({ length: count }, (_, i) => {
    const at = new Date(start + i * 60_000).toISOString();
    return {
      id: String(firstId + i),
      chatId: chat.id,
      senderId: i % 2 ? me.id : other.id,
      content: `msg-${i}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'TEXT',
      createdAt: at,
      updatedAt: at,
    };
  });
}

function setUp({ other = buildChatParticipant(), historyLength = 1 + Math.floor(Math.random() * 8) } = {}) {
  const participants = Math.random() < 0.5 ? [me, other] : [other, me];
  const chat = buildChat(participants);
  const history = buildHistory(chat, other, historyLength);
  mockGetById.mockResolvedValue(chat);
  mockGetMessages.mockResolvedValue({ messages: history, total: history.length });
  return { chat, other, history };
}

function renderRoom(chat: Chat, nextChat?: Chat) {
  render(
    <MemoryRouter initialEntries={[`/chat/${chat.id}`]}>
      <Routes>
        <Route
          path="/chat/:id"
          element={<>
            <ChatRoomPage />
            {nextChat && <Link to={`/chat/${nextChat.id}`}>next chat</Link>}
          </>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

const shownMessages = () => screen.queryAllByText(/^msg-/).map((el) => el.textContent);

describe('ChatRoomPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const event of Object.keys(socketHandlers)) delete socketHandlers[event];
    useAuthStore.setState({ user: mockPatientUser, isAuthenticated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('should title the chat with the other participant\'s name', async () => {
    const { chat, other } = setUp();

    renderRoom(chat);

    expect(await screen.findByRole('heading', { name: fullName(other) })).toBeInTheDocument();
  });

  it.each([true, false])('should show the other participant online only when they are (%s)', async (isOnline) => {
    const { chat, other } = setUp({ other: buildChatParticipant({ isOnline }) });

    renderRoom(chat);
    await screen.findByRole('heading', { name: fullName(other) });

    expect(screen.queryByText('Online') !== null).toBe(isOnline);
  });

  it('should follow the other participant\'s presence changes', async () => {
    const { chat, other } = setUp({ other: buildChatParticipant({ isOnline: true }) });
    renderRoom(chat);
    await screen.findByText('Online');

    act(() => socketHandlers['user:online']({ userId: other.id, isOnline: false }));
    expect(screen.queryByText('Online')).not.toBeInTheDocument();

    act(() => socketHandlers['user:online']({ userId: other.id, isOnline: true }));
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('should show the history oldest first and add new messages below it', async () => {
    const { chat, other, history } = setUp();
    renderRoom(chat);
    await screen.findByRole('heading', { name: fullName(other) });

    expect(shownMessages()).toEqual(history.map((m) => m.content));

    const incoming = { ...buildHistory(chat, other, 1)[0], id: String(Date.now()), content: `msg-new-${Date.now()}` };
    act(() => socketHandlers['chat:message']({ message: incoming }));

    expect(shownMessages()).toEqual([...history.map((m) => m.content), incoming.content]);
    expect(mockMarkAsRead).toHaveBeenCalledWith(chat.id, incoming.id);
  });

  it('should keep messages that arrive while the history is loading, once each', async () => {
    const { chat, other, history } = setUp({ historyLength: 2 + Math.floor(Math.random() * 6) });
    let resolveHistory!: (page: { messages: Message[]; total: number }) => void;
    mockGetMessages.mockReturnValue(new Promise((resolve) => { resolveHistory = resolve; }));
    renderRoom(chat);
    await waitFor(() => expect(socketHandlers['chat:message']).toBeDefined());

    const early = { ...history[0], id: String(Date.now()), content: `msg-early-${Date.now()}` };
    const alsoInHistory = history[history.length - 1];
    act(() => {
      socketHandlers['chat:message']({ message: alsoInHistory });
      socketHandlers['chat:message']({ message: early });
    });
    await act(async () => resolveHistory({ messages: history, total: history.length }));
    await screen.findByRole('heading', { name: fullName(other) });

    expect(shownMessages()).toEqual([...history.map((m) => m.content), early.content]);
  });

  it('should show only the new chat\'s messages after switching chats', async () => {
    const first = setUp();
    const second = setUp();
    mockGetById.mockImplementation(async (id: string) => (id === first.chat.id ? first.chat : second.chat));
    mockGetMessages.mockImplementation(async (id: string) => {
      const { history } = id === first.chat.id ? first : second;
      return { messages: history, total: history.length };
    });
    renderRoom(first.chat, second.chat);
    await screen.findByRole('heading', { name: fullName(first.other) });

    fireEvent.click(screen.getByRole('link', { name: 'next chat' }));

    await screen.findByRole('heading', { name: fullName(second.other) });
    expect(shownMessages()).toEqual(second.history.map((m) => m.content));
  });
});
