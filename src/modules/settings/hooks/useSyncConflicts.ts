// ABOUTME: Loads the sync conflict log for the settings panel and exposes a refresh, so the
// ABOUTME: page never reaches into the adapter's SQL itself.

import { useCallback, useEffect, useState } from 'react';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { readSyncConflicts, type SyncConflict } from '@/data/sync';

export interface SyncConflictsState {
  readonly conflicts: readonly SyncConflict[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => void;
}

/** Reads the conflict log of the canonical database, once per adapter and refresh. */
export function useSyncConflicts(
  adapter: SqliteAdapter | null | undefined
): SyncConflictsState {
  const [conflicts, setConflicts] = useState<readonly SyncConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((current) => current + 1), []);

  useEffect(() => {
    if (!adapter) {
      setConflicts([]);
      setLoading(false);
      setError('the canonical database is not open yet');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    readSyncConflicts(adapter)
      .then((rows) => {
        if (cancelled) return;
        setConflicts(rows);
        setLoading(false);
      })
      .catch((failure: unknown) => {
        if (cancelled) return;
        setError(failure instanceof Error ? failure.message : String(failure));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [adapter, nonce]);

  return { conflicts, loading, error, refresh };
}
