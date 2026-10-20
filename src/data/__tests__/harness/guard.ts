// ABOUTME: The storage-mock guard: it finds test files that mock the storage layer, so an
// ABOUTME: integration test always runs against a real database instead of a double.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The rule the guard enforces.
 *
 * An integration test under `src/data/**\/__tests__/` must not mock the storage layer.
 * A storage double proves nothing about the SQL the repository actually runs, so the
 * harness exists to give every such test a real database instead. The guard fails the
 * build when a test replaces the adapter or the repository with a mock.
 *
 * The rule covers the mock factories of the test runners (`vi.mock`, `vi.doMock`,
 * `jest.mock`, `jest.doMock`) in every source file of a test directory - a helper
 * module of the test directory is covered as well as a test file. A mock whose module
 * is not written as a string literal is reported as well: the guard cannot clear a call
 * it cannot read.
 *
 * A hand-written double that is passed to the repository instead of a mocked module is
 * not detectable statically; the review of the diff covers that case, and the harness
 * gives a test no reason to write one.
 */
export const STORAGE_MOCK_RULE = {
  id: 'no-storage-mocks-in-integration-tests',
  description:
    'A test file under src/data/**/__tests__/ must not mock the storage adapter or the repository.',
} as const;

/** The source directories that hold the storage layer. */
export const STORAGE_ROOTS: readonly string[] = ['src/data/adapters', 'src/data/repository'];

/** One offending mock call. */
export interface StorageMockViolation {
  /** The absolute path of the offending file. */
  readonly file: string;
  /** The path relative to the repository root. */
  readonly relativeFile: string;
  /** The one-based line the mock call sits on. */
  readonly line: number;
  /** The module the test tried to mock; null when the specifier is not a literal. */
  readonly specifier: string | null;
  /** What is wrong and where. */
  readonly message: string;
}

/** A file the guard reads. */
export interface SourceFile {
  /** The absolute path of the file. */
  readonly path: string;
  /** The content of the file. */
  readonly content: string;
}

const SOURCE_FILE = /\.[cm]?[jt]sx?$/;
const MOCK_RUNNERS = ['vi', 'vitest', 'jest'];
const MOCK_METHODS = ['mock', 'doMock'];

/** The repository root: the nearest ancestor that holds a package.json. */
export function repositoryRoot(): string {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (fs.existsSync(path.join(directory, 'package.json'))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) return directory;
    directory = parent;
  }
}

/** The directory the guard scans by default: the whole data layer. */
export function dataStorageRoot(root: string = repositoryRoot()): string {
  return path.join(root, 'src', 'data');
}

/** True when a resolved path is one of the storage modules. */
export function isStorageModule(resolved: string, root: string = repositoryRoot()): boolean {
  const relative = path.relative(root, resolved).split(path.sep).join('/');
  return STORAGE_ROOTS.some(
    (storageRoot) => relative === storageRoot || relative.startsWith(`${storageRoot}/`)
  );
}

/**
 * Resolves a module specifier to a path inside the repository, or null when the
 * specifier names a package rather than a file of this repository.
 */
export function resolveSpecifier(
  specifier: string,
  filePath: string,
  root: string = repositoryRoot()
): string | null {
  if (specifier.startsWith('@/')) return path.join(root, 'src', specifier.slice(2));
  if (specifier.startsWith('.')) return path.resolve(path.dirname(filePath), specifier);
  return null;
}

/**
 * The mock calls a file contains.
 *
 * The source is walked as code rather than as text, so a mock call written inside a
 * string or a comment is not reported.
 */
export function findMockCalls(
  source: string
): readonly { specifier: string | null; offset: number }[] {
  const calls: { specifier: string | null; offset: number }[] = [];
  let index = 0;
  let state: 'code' | 'line' | 'block' | 'single' | 'double' | 'template' = 'code';

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (state === 'code') {
      if (char === '/' && next === '/') {
        state = 'line';
        index += 2;
        continue;
      }
      if (char === '/' && next === '*') {
        state = 'block';
        index += 2;
        continue;
      }
      if (char === "'") {
        state = 'single';
        index += 1;
        continue;
      }
      if (char === '"') {
        state = 'double';
        index += 1;
        continue;
      }
      if (char === '`') {
        state = 'template';
        index += 1;
        continue;
      }
      const call = matchMockCall(source, index);
      if (call) {
        calls.push({ specifier: call.specifier, offset: call.offset });
        index = call.end;
        continue;
      }
      index += 1;
      continue;
    }

    if (state === 'line') {
      if (char === '\n') state = 'code';
      index += 1;
      continue;
    }

    if (state === 'block') {
      if (char === '*' && next === '/') {
        state = 'code';
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }

    // Inside a string: an escaped character and the closing quote end the literal.
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (
      (state === 'single' && char === "'") ||
      (state === 'double' && char === '"') ||
      (state === 'template' && char === '`')
    ) {
      state = 'code';
    }
    index += 1;
  }

  return calls;
}

