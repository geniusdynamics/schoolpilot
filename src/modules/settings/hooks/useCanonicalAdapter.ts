// ABOUTME: Opens the canonical database for a settings page that reads it, and hands back its adapter.
// ABOUTME: Such a page used to report "not open yet" unless some other page happened to have opened it first.

import { useEffect, useState } from 'react';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { canonicalAdapter, openCanonicalRepository } from '@/data/canonicalRepository';

export interface CanonicalAdapterState {
  /** The adapter the canonical tables live on; null while the database is opening or after it failed. */
  readonly adapter: SqliteAdapter | null;
  /** Why the database could not be opened, once it has failed. */
  readonly error: string | null;
}

/**
 * The canonical database's adapter, opening the database first when nothing else has.
 *
 * The database is opened once for the whole app and shared, so a page that calls this after
 * another page has opened it gets the adapter on its first render. Otherwise `adapter` and
 * `error` are both null while it opens, which is the page's cue to show that it is waiting.
 *
 * `enabled` is false for a caller that already holds an adapter of its own: nothing is opened.
 */
export function useCanonicalAdapter(enabled = true): CanonicalAdapterState {
  const [adapter, setAdapter] = useState<SqliteAdapter | null>(() => canonicalAdapter());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || adapter) return;

    let cancelled = false;
    openCanonicalRepository()
      .then(() => {
        if (!cancelled) setAdapter(canonicalAdapter());
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(failure instanceof Error ? failure.message : String(failure));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, adapter]);

  return { adapter, error };
}
