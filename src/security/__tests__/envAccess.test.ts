// ABOUTME: Guards the bundle against inlining the whole build environment: Vite replaces each static
// ABOUTME: `import.meta.env.NAME` with its value, but a dynamic `import.meta.env[name]` inlines every VITE_ variable.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SOURCE_ROOT = resolve(__dirname, '../..');

/** Every source file outside the tests. */
function sourceFiles(): string[] {
  return readdirSync(SOURCE_ROOT, { recursive: true, encoding: 'utf8' })
    .filter((path) => /\.(ts|tsx)$/.test(path) && !/__tests__|\.test\.|\.spec\./.test(path))
    .map((path) => join(SOURCE_ROOT, path));
}

describe('reads of the build environment', () => {
  it('name each variable statically, so the bundle carries only the variables the code reads', () => {
    // `import.meta.env[name]`, `{ ...import.meta.env }` and `Object.entries(import.meta.env)` all make
    // Vite emit the whole env object - a DSN, a signing secret, an API key put in any VITE_ variable
    // would ship in a chunk that never reads it.
    const wholeObject = /import\.meta\.env\s*\[|\.\.\.\s*import\.meta\.env\b|\(\s*import\.meta\.env\s*\)/;
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (wholeObject.test(line)) offenders.push(`${relative(SOURCE_ROOT, file)}:${index + 1}: ${line.trim()}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
