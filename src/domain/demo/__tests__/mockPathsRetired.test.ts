// ABOUTME: Guards the retirement: the modular mock provider is gone, and nothing under src imports
// ABOUTME: it, so no page can quietly fall back onto the in-memory mock collections.

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { repositoryRoot } from '@/data/__tests__/harness';

const ROOT = repositoryRoot();
const SRC = path.join(ROOT, 'src');
const RETIRED_HOOK = path.join(SRC, 'hooks', 'useModularMockData.ts');

/** Every TypeScript source under `src`, with forward-slash relative paths. */
function sources(): string[] {
  return fs
    .readdirSync(SRC, { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => /\.tsx?$/.test(entry))
    .map((entry) => path.relative(ROOT, path.join(SRC, entry)).split(path.sep).join('/'));
}

describe('the modular mock data path', () => {
  it('is gone', () => {
    expect(fs.existsSync(RETIRED_HOOK)).toBe(false);
  });

  it('is imported by no file under src', () => {
    const users = sources().filter((file) => {
      if (file.endsWith('mockPathsRetired.test.ts')) return false;
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      return /useModularMockData/.test(text);
    });

    expect(users).toEqual([]);
  });

  it('leaves the legacy demo collections to the pages that still read them', () => {
    // The pages that still carry a GAP marker read the legacy collections, and the demo seeder
    // fills them from the module fixtures. The fixture files therefore stay until the last of
    // those entities is modelled; the guard records that they are the only remaining source.
    const seeder = fs.readFileSync(
      path.join(SRC, 'services', 'database', 'demoDataSeed.ts'),
      'utf8'
    );
    expect(seeder).toContain("import.meta.glob('../../modules/*/data/mockData.ts'");

    for (const module of ['academics', 'administration', 'finance', 'hr', 'inventory', 'library', 'nutrition', 'portal', 'reports']) {
      expect(fs.existsSync(path.join(SRC, 'modules', module, 'data', 'mockData.ts'))).toBe(true);
    }
  });
});
