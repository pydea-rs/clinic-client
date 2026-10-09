import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const srcRoot = path.resolve(__dirname, '../..');
const entryFile = path.join(srcRoot, 'main.tsx');
const appFile = path.join(srcRoot, 'routes/App.tsx');

/** Relative modules loaded with `import('...')`, resolved against `dir` (no extension). */
function dynamicImports(source: string, dir: string): string[] {
  return [...source.matchAll(/\bimport\(\s*'(\.[^']+)'\s*\)/g)].map((m) => path.resolve(dir, m[1]));
}

/** Relative modules imported or re-exported statically (not type-only), resolved against `dir`. */
function staticImports(source: string, dir: string): string[] {
  return [...source.matchAll(/^\s*(import|export)\b(\s+type\b)?[^'"]*?\bfrom\s+'(\.[^']+)'/gm)]
    .filter((m) => !m[2])
    .map((m) => path.resolve(dir, m[3]));
}

/** The source file a module path names, or null for non-TypeScript modules (CSS, assets). */
function resolveModule(modulePath: string): string | null {
  const candidates = /\.tsx?$/.test(modulePath)
    ? [modulePath]
    : ['.ts', '.tsx', '/index.ts', '/index.tsx'].map((suffix) => modulePath + suffix);
  return candidates.find((file) => existsSync(file)) ?? null;
}

/** Files reachable from `entry` through static imports: what ends up in the main bundle. */
function eagerFiles(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    if (seen.has(file)) continue;
    seen.add(file);
    for (const target of staticImports(readFileSync(file, 'utf8'), path.dirname(file))) {
      const resolved = resolveModule(target);
      if (resolved) queue.push(resolved);
    }
  }
  return seen;
}

describe('lazily loaded routes', () => {
  const lazyFiles = dynamicImports(readFileSync(appFile, 'utf8'), path.dirname(appFile)).map(resolveModule);

  it('should all resolve to source files', () => {
    expect(lazyFiles.length).toBeGreaterThan(10);
    expect(lazyFiles).not.toContain(null);
    expect(lazyFiles).toContain(path.join(srcRoot, 'features/nurse/NurseInvitationsPage.tsx'));
  });

  it('should not be statically reachable from the entry point, which would pull them into the main bundle', () => {
    const eager = eagerFiles(entryFile);

    expect(eager).toContain(appFile);
    const eagerLazyFiles = lazyFiles.filter((file): file is string => file !== null && eager.has(file));

    expect(eagerLazyFiles.map((file) => path.relative(srcRoot, file))).toEqual([]);
  });
});

describe('import parsers', () => {
  const dir = '/src/routes';

  it.each([
    ["import { A } from './A';", ['/src/routes/A']],
    ["import B, { C } from '../x/B';\nexport { D } from './D';", ['/src/x/B', '/src/routes/D']],
    ["import {\n  E,\n  F,\n} from './EF';", ['/src/routes/EF']],
    ["import type { T } from './T';\nexport type { U } from './U';", []],
    ["import x from 'react';", []],
    ["const P = React.lazy(() => import('./P'));", []],
  ])('staticImports(%j) is %j', (source, expected) => {
    expect(staticImports(source, dir)).toEqual(expected);
  });

  it.each([
    ["const P = React.lazy(() => import('./P').then((m) => m));", ['/src/routes/P']],
    ["import { A } from './A';", []],
    ["await import('lodash');", []],
  ])('dynamicImports(%j) is %j', (source, expected) => {
    expect(dynamicImports(source, dir)).toEqual(expected);
  });
});
