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
});
