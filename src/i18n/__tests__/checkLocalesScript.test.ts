// ABOUTME: Runs the check-locales script as a process against a deliberately broken fixture tree and the real tree.
// ABOUTME: Proves the CLI exits non-zero for each problem kind and zero for the shipped catalogue.

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..', '..');
const tsx = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const script = path.join(root, 'scripts', 'i18n', 'check-locales.ts');
const brokenRoot = path.join(root, 'scripts', 'i18n', '__fixtures__', 'broken');

const run = (...args: string[]) =>
  spawnSync(process.execPath, [tsx, script, ...args], { cwd: root, encoding: 'utf8' });

describe('check-locales script', () => {
  it('exits non-zero and names each problem kind for a broken fixture', () => {
    const result = run('--root', brokenRoot, '--locales', 'sw');
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/untranslated\s+common:save/);
    expect(result.stderr).toMatch(/empty\s+common:cancel/);
    expect(result.stderr).toMatch(/placeholder\s+common:welcome/);
    expect(result.stderr).toMatch(/missing\s+common:close/);
    expect(result.stderr).toMatch(/extra\s+common:stray/);
  });

  it('exits zero for the shipped catalogue', () => {
    const result = run();
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
