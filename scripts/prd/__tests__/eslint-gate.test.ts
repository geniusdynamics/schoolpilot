// ABOUTME: Verifies ESLint loads eslint.config.js and reports errors, which gate G7 relies on.
// ABOUTME: Runs the same `npx eslint --no-warn-ignored` command as G7, feeding fixtures over stdin.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const FIXTURES = path.join(__dirname, 'fixtures');

function lintFixture(fixture: string) {
  const code = fs.readFileSync(path.join(FIXTURES, fixture), 'utf8');
  const r = spawnSync(
    'npx',
    ['eslint', '--no-warn-ignored', '--stdin', '--stdin-filename', 'src/__lint_fixture__/Fixture.tsx'],
    { cwd: ROOT, input: code, encoding: 'utf8' },
  );
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

describe('ESLint config used by gate G7', () => {
  it('loads without missing-module errors and flags a deliberately failing file', () => {
    const { status, out } = lintFixture('lint-failing.tsx.fixture');
    expect(out).not.toMatch(/ERR_MODULE_NOT_FOUND|Cannot find package/);
    expect(out).toMatch(/react-hooks\/rules-of-hooks/);
    expect(status).toBe(1);
  }, 60000);

  it('passes a lint-clean file', () => {
    const { status, out } = lintFixture('lint-clean.tsx.fixture');
    expect(out).not.toMatch(/ERR_MODULE_NOT_FOUND|Cannot find package/);
    expect(status).toBe(0);
  }, 60000);
});
