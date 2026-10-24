// ABOUTME: The settings panel that wires the conflict log to the canonical database, with an
// ABOUTME: adapter override so a test can hand it a database of its own.

import React from 'react';

import { canonicalAdapter } from '@/data/canonicalRepository';
import type { SqliteAdapter } from '@/data/adapters/sqlite';

import { useSyncConflicts } from '../hooks/useSyncConflicts';
import { SyncConflictLog } from './SyncConflictLog';

export interface SyncConflictsPanelProps {
  /** The database to read; defaults to the app's canonical adapter. */
  readonly adapter?: SqliteAdapter | null;
}

/** The sync conflict log, read from the canonical database. */
export const SyncConflictsPanel: React.FC<SyncConflictsPanelProps> = ({ adapter }) => {
  const resolved = adapter === undefined ? canonicalAdapter() : adapter;
  const { conflicts, loading, error, refresh } = useSyncConflicts(resolved);

  return (
    <SyncConflictLog
      conflicts={conflicts}
      loading={loading}
      error={error}
      onRefresh={refresh}
    />
  );
};

export default SyncConflictsPanel;
