import http from 'http';
import net from 'net';

/**
 * A reverse proxy that serves the target under a path prefix and strips it, like the
 * client's nginx `location /api/ { proxy_pass http://server:8080/; }`, including
 * WebSocket upgrades. Requests outside the prefix get 404.
 */
export async function startPrefixProxy(
  target: string,
  prefix = '/api',
): Promise<{ url: string; close: () => Promise<void> }> {
  const { hostname, port } = new URL(target);
  const strip = (url = '') => (url.startsWith(`${prefix}/`) ? url.slice(prefix.length) : null);
  const open = new Set<net.Socket>();

  const server = http.createServer((req, res) => {
    const path = strip(req.url);
    if (path === null) {
      res.writeHead(404).end();
      return;
    }
    const upstream = http.request(
      { hostname, port, path, method: req.method, headers: req.headers },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('error', () => res.destroy());
    req.pipe(upstream);
  });

  server.on('upgrade', (req, socket: net.Socket, head) => {
    const path = strip(req.url);
    if (path === null) {
      socket.destroy();
      return;
    }
    const upstream = net.connect(Number(port), hostname, () => {
      const headers: string[] = [];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        headers.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      }
      upstream.write([`${req.method} ${path} HTTP/1.1`, ...headers, '', ''].join('\r\n'));
      upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    for (const s of [socket, upstream]) {
      open.add(s);
      s.on('close', () => open.delete(s));
    }
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
  });
  server.on('connection', (socket) => {
    open.add(socket);
    socket.on('close', () => open.delete(socket));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port: proxyPort } = server.address() as net.AddressInfo;

  return {
    url: `http://127.0.0.1:${proxyPort}`,
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of open) socket.destroy();
        server.close(() => resolve());
      }),
  };
}
