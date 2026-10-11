// ABOUTME: Tests the gate helper that explains why a vitest run failed (exit code, signal, error lines).
// ABOUTME: G3 must say why it failed even when every test passed, e.g. unhandled errors or a killed worker.
import { describe, it, expect } from 'vitest';
import { summariseVitestRun } from '../lib/vitestSummary.mjs';

describe('summariseVitestRun', () => {
  it('keeps the test totals for a passing run', () => {
    const out = ' Test Files  3 passed (3)\n      Tests  12 passed (12)\n';
    expect(summariseVitestRun(out, { ok: true })).toBe('Test Files  3 passed (3) | Tests  12 passed (12)');
  });

  it('names the exit code and error lines when all tests passed but the run failed', () => {
    const out = [
      ' Test Files  92 passed (92)',
      '      Tests  831 passed (831)',
      '     Errors  1 error',
      'Error: [vitest-worker]: Timeout calling "onTaskUpdate"',
    ].join('\n');
    const s = summariseVitestRun(out, { ok: false, status: 1, signal: null });
    expect(s).toContain('Tests  831 passed (831)');
    expect(s).toContain('exit 1');
    expect(s).toContain('Errors  1 error');
    expect(s).toContain('Timeout calling "onTaskUpdate"');
  });

  it('reports a signal when the process was killed', () => {
    const s = summariseVitestRun('', { ok: false, status: null, signal: 'SIGKILL' });
    expect(s).toContain('signal SIGKILL');
  });
});
