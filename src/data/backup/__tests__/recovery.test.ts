// ABOUTME: Tests the start-up recovery of an interrupted restore: nothing to do, both databases put
// ABOUTME: back from the safety copy, and every failure reported as one that must block the app.

import { webcrypto } from 'node:crypto';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { buildBackupArchive } from '../archive';
import { recoverInterruptedRestore, type RecoveryDependencies, type RestoreMarker } from '../recovery';

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
});

const canonical = new Uint8Array(512).fill(1);
const legacy = new Uint8Array(512).fill(2);

const marker: RestoreMarker = {
  format: 'schoolpilot-restore-marker',
  version: 1,
  startedAt: '2026-11-02T10:15:00.000Z',
  safetyCopy: 'backup-before-restore-20261102-101500.zip',
  databases: { canonical: 'schoolpilot-canonical.sqlite3', legacy: 'schoolpilot_production.sqlite3' },
};

async function safetyCopy(): Promise<Uint8Array> {
  const archive = await buildBackupArchive({
    createdAt: marker.startedAt,
    appVersion: 'dev',
    dataMode: 'production',
    institutionName: 'Placeholder School',
    files: [
      { role: 'canonical', name: marker.databases.canonical, bytes: canonical, migrations: [], rowCounts: {} },
      { role: 'legacy', name: marker.databases.legacy, bytes: legacy, migrations: [], rowCounts: {} },
    ],
  });
  return archive.bytes;
}

function dependencies(overrides: Partial<RecoveryDependencies> = {}, stored: RestoreMarker | null = marker) {
  let current = stored;
  const replaced: { role: string; fileName: string; bytes: Uint8Array }[] = [];
  const deps: RecoveryDependencies = {
    store: {
      readRestoreMarker: async () => current,
      read: async () => safetyCopy(),
      clearRestoreInProgress: async () => {
        current = null;
      },
    },
    replaceFile: async (role, fileName, bytes) => {
      replaced.push({ role, fileName, bytes });
    },
    runExclusively: (work) => work(),
    ...overrides,
  };
  return { deps, replaced, marker: () => current };
}

describe('recoverInterruptedRestore', () => {
  it('does nothing when no restore was interrupted', async () => {
    const runExclusively = vi.fn();
    const { deps, replaced } = dependencies({ runExclusively }, null);

    expect(await recoverInterruptedRestore(deps)).toEqual({ status: 'none' });
    expect(replaced).toEqual([]);
    expect(runExclusively).not.toHaveBeenCalled();
  });

  it('puts both databases back from the safety copy, then removes the marker', async () => {
    const { deps, replaced, marker: current } = dependencies();

    expect(await recoverInterruptedRestore(deps)).toEqual({ status: 'recovered', marker });
    expect(replaced.map(({ role, fileName }) => [role, fileName])).toEqual([
      ['canonical', 'schoolpilot-canonical.sqlite3'],
      ['legacy', 'schoolpilot_production.sqlite3'],
    ]);
    expect(Array.from(replaced[0].bytes)).toEqual(Array.from(canonical));
    expect(Array.from(replaced[1].bytes)).toEqual(Array.from(legacy));
    expect(current()).toBeNull();
  });

  it('blocks, naming the safety copy, when a database cannot be put back', async () => {
    const { deps, marker: current } = dependencies({
      replaceFile: async (role) => {
        if (role === 'legacy') throw new Error('No available handles to import to.');
      },
    });

    expect(await recoverInterruptedRestore(deps)).toEqual({
      status: 'failed',
      safetyCopy: marker.safetyCopy,
      error: expect.stringMatching(/No available handles/),
    });
    // The marker stays, so the next start tries again rather than opening a half-restored school.
    expect(current()).toEqual(marker);
  });

  it('blocks when the safety copy is gone or damaged', async () => {
    const { deps } = dependencies({
      store: {
        readRestoreMarker: async () => marker,
        read: async () => new TextEncoder().encode('not an archive'),
        clearRestoreInProgress: async () => undefined,
      },
    });

    const outcome = await recoverInterruptedRestore(deps);
    expect(outcome).toMatchObject({ status: 'failed', safetyCopy: marker.safetyCopy });
  });

  it('blocks when the marker cannot be cleared, so the next start does not undo new work', async () => {
    const { deps } = dependencies({
      store: {
        readRestoreMarker: async () => marker,
        read: async () => safetyCopy(),
        clearRestoreInProgress: async () => {
          throw new Error('the storage is full');
        },
      },
    });

    expect(await recoverInterruptedRestore(deps)).toMatchObject({ status: 'failed', error: /storage is full/ });
  });

  it('blocks while another tab is open, and blocks on a marker it cannot read', async () => {
    const busy = dependencies({
      runExclusively: async () => {
        throw new Error('SchoolPilot is open in another tab or window.');
      },
    });
    expect(await recoverInterruptedRestore(busy.deps)).toMatchObject({ status: 'failed', error: /another tab/ });
    expect(busy.replaced).toEqual([]);

    const unreadable = dependencies({
      store: {
        readRestoreMarker: async () => {
          throw new SyntaxError('Unexpected end of JSON input');
        },
        read: async () => safetyCopy(),
        clearRestoreInProgress: async () => undefined,
      },
    });
    expect(await recoverInterruptedRestore(unreadable.deps)).toMatchObject({ status: 'failed', safetyCopy: null });
  });

  it('does nothing when another tab finished the recovery before the lock was granted', async () => {
    let reads = 0;
    const { deps, replaced } = dependencies({
      store: {
        readRestoreMarker: async () => (reads++ === 0 ? marker : null),
        read: async () => safetyCopy(),
        clearRestoreInProgress: async () => undefined,
      },
    });

    expect(await recoverInterruptedRestore(deps)).toEqual({ status: 'none' });
    expect(replaced).toEqual([]);
  });
});
