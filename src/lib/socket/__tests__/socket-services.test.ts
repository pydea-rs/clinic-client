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
});
