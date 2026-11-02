// ABOUTME: The restore-in-progress marker and the start-up recovery it drives: an interrupted restore
// ABOUTME: is undone from its safety copy before the app opens either database, or the app is blocked.

import { openBackupArchive } from './archive';
import type { BackupDatabaseRole } from './validate';

/** Written before a restore replaces anything; removed when the restore has finished or been undone. */
export interface RestoreMarker {
  readonly format: 'schoolpilot-restore-marker';
  readonly version: 1;
  readonly startedAt: string;
  /** The safety copy's file name in the safety-copy store. */
  readonly safetyCopy: string;
  /** The file names of the two databases the restore replaces. */
  readonly databases: { readonly canonical: string; readonly legacy: string };
}

/** What start-up recovery needs; the browser wiring supplies OPFS, the workers and the tab lock. */
export interface RecoveryDependencies {
  readonly store: {
    /** The marker, or null when no restore is under way; throws when it cannot be read. */
    readRestoreMarker(): Promise<RestoreMarker | null>;
    read(fileName: string): Promise<Uint8Array>;
    clearRestoreInProgress(): Promise<void>;
  };
  /** Replace one database file with an image, before anything has opened it. */
  replaceFile(role: BackupDatabaseRole, fileName: string, bytes: Uint8Array): Promise<void>;
  /** Run `work` only as the sole open tab of the app. */
  runExclusively<T>(work: () => Promise<T>): Promise<T>;
}

export type RecoveryOutcome =
  | { readonly status: 'none' }
  | { readonly status: 'recovered'; readonly marker: RestoreMarker }
  /** The app must not start: the data may be half-restored. `safetyCopy` is the intact copy. */
  | { readonly status: 'failed'; readonly safetyCopy: string | null; readonly error: string };

const ROLES: readonly BackupDatabaseRole[] = ['canonical', 'legacy'];

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Undo a restore that did not finish, before the app opens either database.
 *
 * The marker says a restore was replacing the databases when the tab went away, so they may
 * hold the backup, the old data, or a mix. Both are put back from the safety copy - the data as
 * it was before the restore - and the marker is removed. Any failure leaves the marker in place
 * and reports `failed`: the caller must not start the app, because it would open a school that
 * is empty or half-restored without saying so. A marker that cannot be cleared is a failure
 * too, or every later start would undo the work done since.
 */
export async function recoverInterruptedRestore(deps: RecoveryDependencies): Promise<RecoveryOutcome> {
  let marker: RestoreMarker | null;
  try {
    marker = await deps.store.readRestoreMarker();
  } catch (error) {
    return {
      status: 'failed',
      safetyCopy: null,
      error: `SchoolPilot found an unfinished restore but cannot read its record: ${message(error)}`,
    };
  }
  if (!marker) return { status: 'none' };

  const named = marker.safetyCopy;
  try {
    return await deps.runExclusively(async (): Promise<RecoveryOutcome> => {
      // Another tab may have finished the recovery while this one waited for the lock.
      const current = await deps.store.readRestoreMarker();
      if (!current) return { status: 'none' };
      const archive = await openBackupArchive(await deps.store.read(current.safetyCopy));
      for (const role of ROLES) {
        await deps.replaceFile(role, current.databases[role], archive.images[role]);
      }
      await deps.store.clearRestoreInProgress();
      return { status: 'recovered', marker: current };
    });
  } catch (error) {
    return { status: 'failed', safetyCopy: named, error: message(error) };
  }
}
