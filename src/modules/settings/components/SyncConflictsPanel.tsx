// ABOUTME: The settings panel that wires the conflict log to the canonical database, opening it when no other
// ABOUTME: page has, with an adapter override so a test can hand it a database of its own.

import React from 'react';

import type { SqliteAdapter } from '@/data/adapters/sqlite';

import { useCanonicalAdapter } from '../hooks/useCanonicalAdapter';
import { useSyncConflicts } from '../hooks/useSyncConflicts';
import { SyncConflictLog } from './SyncConflictLog';

export interface SyncConflictsPanelProps {
  /** The database to read; defaults to the app's canonical database, opened on demand. */
  readonly adapter?: SqliteAdapter | null;
}

/** The sync conflict log, read from the canonical database. */
export const SyncConflictsPanel: React.FC<SyncConflictsPanelProps> = ({ adapter }) => {
  const supplied = adapter !== undefined;
  const canonical = useCanonicalAdapter(!supplied);
  const resolved = supplied ? adapter : canonical.adapter;
  const { conflicts, loading, error, refresh } = useSyncConflicts(resolved);

  // While the database opens there is nothing to report yet: that is loading, not "not open".
  const opening = !supplied && resolved === null && canonical.error === null;
  const shownError = !supplied && canonical.error !== null ? canonical.error : opening ? null : error;

  return (
    <SyncConflictLog
      conflicts={conflicts}
      loading={loading || opening}
      error={shownError}
      onRefresh={refresh}
    />
  );
};

export default SyncConflictsPanel;
