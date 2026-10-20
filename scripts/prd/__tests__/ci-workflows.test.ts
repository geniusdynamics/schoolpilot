// ABOUTME: Checks the CI and nightly-probe GitHub workflows (task P0-G04): required steps exist and actionlint passes.
// ABOUTME: actionlint runs when ACTIONLINT points to a binary or it is on PATH; ci.yml also lints itself in CI.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');
const CI = path.join(WORKFLOWS, 'ci.yml');
const NIGHTLY = path.join(WORKFLOWS, 'nightly-probe.yml');

const read = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');

function findActionlint(): string | null {
  const candidates = [process.env.ACTIONLINT, 'actionlint'].filter(Boolean) as string[];
  for (const bin of candidates) {
    const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
    if (r.status === 0) return bin;
  }
  return null;
}

describe('ci.yml', () => {
  const ci = read(CI);

  it('exists and runs on pull requests to consolidation and main', () => {
    expect(ci, 'ci.yml is missing').not.toBe('');
    expect(ci).toMatch(/pull_request:\s*\n\s+branches:\s*\[\s*consolidation,\s*main\s*\]/);
  });

  it('installs with the frozen lockfile', () => {
    expect(ci).toMatch(/pnpm install --frozen-lockfile/);
  });

  it('runs the task gate against the merge base of the PR base branch', () => {
    expect(ci).toMatch(/git merge-base "origin\/\$BASE_REF" HEAD/);
    expect(ci).toMatch(/node scripts\/prd\/gate\.mjs task --base "\$BASE"/);
  });

  it('writes the gate table to the job summary even when the gate fails', () => {
    expect(ci).toMatch(/if: always\(\)[\s\S]*?\.prd-gate\/report\.md[\s\S]*?GITHUB_STEP_SUMMARY/);
  });

  it('runs unit tests against the known-failing baseline and builds', () => {
    expect(ci).toMatch(/vitest run --reporter=json/);
    expect(ci).toMatch(/knownFailingFiles/);
    expect(ci).toMatch(/pnpm -s build/);
  });

  it('lints the workflows with actionlint', () => {
    expect(ci).toMatch(/actionlint/);
  });
});

describe('nightly-probe.yml', () => {
  const nightly = read(NIGHTLY);

  it('exists and runs on a schedule and on demand', () => {
    expect(nightly, 'nightly-probe.yml is missing').not.toBe('');
    expect(nightly).toMatch(/schedule:\s*\n\s+- cron: '[^']+'/);
    expect(nightly).toMatch(/workflow_dispatch:/);
  });

  it('runs the school-ops probe against a dev server', () => {
    expect(nightly).toMatch(/playwright install --with-deps chromium/);
    expect(nightly).toMatch(/node scripts\/audit\/school-ops-probe\.mjs --out/);
  });

  it('uploads the probe report even when the probe fails', () => {
    expect(nightly).toMatch(/if: always\(\)\s*\n\s+uses: actions\/upload-artifact@v4/);
  });
});

const actionlint = findActionlint();
describe.skipIf(!actionlint)('actionlint', () => {
  it('reports no problems in ci.yml and nightly-probe.yml', () => {
    const r = spawnSync(actionlint as string, ['-no-color', CI, NIGHTLY], { cwd: ROOT, encoding: 'utf8' });
    expect(`${r.stdout}${r.stderr}`).toBe('');
    expect(r.status).toBe(0);
  }, 60000);
});
