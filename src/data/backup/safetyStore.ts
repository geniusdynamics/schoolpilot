// ABOUTME: The OPFS store of the safety copies a restore leaves behind, and of the marker that says
// ABOUTME: a restore is under way, both in one directory beside (never inside) the SQLite pools.

import type { SafetyCopyStore } from './backupService';
import type { RestoreMarker } from './recovery';

/** The OPFS directory the safety copies and the restore marker live in. */
export const SAFETY_COPY_DIRECTORY = 'schoolpilot-restore-safety';
/** The marker's file name; it is not a safety copy and is never listed as one. */
export const RESTORE_MARKER_FILE = 'restore-in-progress.json';

/** A safety copy stored in this browser. */
export interface SafetyCopy {
  readonly name: string;
  readonly bytes: number;
  readonly modified: number;
}

export interface OpfsSafetyStore extends SafetyCopyStore {
  readRestoreMarker(): Promise<RestoreMarker | null>;
  list(): Promise<SafetyCopy[]>;
  read(name: string): Promise<Uint8Array>;
  remove(name: string): Promise<void>;
}

/** The one method this store needs; a browser without it cannot keep a safety copy (jsdom, old Safari). */
interface WritableHandle {
  createWritable?: () => Promise<FileSystemWritableFileStream>;
}

const isNotFound = (error: unknown) => error instanceof DOMException && error.name === 'NotFoundError';

/**
 * The store over the browser's OPFS. `storage` is read when a method runs, so the module can be
 * imported where there is no OPFS (tests, node) without touching it.
 */
export function createOpfsSafetyStore(storage: () => StorageManager = () => navigator.storage): OpfsSafetyStore {
  const directory = async (): Promise<FileSystemDirectoryHandle> =>
    (await storage().getDirectory()).getDirectoryHandle(SAFETY_COPY_DIRECTORY, { create: true });

  /**
   * Write a whole file through a writable stream, which commits only on close. A failure removes
   * the entry, so a half-written or empty file is never mistaken for a copy.
   */
  const writeFile = async (fileName: string, data: Uint8Array | string): Promise<void> => {
    const folder = await directory();
    const handle = (await folder.getFileHandle(fileName, { create: true })) as WritableHandle;
    try {
      if (typeof handle.createWritable !== 'function') {
        throw new Error(
          'This browser cannot keep a safety copy of the current data (it cannot write files from the page), so SchoolPilot cannot restore here safely.'
        );
      }
      const writable = await handle.createWritable();
      await writable.write(data as FileSystemWriteChunkType);
      await writable.close();
    } catch (error) {
      await folder.removeEntry(fileName).catch(() => undefined);
      throw error;
    }
  };

  return {
    async save(fileName, bytes) {
      const estimate = await storage().estimate?.().catch(() => null);
      if (estimate?.quota !== undefined && estimate.usage !== undefined) {
        const free = estimate.quota - estimate.usage;
        if (free < bytes.byteLength) {
          throw new Error(
            `There is not enough storage left in this browser for a safety copy of the current data (${bytes.byteLength} bytes needed, ${Math.max(free, 0)} free). Free some space, then restore again.`
          );
        }
      }
      await writeFile(fileName, bytes);
      return `${SAFETY_COPY_DIRECTORY}/${fileName}`;
    },

    async markRestoreInProgress(marker) {
      await writeFile(RESTORE_MARKER_FILE, JSON.stringify(marker));
    },

    async clearRestoreInProgress() {
      try {
        await (await directory()).removeEntry(RESTORE_MARKER_FILE);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    },

    async readRestoreMarker() {
      let text: string;
      try {
        text = await (await (await directory()).getFileHandle(RESTORE_MARKER_FILE)).getFile().then((file) => file.text());
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
      const parsed = JSON.parse(text) as Partial<RestoreMarker>;
      if (
        parsed.format !== 'schoolpilot-restore-marker' ||
        parsed.version !== 1 ||
        typeof parsed.safetyCopy !== 'string' ||
        typeof parsed.databases?.canonical !== 'string' ||
        typeof parsed.databases?.legacy !== 'string'
      ) {
        throw new Error(`${RESTORE_MARKER_FILE} is not a restore marker this version of SchoolPilot wrote`);
      }
      return parsed as RestoreMarker;
    },

    async list() {
      const folder = await directory();
      const copies: SafetyCopy[] = [];
      for await (const entry of folder.values()) {
        if (entry.kind !== 'file' || !entry.name.endsWith('.zip')) continue;
        const file = await (entry as FileSystemFileHandle).getFile();
        copies.push({ name: entry.name, bytes: file.size, modified: file.lastModified });
      }
      return copies.sort((a, b) => b.modified - a.modified);
    },

    async read(name) {
      const file = await (await (await directory()).getFileHandle(name)).getFile();
      return new Uint8Array(await file.arrayBuffer());
    },

    async remove(name) {
      await (await directory()).removeEntry(name);
    },
  };
}

/** The store over this browser's OPFS. */
export const opfsSafetyCopies = createOpfsSafetyStore();
