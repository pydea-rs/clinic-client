import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiBaseUrl, setApiBaseUrl } from '../../api/client';

const { mockIo } = vi.hoisted(() => ({
  mockIo: vi.fn(() => ({
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('socket.io-client', () => ({ default: mockIo, io: mockIo }));

import { socketService } from '../socket.service';
import { matchingSocket } from '../matching.socket';

describe('socket services', () => {
  const originalApiBase = getApiBaseUrl();

  beforeEach(() => {
    mockIo.mockClear();
    vi.stubEnv('VITE_WS_URL', '');
  });

  afterEach(() => {
    socketService.disconnect();
    matchingSocket.disconnect();
    vi.unstubAllEnvs();
    setApiBaseUrl(originalApiBase);
  });

  it.each([
    ['chat', () => socketService.connect(), '/chat'],
    ['matching', () => matchingSocket.connect(), '/matching'],
  ])('should connect the %s namespace through a /api prefix', (_name, connect, namespace) => {
    setApiBaseUrl('/api');

    connect();

    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(mockIo).toHaveBeenCalledWith(
      `${window.location.origin}${namespace}`,
      expect.objectContaining({ path: '/api/socket.io', withCredentials: true }),
    );
  });

  it.each([
    ['chat', () => socketService.connect(), '/chat'],
    ['matching', () => matchingSocket.connect(), '/matching'],
  ])('should connect the %s namespace on a separate API origin', (_name, connect, namespace) => {
    setApiBaseUrl('http://localhost:8080');

    connect();

    expect(mockIo).toHaveBeenCalledWith(
      `http://localhost:8080${namespace}`,
      expect.objectContaining({ path: '/socket.io' }),
    );
  });

  describe('open chats', () => {
    type MockSocket = { connected: boolean; on: ReturnType<typeof vi.fn>; emit: ReturnType<typeof vi.fn> };
    const chatId = () => crypto.randomUUID();

    /** Connects and returns the mock socket plus a way to fire its 'connect' event. */
    const connectChat = () => {
      socketService.connect();
      const { results } = mockIo.mock;
      const socket = results[results.length - 1].value as MockSocket;
      const fireConnect = () => {
        socket.connected = true;
        for (const [event, handler] of socket.on.mock.calls) if (event === 'connect') handler();
      };
      return { socket, fireConnect };
    };
    const joinsOf = (socket: MockSocket) =>
      socket.emit.mock.calls.filter(([event]) => event === 'chat:join').map(([, payload]) => payload.chatId);

    it('should join a chat opened before the socket connected once it connects', () => {
      const { socket, fireConnect } = connectChat();
      const id = chatId();

      socketService.joinRoom(id);
      expect(socket.emit).not.toHaveBeenCalled();

      fireConnect();
      expect(joinsOf(socket)).toEqual([id]);
    });

    it('should join at once when already connected', () => {
      const { socket, fireConnect } = connectChat();
      fireConnect();
      const id = chatId();

      socketService.joinRoom(id);

      expect(joinsOf(socket)).toEqual([id]);
    });

    it('should rejoin the chats still open after a reconnect, but not closed ones', () => {
      const { socket, fireConnect } = connectChat();
      fireConnect();
      const [open, closed] = [chatId(), chatId()];
      socketService.joinRoom(open);
      socketService.joinRoom(closed);
      socketService.leaveRoom(closed);
      socket.emit.mockClear();

      socket.connected = false;
      fireConnect();

      expect(joinsOf(socket)).toEqual([open]);
      expect(socket.emit).not.toHaveBeenCalledWith('chat:leave', expect.anything());
    });

    it('should forget open chats on disconnect (logout)', () => {
      const first = connectChat();
      first.fireConnect();
      socketService.joinRoom(chatId());

      socketService.disconnect();
      const second = connectChat();
      second.fireConnect();

      expect(joinsOf(second.socket)).toEqual([]);
    });
  });

  describe('matching offer answers', () => {
    type Handler = (data: Record<string, unknown>) => void;
    type MockSocket = { connected: boolean; on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn>; emit: ReturnType<typeof vi.fn> };

    /** Connects the matching socket; `fire` calls the handlers currently registered for an event. */
    const connectMatching = (connected = true) => {
      matchingSocket.connect();
      const { results } = mockIo.mock;
      const socket = results[results.length - 1].value as MockSocket;
      socket.connected = connected;
      const handlers = new Map<string, Set<Handler>>();
      socket.on.mockImplementation((event: string, handler: Handler) => {
        handlers.set(event, (handlers.get(event) ?? new Set()).add(handler));
      });
      socket.off.mockImplementation((event: string, handler: Handler) => handlers.get(event)?.delete(handler));
      const fire = (event: string, data: Record<string, unknown>) =>
        [...(handlers.get(event) ?? [])].forEach((handler) => handler(data));
      const listening = (event: string) => handlers.get(event)?.size ?? 0;
      return { socket, fire, listening };
    };
    const requestId = () => crypto.randomUUID();

    it.each([
      ['acceptMatch', 'match:accept', 'match:accepted'],
      ['rejectMatch', 'match:reject', 'match:rejected'],
    ] as const)('%s should resolve only on the confirmation for that request, then stop listening', async (method, event, confirmation) => {
      const { socket, fire, listening } = connectMatching();
      const id = requestId();
      let settled = false;

      const answer = matchingSocket[method](id).then((data) => {
        settled = true;
        return data;
      });
      expect(socket.emit).toHaveBeenCalledWith(event, { matchRequestId: id });

      fire(confirmation, { matchRequestId: requestId() });
      await Promise.resolve();
      expect(settled).toBe(false);

      fire(confirmation, { matchRequestId: id, consultationId: 'c-1' });
      await expect(answer).resolves.toEqual({ matchRequestId: id, consultationId: 'c-1' });
      expect([confirmation, 'match:error', 'exception'].map(listening)).toEqual([0, 0, 0]);
    });

    it.each(['match:error', 'exception'])('should reject with the server message on %s', async (errorEvent) => {
      const { fire, listening } = connectMatching();
      const message = `Match request is no longer available ${requestId().slice(0, 4)}`;

      const answer = matchingSocket.acceptMatch(requestId());
      fire(errorEvent, { message });

      await expect(answer).rejects.toThrow(message);
      expect(listening('match:accepted')).toBe(0);
    });

    it('should reject without sending anything when not connected', async () => {
      const { socket } = connectMatching(false);

      await expect(matchingSocket.acceptMatch(requestId())).rejects.toThrow('Not connected');
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should reject when the server never answers', async () => {
      vi.useFakeTimers();
      try {
        const { listening } = connectMatching();
        const answer = matchingSocket.rejectMatch(requestId(), 5_000);
        const outcome = expect(answer).rejects.toThrow('did not answer');

        await vi.advanceTimersByTimeAsync(5_000);
        await outcome;
        expect(listening('match:rejected')).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
