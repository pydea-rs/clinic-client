import { describe, it, expect, vi, afterEach } from 'vitest';
import { io } from 'socket.io-client';
import { socketTarget } from '../socket-url';
import { getApiBaseUrl, setApiBaseUrl } from '../../api/client';

// `nsp` is private in the typings; it is what socket.io-client parsed as the namespace.
const namespaceOf = (socket: ReturnType<typeof io>) => (socket as unknown as { nsp: string }).nsp;

const randomHost = () => `h${Math.random().toString(36).slice(2, 8)}.example.com`;

describe('socketTarget', () => {
  const originalApiBase = getApiBaseUrl();

  afterEach(() => {
    vi.unstubAllEnvs();
    setApiBaseUrl(originalApiBase);
  });

  it.each([
    ['an origin', 'http://localhost:8080', '/chat', 'http://localhost:8080/chat', '/socket.io'],
    ['an origin with a trailing slash', 'https://api.example.com/', '/matching', 'https://api.example.com/matching', '/socket.io'],
    ['a path prefix', 'https://example.com/api', '/chat', 'https://example.com/chat', '/api/socket.io'],
    ['a nested prefix with a trailing slash', 'https://example.com/backend/v1/', '/matching', 'https://example.com/matching', '/backend/v1/socket.io'],
  ])('should split %s into origin + namespace and engine path', (_case, base, namespace, url, path) => {
    expect(socketTarget(namespace, base)).toEqual({ url, path });
  });

  it('should resolve a relative base like /api against the page origin', () => {
    expect(socketTarget('/chat', '/api')).toEqual({
      url: `${window.location.origin}/chat`,
      path: '/api/socket.io',
    });
  });

  it('should default to the API base URL', () => {
    const host = randomHost();
    vi.stubEnv('VITE_WS_URL', '');
    setApiBaseUrl(`https://${host}/api`);

    expect(socketTarget('/matching')).toEqual({
      url: `https://${host}/matching`,
      path: '/api/socket.io',
    });
  });

  it('should prefer VITE_WS_URL over the API base URL', () => {
    const host = randomHost();
    vi.stubEnv('VITE_WS_URL', `  https://${host}  `);
    setApiBaseUrl('/api');

    expect(socketTarget('/chat')).toEqual({ url: `https://${host}/chat`, path: '/socket.io' });
  });

  it.each(['/chat', '/matching'])(
    'should make socket.io-client use namespace %s behind a /api prefix',
    (namespace) => {
      const { url, path } = socketTarget(namespace, '/api');
      const socket = io(url, { path, autoConnect: false, forceNew: true });

      expect(namespaceOf(socket)).toBe(namespace);
      expect(socket.io.opts.path).toBe('/api/socket.io');
      socket.close();
    },
  );

  it('should show why the base cannot simply be prefixed to the namespace', () => {
    const socket = io('/api/chat', { autoConnect: false, forceNew: true });

    expect(namespaceOf(socket)).toBe('/api/chat');
    socket.close();
  });
});
