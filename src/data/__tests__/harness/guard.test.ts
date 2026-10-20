// ABOUTME: The self-test of the storage-mock guard: it fires on a file that mocks the
// ABOUTME: storage layer and stays quiet on the integration tests of this repository.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  dataStorageRoot,
  findStorageMockViolations,
  repositoryRoot,
  resolveSpecifier,
  scanForStorageMocks,
} from './index';

// The offending call is assembled, so the guard's own file does not hold a mock call of
// the storage layer in a code position.
const MOCK_CALL = 'vi' + '.mock';
const MOCK_METHOD_CALL = 'vi' + '.doMock';

describe('storage-mock guard', () => {
  it('fires on a test file that mocks the storage adapter', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'schoolpilot-guard-'));
    const file = path.join(directory, 'offending.test.ts');
    const content = [
      "import { vi } from 'vitest';",
      '',
      MOCK_CALL + "('@/data/adapters/sqlite', () => ({ createNodeSqliteAdapter: vi.fn() }));",
      '',
    ].join('\n');
    fs.writeFileSync(file, content, 'utf8');

    try {
      const violations = findStorageMockViolations([{ path: file, content }]);

      expect(violations).toHaveLength(1);
      expect(violations[0]?.specifier).toBe('@/data/adapters/sqlite');
      expect(violations[0]?.line).toBe(3);
      expect(violations[0]?.message).toContain('mocks the storage module');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fires on a relative import of the repository', () => {
    const file = path.join(
      repositoryRoot(),
      'src',
      'data',
      '__tests__',
      'harness',
      'offending.test.ts'
    );
    const content = [
      "import { vi } from 'vitest';",
      '',
      MOCK_METHOD_CALL + "('../../repository', () => ({ createRepository: vi.fn() }));",
      '',
    ].join('\n');

    const violations = findStorageMockViolations([{ path: file, content }]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.specifier).toBe('../../repository');
  });

  it('leaves a mock of a module outside the storage layer alone', () => {
    const file = path.join(repositoryRoot(), 'src', 'data', '__tests__', 'harness', 'other.test.ts');
    const content = [
      "import { vi } from 'vitest';",
      '',
      MOCK_CALL + "('react-i18next', () => ({ useTranslation: vi.fn() }));",
      '',
    ].join('\n');

    expect(findStorageMockViolations([{ path: file, content }])).toEqual([]);
  });

  it('catches a mock whose module is written as a template literal', () => {
    const file = path.join(repositoryRoot(), 'src', 'data', '__tests__', 'harness', 'other.test.ts');
    const content = [
      "import { vi } from 'vitest';",
      '',
      MOCK_CALL + '(`@/data/adapters/sqlite`, () => ({}));',
      '',
    ].join('\n');

    const violations = findStorageMockViolations([{ path: file, content }]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.specifier).toBe('@/data/adapters/sqlite');
  });

  it('leaves a mock call written inside a string alone', () => {
    const file = path.join(repositoryRoot(), 'src', 'data', '__tests__', 'harness', 'other.test.ts');
    const content = [
      "import { vi } from 'vitest';",
      '',
      "const example = \"" + MOCK_CALL + "('@/data/adapters/sqlite')\";",
      '// ' + MOCK_CALL + "('@/data/repository') is only a comment",
      '',
    ].join('\n');

    expect(findStorageMockViolations([{ path: file, content }])).toEqual([]);
  });

  it('catches a mock whose module is not a string literal', () => {
    const file = path.join(repositoryRoot(), 'src', 'data', '__tests__', 'harness', 'other.test.ts');
    const content = [
      "import { vi } from 'vitest';",
      '',
      "const module = '@/data/repository';",
      MOCK_CALL + '(module, () => ({}));',
      '',
    ].join('\n');

    const violations = findStorageMockViolations([{ path: file, content }]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.specifier).toBeNull();
    expect(violations[0]?.message).toContain('not written as a string literal');
  });

  it('scans a helper module of a test directory, not only the test files', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'schoolpilot-guard-'));
    const tests = path.join(directory, '__tests__');
    fs.mkdirSync(tests);
    const file = path.join(tests, 'helper.ts');
    const content = [
      "import { vi } from 'vitest';",
      '',
      MOCK_CALL + "('@/data/repository', () => ({ createRepository: vi.fn() }));",
      '',
    ].join('\n');
    fs.writeFileSync(file, content, 'utf8');

    try {
      const violations = scanForStorageMocks(directory, { repositoryRoot: repositoryRoot() });

      expect(violations).toHaveLength(1);
      expect(violations[0]?.specifier).toBe('@/data/repository');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('finds no storage mock in the integration tests of this repository', () => {
    expect(scanForStorageMocks(dataStorageRoot())).toEqual([]);
  });

  it('resolves a specifier that names a package to nothing', () => {
    expect(resolveSpecifier('react-i18next', 'src/data/__tests__/harness/other.test.ts')).toBeNull();
  });
});
