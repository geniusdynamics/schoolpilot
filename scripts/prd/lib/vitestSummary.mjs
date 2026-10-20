// ABOUTME: Summarises a vitest run for the PRD gate: totals, and on failure the exit code/signal and error lines.
// ABOUTME: Lets gate check G3 explain a non-zero exit even when every test passed (unhandled errors, killed workers).

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const TOTALS = /Test Files|Tests\s/;
const PROBLEMS = /\bFAIL\b|Errors\s+\d+|Unhandled|Error:|timed out|Timeout|heap out of memory|ERR_/;

export function summariseVitestRun(output, { ok, status = null, signal = null }) {
  const lines = String(output || '')
    .replace(ANSI, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const parts = lines.filter((l) => TOTALS.test(l)).slice(-2);
  if (!ok) {
    parts.push(signal ? `signal ${signal}` : `exit ${status}`);
    parts.push(...lines.filter((l) => PROBLEMS.test(l) && !TOTALS.test(l)).slice(-4));
  }
  return parts.join(' | ');
}
