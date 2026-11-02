// ABOUTME: Start-up recovery in the browser: before the app renders or opens a database, an interrupted
// ABOUTME: restore is undone from its safety copy through one-shot workers that release their pools.

import { replaceWasmDatabaseFile } from '@/data/adapters/sqlite/browser';
import { replaceLegacyDatabaseFile } from '@/services/database/SQLiteWASMProvider';

import { recoverInterruptedRestore, type RecoveryOutcome } from './recovery';
import { rememberRestoreNotice } from './restoreNotice';
import { opfsSafetyCopies } from './safetyStore';
import { runAsOnlyTab } from './tabLock';

const databaseName = (fileName: string) => fileName.replace(/\.sqlite3$/, '');

/**
 * Check for an interrupted restore and undo it. Called by the entry point before the app is
 * rendered, so neither database has been opened and no page has read anything. A recovered
 * start leaves a notice for the app; a failed one must not start the app at all.
 */
export async function recoverOnStartup(): Promise<RecoveryOutcome> {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.getDirectory !== 'function') {
    return { status: 'none' };
  }
  const outcome = await recoverInterruptedRestore({
    store: opfsSafetyCopies,
    replaceFile: (role, fileName, bytes) =>
      role === 'canonical'
        ? replaceWasmDatabaseFile(databaseName(fileName), bytes)
        : replaceLegacyDatabaseFile(databaseName(fileName), bytes),
    runExclusively: runAsOnlyTab,
  });
  if (outcome.status === 'recovered') {
    rememberRestoreNotice({ kind: 'recovered', startedAt: outcome.marker.startedAt });
  }
  return outcome;
}