/**
 * The storage mocks a set of files contains.
 *
 * A violation is a mock call whose specifier resolves into the storage layer, and a
 * mock call whose specifier is not a string literal at all: the guard cannot tell what
 * such a call mocks, and a call it cannot read is a call it cannot clear. A mock of
 * anything else - a UI module, a hook, a network client - is none of the guard's
 * business.
 */
export function findStorageMockViolations(
  files: readonly SourceFile[],
  root: string = repositoryRoot()
): StorageMockViolation[] {
  const violations: StorageMockViolation[] = [];

  for (const file of files) {
    for (const call of findMockCalls(file.content)) {
      const relativeFile = path.relative(root, file.path).split(path.sep).join('/');

      if (call.specifier === null) {
        violations.push({
          file: file.path,
          relativeFile,
          line: lineOf(file.content, call.offset),
          specifier: null,
          message:
            `${relativeFile} mocks a module that is not written as a string literal, so the ` +
            'guard cannot tell whether it is a storage module. Write the module as a ' +
            'string literal.',
        });
        continue;
      }

      const resolved = resolveSpecifier(call.specifier, file.path, root);
      if (!resolved || !isStorageModule(resolved, root)) continue;

      violations.push({
        file: file.path,
        relativeFile,
        line: lineOf(file.content, call.offset),
        specifier: call.specifier,
        message:
          `${relativeFile} mocks the storage module '${call.specifier}'. An integration ` +
          'test runs against a real database - use the harness in ' +
          'src/data/__tests__/harness/ instead of a storage double.',
      });
    }
  }

  return violations;
}

/**
 * Scans a directory for storage mocks in its test files.
 *
 * The default root is the whole data layer, so every integration test of the storage
 * stack is covered.
 */
export function scanForStorageMocks(
  root: string = dataStorageRoot(),
  options: { readonly repositoryRoot?: string } = {}
): StorageMockViolation[] {
  const repository = options.repositoryRoot ?? repositoryRoot();
  const files = collectGuardedFiles(root).map((filePath) => ({
    path: filePath,
    content: fs.readFileSync(filePath, 'utf8'),
  }));
  return findStorageMockViolations(files, repository);
}

/**
 * The source files a directory holds under a `__tests__` directory, in a stable order.
 *
 * Every source file of a test directory is collected, not only the ones whose name
 * says "test": a mock of the storage layer can sit in a helper module of the test
 * directory just as well as in a test file.
 */
export function collectGuardedFiles(root: string): readonly string[] {
  const found: string[] = [];

  const walk = (directory: string, underTests: boolean): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full, underTests || entry.name === '__tests__');
        continue;
      }
      if (!entry.isFile()) continue;
      if (!SOURCE_FILE.test(entry.name)) continue;
      if (!underTests) continue;
      found.push(full);
    }
  };

  if (fs.existsSync(root)) walk(root, false);
  return found.sort();
}

function lineOf(source: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset && index < source.length; index += 1) {
    if (source[index] === '\n') line += 1;
  }
  return line;
}

function matchMockCall(
  source: string,
  index: number
): { specifier: string | null; offset: number; end: number } | null {
  for (const runner of MOCK_RUNNERS) {
    if (!source.startsWith(runner, index)) continue;
    let cursor = index + runner.length;
    if (isWordCharacter(source[cursor])) continue;
    cursor = skipWhitespace(source, cursor);
    if (source[cursor] !== '.') continue;
    cursor = skipWhitespace(source, cursor + 1);

    let method: string | null = null;
    for (const candidate of MOCK_METHODS) {
      if (!source.startsWith(candidate, cursor)) continue;
      if (isWordCharacter(source[cursor + candidate.length])) continue;
      method = candidate;
      break;
    }
    if (!method) continue;

    cursor = skipWhitespace(source, cursor + method.length);
    if (source[cursor] !== '(') continue;
    cursor = skipWhitespace(source, cursor + 1);

    const literal = readStringLiteral(source, cursor);
    if (!literal) {
      // The module is not written as a string literal, so the guard cannot read it.
      return { specifier: null, offset: cursor, end: cursor };
    }
    return { specifier: literal.value, offset: literal.offset, end: literal.end };
  }
  return null;
}

function readStringLiteral(
  source: string,
  index: number
): { value: string; offset: number; end: number } | null {
  const quote = source[index];
  if (quote !== "'" && quote !== '"' && quote !== '`') return null;

  let value = '';
  let cursor = index + 1;
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === '\\') {
      value += source[cursor + 1] ?? '';
      cursor += 2;
      continue;
    }
    if (char === quote) {
      return { value, offset: index, end: cursor + 1 };
    }
    value += char;
    cursor += 1;
  }
  return null;
}

function skipWhitespace(source: string, index: number): number {
  let cursor = index;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  return cursor;
}

function isWordCharacter(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_$]/.test(char);
}
