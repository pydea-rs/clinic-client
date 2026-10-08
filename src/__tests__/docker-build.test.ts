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

describe('client Dockerfile', () => {
  it('should only copy paths that exist in the client', () => {
    expect(copiedSources.length).toBeGreaterThan(0);
    expect(copiedSources.filter((source) => !matches(source))).toEqual([]);
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
