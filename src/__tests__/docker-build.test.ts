import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';

const clientRoot = path.resolve(__dirname, '../..');
const dockerfileLines = readFileSync(path.join(clientRoot, 'Dockerfile'), 'utf8').split('\n');

/** Sources of the COPY steps that read from the build context (not `--from=` a stage). */
const copiedSources = dockerfileLines
  .filter((line) => /^COPY\s/.test(line) && !/--from=/.test(line))
  .flatMap((line) => line.trim().split(/\s+/).slice(1, -1));

const matches = (pattern: string) => {
  if (!pattern.includes('*')) return existsSync(path.join(clientRoot, pattern));
  const regex = new RegExp(`^${pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  return readdirSync(clientRoot).some((file) => regex.test(file));
};

/** Whether a context path is excluded by .dockerignore (paths are relative to the context root). */
function dockerIgnored(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const glob = pattern
      .replace(/^\/|\/$/g, '')
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    return new RegExp(`^${glob}(/.*)?$`).test(file);
  });
}

/** Directives of the first `location <path> { ... }` block, without trailing semicolons. */
function nginxLocation(conf: string, location: string): string[] | null {
  const start = conf.indexOf(`location ${location} {`);
  if (start === -1) return null;
  const body = conf.slice(conf.indexOf('{', start) + 1, conf.indexOf('}', start));
  return body
    .split(';')
    .map((directive) => directive.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
}

describe('client Dockerfile', () => {
  it('should only copy paths that exist in the client', () => {
    expect(copiedSources.length).toBeGreaterThan(0);
    expect(copiedSources.filter((source) => !matches(source))).toEqual([]);
  });

  it('should not copy anything .dockerignore leaves out of the build context', () => {
    const ignore = readFileSync(path.join(clientRoot, '.dockerignore'), 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    expect(copiedSources.filter((source) => dockerIgnored(source, ignore))).toEqual([]);
  });

  it('should give every pnpm install the build-script approvals', () => {
    const installs = dockerfileLines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => /pnpm install/.test(line));

    expect(installs.length).toBeGreaterThan(0);
    for (const { index } of installs) {
      const copiedBefore = dockerfileLines
        .slice(0, index)
        .reverse()
        .find((line) => /^COPY\b.*package\.json/.test(line));
      expect(copiedBefore).toMatch(/\bpnpm-workspace\.yaml\b/);
    }
  });
});

describe('client nginx.conf', () => {
  const conf = readFileSync(path.join(clientRoot, 'nginx.conf'), 'utf8');
  const api = nginxLocation(conf, '/api/');

  it('should proxy /api/ to the server with the prefix stripped', () => {
    // The trailing slash makes nginx replace `/api/` with `/`: the server has no /api routes.
    expect(api).toContain('proxy_pass http://server:8080/');
  });

  it('should pass WebSocket upgrades through /api/ (socket.io uses /api/socket.io)', () => {
    expect(api).toEqual(
      expect.arrayContaining([
        'proxy_http_version 1.1',
        'proxy_set_header Upgrade $http_upgrade',
        'proxy_set_header Connection "upgrade"',
      ]),
    );
  });

  it("should serve the location the Docker build's default API base URL points to", () => {
    const base = dockerfileLines.find((line) => line.startsWith('ARG VITE_API_BASE_URL='))?.split('=')[1];

    expect(base).toBeDefined();
    expect(nginxLocation(conf, `${base}/`)).not.toBeNull();
  });

  it('should fall back to index.html for client-side routes', () => {
    expect(nginxLocation(conf, '/')).toContain('try_files $uri $uri/ /index.html');
  });
});

describe('dockerIgnored', () => {
  it.each([
    ['public', ['/public/'], true],
    ['src', ['node_modules', 'dist'], false],
    ['dist/assets/a.js', ['dist'], true],
    ['tsconfig.app.json', ['*.json'], true],
  ])('dockerIgnored(%s, %j) is %s', (file, patterns, expected) => {
    expect(dockerIgnored(file, patterns)).toBe(expected);
  });
});
