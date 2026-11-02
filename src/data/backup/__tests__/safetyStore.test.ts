// ABOUTME: Tests the OPFS store of safety copies and the restore marker against an in-memory OPFS:
// ABOUTME: the marker round trip, a full disk refused up front, and no empty file left by a failed save.

import { describe, expect, it } from 'vitest';

import type { RestoreMarker } from '../recovery';
import { createOpfsSafetyStore, SAFETY_COPY_DIRECTORY } from '../safetyStore';

interface FakeFile {
  bytes: Uint8Array;
  modified: number;
}

/** Just enough of the OPFS directory API: one level of directories holding files. */
function fakeStorage(options: { quota?: number; usage?: number; failWrite?: boolean; noWritable?: boolean } = {}) {
  const directories = new Map<string, Map<string, FakeFile>>();
  const directory = (name: string) => {
    const files = directories.get(name) ?? new Map<string, FakeFile>();
    directories.set(name, files);
    const fileHandle = (fileName: string) => ({
      kind: 'file' as const,
      name: fileName,
      getFile: async () => {
        const file = files.get(fileName)!;
        return {
          size: file.bytes.byteLength,
          lastModified: file.modified,
          arrayBuffer: async () => file.bytes.slice().buffer,
          text: async () => new TextDecoder().decode(file.bytes),
        };
      },
      ...(options.noWritable
        ? {}
        : {
            createWritable: async () => {
              const chunks: Uint8Array[] = [];
              return {
                write: async (data: Uint8Array | string) => {
                  if (options.failWrite) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
                  chunks.push(typeof data === 'string' ? new TextEncoder().encode(data) : data);
                },
                close: async () => {
                  const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
                  const bytes = new Uint8Array(size);
                  let at = 0;
                  for (const chunk of chunks) {
                    bytes.set(chunk, at);
                    at += chunk.byteLength;
                  }
                  files.set(fileName, { bytes, modified: Date.now() });
                },
              };
            },
          }),
    });
    return {
      getFileHandle: async (fileName: string, create?: { create?: boolean }) => {
        if (!files.has(fileName)) {
          if (!create?.create) throw new DOMException(`${fileName} not found`, 'NotFoundError');
          // Creating a handle makes an empty file, as OPFS does.
          files.set(fileName, { bytes: new Uint8Array(), modified: Date.now() });
        }
        return fileHandle(fileName);
      },
      removeEntry: async (fileName: string) => {
        if (!files.delete(fileName)) throw new DOMException(`${fileName} not found`, 'NotFoundError');
      },
      values: async function* () {
        for (const fileName of files.keys()) yield fileHandle(fileName);
      },
    };
  };
  const storage = {
    getDirectory: async () => ({
      getDirectoryHandle: async (name: string) => directory(name),
    }),
    estimate: async () => ({ quota: options.quota ?? 1_000_000, usage: options.usage ?? 0 }),
  } as unknown as StorageManager;
  return { storage, files: () => directories.get(SAFETY_COPY_DIRECTORY) ?? new Map() };
}

const marker: RestoreMarker = {
  format: 'schoolpilot-restore-marker',
  version: 1,
  startedAt: '2026-11-02T10:15:00.000Z',
  safetyCopy: 'backup-before-restore-20261102-101500.zip',
  databases: { canonical: 'schoolpilot-canonical.sqlite3', legacy: 'schoolpilot_production.sqlite3' },
};

describe('OPFS safety-copy store', () => {
  it('writes, reads and clears the restore marker beside the safety copies, and lists only the copies', async () => {
    const { storage } = fakeStorage();
    const store = createOpfsSafetyStore(() => storage);

    expect(await store.readRestoreMarker()).toBeNull();
    await store.save(marker.safetyCopy, new Uint8Array([1, 2, 3]));
    await store.markRestoreInProgress(marker);

    expect(await store.readRestoreMarker()).toEqual(marker);
    expect((await store.list()).map((copy) => copy.name)).toEqual([marker.safetyCopy]);
    expect(Array.from(await store.read(marker.safetyCopy))).toEqual([1, 2, 3]);

    await store.clearRestoreInProgress();
    expect(await store.readRestoreMarker()).toBeNull();
    // Clearing a marker that is not there is not an error.
    await store.clearRestoreInProgress();
  });

  it('refuses a marker that is not one it wrote', async () => {
    const { storage } = fakeStorage();
    const store = createOpfsSafetyStore(() => storage);
    await store.markRestoreInProgress({ ...marker, format: 'something-else' } as unknown as RestoreMarker);

    await expect(store.readRestoreMarker()).rejects.toThrow(/not a restore marker/);
  });

  it('refuses a safety copy the browser has no room for, before writing anything', async () => {
    const { storage, files } = fakeStorage({ quota: 1000, usage: 900 });
    const store = createOpfsSafetyStore(() => storage);

    await expect(store.save(marker.safetyCopy, new Uint8Array(500))).rejects.toThrow(/not enough storage/i);
    expect(files().size).toBe(0);
  });

  it('removes the empty file a failed save leaves behind', async () => {
    const { storage, files } = fakeStorage({ failWrite: true });
    const store = createOpfsSafetyStore(() => storage);

    await expect(store.save(marker.safetyCopy, new Uint8Array(10))).rejects.toThrow(/quota/);
    expect(files().has(marker.safetyCopy)).toBe(false);
  });

  it('refuses to save where the page cannot write OPFS files, so no restore starts without a copy', async () => {
    const { storage, files } = fakeStorage({ noWritable: true });
    const store = createOpfsSafetyStore(() => storage);

    await expect(store.save(marker.safetyCopy, new Uint8Array(10))).rejects.toThrow(/cannot keep a safety copy/);
    expect(files().size).toBe(0);
  });
});
