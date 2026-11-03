// ABOUTME: The transport screen's number source: the sequence module over the canonical database,
// ABOUTME: opened with the ledger and sequence tables the billing run needs.

import { useEffect, useState } from 'react';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { canonicalAdapter } from '@/data/canonicalRepository';
import { ensureLedgerSchema } from '@/domain/finance/ledger';
import type { TransportNumberSource } from '@/domain/finance/transport';
import {
  SequenceService,
  createSqliteSequenceStore,
  ensureSequenceSchema,
} from '@/domain/sequences';

/** What the routes screen knows about the document-number and ledger tables. */
export interface TransportBillingRuntime {
  readonly status: 'loading' | 'ready' | 'unavailable' | 'error';
  readonly error: unknown;
  readonly numbers: TransportNumberSource | null;
}

const UNAVAILABLE: TransportBillingRuntime = {
  status: 'unavailable',
  error: null,
  numbers: null,
};

/**
 * Opens the sequence source a billing run numbers its invoices from.
 *
 * The app opens the canonical database and its module tables before a page renders; a test or a
 * caller outside that path hands the page the adapter it is already using. Without either, the
 * screen says billing is unavailable rather than inventing a number.
 */
export function useTransportBillingRuntime(
  adapter?: SqliteAdapter | null
): TransportBillingRuntime {
  const [runtime, setRuntime] = useState<TransportBillingRuntime>(() =>
    (adapter ?? canonicalAdapter()) === null ? UNAVAILABLE : { ...UNAVAILABLE, status: 'loading' }
  );

  useEffect(() => {
    const storage = adapter ?? canonicalAdapter();
    if (!storage) {
      setRuntime(UNAVAILABLE);
      return;
    }

    let cancelled = false;
    setRuntime({ ...UNAVAILABLE, status: 'loading' });
    // One transaction at a time: both guarantees open their own on the same adapter.
    void (async () => {
      await ensureLedgerSchema(storage);
      await ensureSequenceSchema(storage);
      if (cancelled) return;
      setRuntime({
        status: 'ready',
        error: null,
        numbers: new SequenceService({ store: createSqliteSequenceStore(storage) }),
      });
    })().catch((error: unknown) => {
      if (!cancelled) setRuntime({ status: 'error', error, numbers: null });
    });

    return () => {
      cancelled = true;
    };
  }, [adapter]);

  return runtime;
}
