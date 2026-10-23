// ABOUTME: The cashier screen's data seam: the payments port the screen writes through, and the
// ABOUTME: runtime that composes the domain services - sequences, sessions and the ledger - over
// ABOUTME: the one canonical database connection.

import { useEffect, useState } from 'react';

import { canonicalAdapter } from '@/data/canonicalRepository';
import {
  CashierSessionService,
  PaymentsService,
  PAYMENTS_SEQUENCE_CATALOG,
  createSqliteCashierSessionStore,
  ensureCashierSchema,
  type CashierSession,
  type CloseSessionInput,
  type OpenSessionInput,
  type RecordPaymentInput,
  type RecordedPayment,
  type SessionClose,
  type ZReport,
} from '@/domain/finance/payments';
import {
  LedgerService,
  createLedgerAccountMapping,
  createSqliteLedgerStore,
  ensureLedgerSchema,
} from '@/domain/finance/ledger';
import {
  SequenceService,
  createSqliteSequenceStore,
  ensureSequenceSchema,
} from '@/domain/sequences';

import { useFinanceRepository, type FinanceRepository } from '../../data/canonicalFinance';

/** What the cashier screen asks of the payments core. The service composition satisfies it. */
export interface CashierPaymentsPort {
  recordPayment(input: RecordPaymentInput): Promise<RecordedPayment>;
  openSession(input: OpenSessionInput): Promise<CashierSession>;
  closeSession(input: CloseSessionInput): Promise<SessionClose>;
  session(id: string): Promise<CashierSession | null>;
  openSessionFor(institutionId: string, cashierUserId: string): Promise<CashierSession | null>;
  zReport(id: string): Promise<ZReport>;
  listSessions(query?: { readonly institutionId?: string }): Promise<readonly CashierSession[]>;
}

/** The runtimes already opened, keyed by the adapter they run on. */
const runtimes = new WeakMap<object, Promise<CashierPaymentsPort>>();

/**
 * Composes the payments core over the canonical database.
 *
 * The domain modules keep their own tables, so their DDL is applied to the canonical adapter and
 * their stores run on that same connection: one database, one transaction at a time. The posting
 * engine posts against the control accounts of the default chart, which is all a payment needs -
 * the fee-item revenue mapping only matters to an invoice or a credit note.
 *
 * Returns null when the canonical database is not open (a component test that hands the pages its
 * own repository), so the screen can fall back to the port it was given.
 */
export function openCashierRuntime(
  repository: FinanceRepository
): Promise<CashierPaymentsPort | null> {
  const adapter = canonicalAdapter();
  if (!adapter) return Promise.resolve(null);

  const existing = runtimes.get(adapter);
  if (existing) return existing;

  const opening = (async () => {
    await ensureSequenceSchema(adapter);
    await ensureCashierSchema(adapter);
    await ensureLedgerSchema(adapter);

    const sequences = new SequenceService({
      store: createSqliteSequenceStore(adapter),
      definitions: PAYMENTS_SEQUENCE_CATALOG,
      deviceId: 'cashier-screen',
    });
    const ledger = new LedgerService({
      store: createSqliteLedgerStore(adapter),
      mapping: createLedgerAccountMapping(),
    });
    const sessions = new CashierSessionService({
      store: createSqliteCashierSessionStore(adapter),
    });
    const payments = new PaymentsService({
      store: repository,
      numbers: sequences,
      ledger,
      sessions,
    });

    return {
      recordPayment: (input) => payments.recordPayment(input),
      openSession: (input) => sessions.open(input),
      closeSession: (input) => sessions.close(input),
      session: (id) => sessions.session(id),
      openSessionFor: (institutionId, cashierUserId) =>
        sessions.openSessionFor(institutionId, cashierUserId),
      zReport: (id) => sessions.zReport(id),
      listSessions: (query) => sessions.sessions(query ?? {}),
    } satisfies CashierPaymentsPort;
  })();

  runtimes.set(adapter, opening);
  return opening;
}

/** The payments port the screen writes through, or null while the runtime is opening. */
export function useCashierRuntimePort(): CashierPaymentsPort | null {
  const repository = useFinanceRepository();
  const [port, setPort] = useState<CashierPaymentsPort | null>(null);

  useEffect(() => {
    let cancelled = false;
    void openCashierRuntime(repository)
      .then((opened) => {
        if (!cancelled) setPort(opened);
      })
      .catch((error: unknown) => {
        console.error('[cashier] the payments runtime did not open:', error);
        if (!cancelled) setPort(null);
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  return port;
}
