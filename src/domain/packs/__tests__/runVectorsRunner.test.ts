// ABOUTME: Self-test for scripts/packs/run-vectors.mjs: a matching fixture pack exits zero, and a
// ABOUTME: deliberately mismatched or unexecutable vector exits nonzero (or is visibly skipped).

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

// Each case spawns the runner as a child Node process (tsx compiles the engines on a cold start);
// on a busy machine that exceeds vitest's 20 s default even though the runner itself is quick.
vi.setConfig({ testTimeout: 120_000 });

const ROOT = process.cwd();
const RUNNER = resolve(ROOT, 'scripts', 'packs', 'run-vectors.mjs');
const FIXTURE = resolve(
  ROOT,
  'src',
  'domain',
  'packs',
  '__tests__',
  'fixtures',
  'runner-packs'
);
const FIXTURE_PACK = 'runner-fixture';
const VECTOR_FILE = join(FIXTURE_PACK, 'tests', 'fixture.vectors.json');
const FIRST_VECTOR = 'A flat mark reaches the scheme';

const temporaryDirectories = [];

function copyFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'schoolpilot-vectors-'));
  temporaryDirectories.push(directory);
  cpSync(join(FIXTURE, FIXTURE_PACK), join(directory, FIXTURE_PACK), { recursive: true });
  return directory;
}

function runRunner(packsDirectory) {
  return spawnSync(process.execPath, [RUNNER, '--packs-dir', packsDirectory], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
  });
}

function outputOf(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function editVectors(directory, edit) {
  const path = join(directory, VECTOR_FILE);
  const document = JSON.parse(readFileSync(path, 'utf8'));
  edit(document.vectors);
  writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('pack conformance runner', () => {
  it('does not ship a fixture pack into the real packs directory', () => {
    expect(existsSync(resolve(ROOT, 'packs', FIXTURE_PACK))).toBe(false);
  });

  it('exits zero and counts every vector when the fixture matches', () => {
    const result = runRunner(FIXTURE);
    const output = outputOf(result);

    expect(result.status, output).toBe(0);
    expect(output).toContain('Pack conformance: 1 pack, 4 vectors');
    expect(output).toMatch(/runner-fixture\s+4\s+4\s+0\s+0/);
    expect(output).toContain('executed = vectors the engine ran and that matched');
  });

  it('exits nonzero and names the vector when one expectation is wrong', () => {
    const directory = copyFixture();
    editVectors(directory, (vectors) => {
      vectors[0].expect['fixture-scheme'].percent = 76;
    });

    const result = runRunner(directory);
    const output = outputOf(result);

    expect(result.status, output).toBe(1);
    expect(output).toContain(FIRST_VECTOR);
    expect(output).toContain('fixture-scheme.percent: expected 76, actual "75"');
    expect(output).toMatch(/runner-fixture\s+4\s+3\s+0\s+1/);
    expect(output).toContain('FAILED');
  });

  it('reports a vector the engine cannot execute as skipped, never as a pass', () => {
    const directory = copyFixture();
    editVectors(directory, (vectors) => {
      vectors[0].expect = { fixture_unknown: { value: 1 } };
    });

    const result = runRunner(directory);
    const output = outputOf(result);

    expect(result.status, output).toBe(0);
    expect(output).toContain('SKIPPED (not executed; not counted as a pass)');
    expect(output).toContain('fixture_unknown');
    expect(output).toMatch(/runner-fixture\s+4\s+3\s+1\s+0/);
    expect(output).toMatch(/TOTAL\s+4\s+3\s+1\s+0/);
  });
});
