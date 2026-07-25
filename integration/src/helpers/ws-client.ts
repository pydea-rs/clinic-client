import { io, Socket } from 'socket.io-client';
import { CookieJar } from 'tough-cookie';
import { getServerUrl } from './server.js';

export async function createChatSocket(jar: CookieJar): Promise<Socket> {
  const baseUrl = getServerUrl();
  const cookieString = await jar.getCookieString(baseUrl);

  const socket = io(`${baseUrl}/chat`, {
    transports: ['websocket'],
    extraHeaders: {
      cookie: cookieString,
    },
    autoConnect: false,
  });

  return socket;
}

export async function createMatchingSocket(jar: CookieJar): Promise<Socket> {
  const baseUrl = getServerUrl();
  const cookieString = await jar.getCookieString(baseUrl);

  const socket = io(`${baseUrl}/matching`, {
    transports: ['websocket'],
    extraHeaders: {
      cookie: cookieString,
    },
    autoConnect: false,
  });

  return socket;
}

export function connectSocket(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timed out'));
    }, 10_000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.on('connect_error', (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });

    socket.connect();
  });
}

export function waitForEvent<T = any>(
  socket: Socket,
  eventName: string,
  timeoutMs = 10_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeoutMs);

    function handler(data: T) {
      clearTimeout(timeout);
      socket.off(eventName, handler);
      resolve(data);
    }

    socket.on(eventName, handler);
  });
}

export function collectEvents<T = any>(
  socket: Socket,
  eventName: string,
  count: number,
  timeoutMs = 15_000,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const events: T[] = [];

    const timeout = setTimeout(() => {
      socket.off(eventName, handler);
      // Return what we have if we got at least some
      if (events.length > 0) {
        resolve(events);
      } else {
        reject(new Error(`Timeout collecting ${count} events for: ${eventName} (got ${events.length})`));
      }
    }, timeoutMs);

    function handler(data: T) {
      events.push(data);
      if (events.length >= count) {
        clearTimeout(timeout);
        socket.off(eventName, handler);
        resolve(events);
      }
    }

    socket.on(eventName, handler);
  });
}

export function disconnectSocket(socket: Socket): Promise<void> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve();
      return;
    }
    socket.on('disconnect', () => resolve());
    socket.disconnect();
  });
}
