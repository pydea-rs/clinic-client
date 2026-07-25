import { CookieJar } from 'tough-cookie';
import { getServerUrl } from './server.js';
import http from 'http';

interface SSEEvent {
  type: string;
  data: string;
}

export class SSEClient {
  private events: SSEEvent[] = [];
  private listeners = new Map<string, ((data: string) => void)[]>();
  private request: http.ClientRequest | null = null;
  private closed = false;

  constructor(
    private readonly url: string,
    private readonly cookieString: string,
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(this.url);

      const options: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          Cookie: this.cookieString,
        },
      };

      this.request = http.request(options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`SSE connection failed with status ${res.statusCode}`));
          return;
        }
        resolve();

        let buffer = '';
        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const event = this.parseEvent(part);
            if (event) {
              this.events.push(event);
              const handlers = this.listeners.get(event.type) || [];
              for (const handler of handlers) {
                handler(event.data);
              }
              const allHandlers = this.listeners.get('*') || [];
              for (const handler of allHandlers) {
                handler(event.data);
              }
            }
          }
        });

        res.on('end', () => {
          this.closed = true;
        });
      });

      this.request.on('error', (err) => {
        if (!this.closed) reject(err);
      });

      this.request.end();
    });
  }

  on(eventType: string, handler: (data: string) => void): void {
    const handlers = this.listeners.get(eventType) || [];
    handlers.push(handler);
    this.listeners.set(eventType, handlers);
  }

  waitForEvent(eventType: string, timeoutMs = 10_000): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check already-received events
      const existing = this.events.find((e) => e.type === eventType);
      if (existing) {
        resolve(existing.data);
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for SSE event: ${eventType}`));
      }, timeoutMs);

      this.on(eventType, (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });
  }

  getEvents(): SSEEvent[] {
    return [...this.events];
  }

  close(): void {
    this.closed = true;
    this.request?.destroy();
    this.listeners.clear();
  }

  private parseEvent(raw: string): SSEEvent | null {
    let type = 'message';
    let data = '';

    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) {
        type = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data += line.slice(5).trim();
      }
    }

    if (!data) return null;
    return { type, data };
  }
}

export async function createSSEClient(
  path: string,
  jar: CookieJar,
): Promise<SSEClient> {
  const baseUrl = getServerUrl();
  const cookieString = await jar.getCookieString(baseUrl);
  const url = `${baseUrl}${path}`;
  return new SSEClient(url, cookieString);
}
