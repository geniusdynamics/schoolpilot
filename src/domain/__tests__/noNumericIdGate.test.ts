// ABOUTME: Runs schoolpilot/no-numeric-id over all of src so a new id coercion cannot land unnoticed.
// ABOUTME: Shells out to the repo's own ESLint install and reports the offending file:line pairs.

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const ESLINT_BIN = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
const CACHE_LOCATION = path.join(ROOT, 'node_modules', '.cache', 'eslint', 'no-numeric-id');
const RULE_ID = 'schoolpilot/no-numeric-id';

interface LintMessage {
  ruleId: string | null;
  line: number;
  column: number;
  message: string;
}

interface LintResult {
  filePath: string;
  messages: LintMessage[];
}

type LintOutcome =
  | { skipped: true; reason: string }
  | { skipped: false; violations: string[] };

/** Turns the JSON report into `file:line:column` violation strings. */
function collectViolations(report: unknown): LintOutcome {
  if (!Array.isArray(report)) {
    return { skipped: true, reason: 'eslint produced no JSON report' };
  }

  const violations = (report as LintResult[]).flatMap((result) =>
    result.messages
      .filter((message) => message.ruleId === RULE_ID)
      .map((message) => {
        const file = path.relative(ROOT, result.filePath).replace(/\\/g, '/');
        return `${file}:${message.line}:${message.column} ${message.message}`;
      })
  );

  return { skipped: false, violations };
}

/** Lints src with the repo config and returns the numeric-id violations. */
async function lintNumericIds(): Promise<LintOutcome> {
  if (!fs.existsSync(ESLINT_BIN)) {
    return { skipped: true, reason: 'eslint is not installed' };
  }

  const args = [
    ESLINT_BIN,
    'src',
    '--format',
    'json',
    '--no-warn-ignored',
    '--concurrency',
    '2',
    '--cache',
    '--cache-location',
    CACHE_LOCATION,
  ];
  const options = { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, timeout: 600000, encoding: 'utf8' as const };

  try {
    const { stdout } = await execFileAsync(process.execPath, args, options);
    return collectViolations(JSON.parse(stdout));
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    const stdout = failure.stdout ?? '';
    const stderr = failure.stderr ?? '';
    if (/ERR_MODULE_NOT_FOUND|Cannot find package/.test(`${stderr}${stdout}`)) {
      return { skipped: true, reason: 'eslint cannot load its config' };
    }
    // ESLint exits 1 when another rule reports an error; the JSON report is still complete.
    try {
      return collectViolations(JSON.parse(stdout));
    } catch {
      return { skipped: true, reason: 'eslint produced no JSON report' };
    }
  }
}

describe('schoolpilot/no-numeric-id across src', () => {
  it('reports no numeric id coercions', async () => {
    const outcome = await lintNumericIds();
    if (outcome.skipped) {
      console.warn(`Skipping the numeric-id gate: ${outcome.reason}`);
      return;
    }

    expect(outcome.violations).toEqual([]);
  }, 600000);
});
