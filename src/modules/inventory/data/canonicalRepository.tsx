// ABOUTME: The canonical repository the inventory pages read and write through, and the provider that hands it to them.
// ABOUTME: One instance per app: every module shares the slot, so all of them read the same canonical database.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { createNodeSqliteAdapter, createWasmSqliteAdapter } from '@/data/adapters/sqlite';
import { createRepository } from '@/data/repository';
import type { QueryRepository } from '@/data/query';

import Spinner from '@/components/ui/Spinner';

/** The name of the global slot every module shares the one canonical repository under. */
const REPOSITORY_SLOT = '__schoolpilotCanonicalRepository';

interface RepositorySlot {
  repository?: QueryRepository;
  opening?: Promise<QueryRepository>;
}

interface RepositoryScope {
  [REPOSITORY_SLOT]?: RepositorySlot;
}

const scope = globalThis as unknown as RepositoryScope;

function slot(): RepositorySlot {
  scope[REPOSITORY_SLOT] ??= {};
  return scope[REPOSITORY_SLOT];
}

/** True when the browser can hold the canonical database in OPFS. */
function supportsOpfs(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.storage?.getDirectory === 'function'
  );
}

/**
 * Opens the canonical database and hands back the repository over it.
 *
 * The browser keeps the canonical tables in their own OPFS SQLite file, beside the
 * legacy document collections; Node (tests and scripts) uses an in-memory database.
 * The schema is the canonical one, applied by the repository itself.
 */
async function openCanonicalRepository(): Promise<QueryRepository> {
  const shared = slot();
  if (shared.repository) return shared.repository;
  shared.opening ??= (async () => {
    const adapter = supportsOpfs()
      ? createWasmSqliteAdapter({ dbName: 'schoolpilot-canonical', foreignKeys: true })
      : createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
    await adapter.open();
    const repository = createRepository({ adapter });
    await repository.setup();
    shared.repository = repository;
    return repository;
  })();
  return shared.opening;
}

const CanonicalRepositoryContext = createContext<QueryRepository | null>(null);

/**
 * Hands the canonical repository to the pages.
 *
 * The app shell injects the repository it already holds; without one the provider
 * opens the canonical database itself, once for the whole app. A provider nested in
 * another one inherits the repository of the outer provider, so a page that wraps
 * itself always reads the repository the app handed down.
 */
export const CanonicalRepositoryProvider: React.FC<{
  readonly repository?: QueryRepository;
  readonly children: ReactNode;
}> = ({ repository, children }) => {
  const inherited = useContext(CanonicalRepositoryContext);
  const [resolved, setResolved] = useState<QueryRepository | null>(
    repository ?? inherited ?? slot().repository ?? null
  );
  const [failure, setFailure] = useState<unknown>(null);

  useEffect(() => {
    const given = repository ?? inherited ?? null;
    if (given) {
      setResolved(given);
      return;
    }
    let cancelled = false;
    void openCanonicalRepository()
      .then((opened) => {
        if (!cancelled) setResolved(opened);
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure(error);
      });
    return () => {
      cancelled = true;
    };
  }, [repository, inherited]);

  if (failure) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        The canonical data layer is unavailable, so this page cannot be shown.
      </p>
    );
  }

  if (!resolved) {
    return (
      <div className="flex justify-center items-center py-8" role="status" aria-live="polite">
        <Spinner />
      </div>
    );
  }

  return (
    <CanonicalRepositoryContext.Provider value={resolved}>{children}</CanonicalRepositoryContext.Provider>
  );
};

/** The canonical repository the page reads and writes through. */
export function useCanonicalRepository(): QueryRepository {
  const repository = useContext(CanonicalRepositoryContext) ?? slot().repository;
  if (!repository) {
    throw new Error('useCanonicalRepository must be used within a CanonicalRepositoryProvider');
  }
  return repository;
}
