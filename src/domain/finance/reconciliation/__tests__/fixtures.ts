// ABOUTME: Loads the statement files the reconciliation tests read, so a test asserts against a real
// ABOUTME: CSV or OFX file rather than a string it built itself.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ReconciliationError } from '../errors';

// Vitest runs with the repository root as its working directory, and `import.meta.url` is an http
// URL under jsdom, so the fixtures are resolved from the project root.
const FIXTURES = resolve(
  process.cwd(),
  'src/domain/finance/reconciliation/__tests__/fixtures'
);

/** The exact text of a statement fixture. */
export function readFixture(name: string): string {
  return readFileSync(resolve(FIXTURES, name), 'utf8');
}

/** Runs `work` and returns the refusal it raised, failing the test when it did not refuse. */
export function refusalOf(work: () => unknown): ReconciliationError {
  try {
    work();
  } catch (error) {
    if (error instanceof ReconciliationError) return error;
    throw error;
  }
  throw new Error('expected a refusal, but the call succeeded');
}
