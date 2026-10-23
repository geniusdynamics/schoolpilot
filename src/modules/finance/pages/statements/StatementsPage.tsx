// ABOUTME: The statements page of spec 05 section 6: a learner, household or sponsor statement with
// ABOUTME: its period range, its running balance, its aging summary and its clearance, with a print
// ABOUTME: and a CSV path. Every figure comes from the statements module; the page recomputes nothing.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { CanonicalRepositoryProvider, canonicalAdapter } from '@/data/canonicalRepository';
import { useEntityQuery } from '@/data/query';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { DownloadIcon, PrinterIcon } from '@/components/ui/icons';
import { printReport } from '@/components/reports/print';
import {
  LedgerService,
  createSqliteLedgerStore,
  ensureLedgerSchema,
} from '@/domain/finance/ledger';
import {
  StatementService,
  statementCsv,
  type ClearanceState,
  type LedgerReader,
  type SponsorSubject,
  type Statement,
  type StatementKind,
} from '@/domain/finance/statements';
import { asId, type Id } from '@/domain/ids';
import { formatMoney, isCurrencyCode, type CurrencyCode } from '@/domain/money';

import { useFinanceRepository } from '../../data/canonicalFinance';

export interface StatementsPageProps {
  /** A ledger the caller already holds. Takes precedence over `adapter`. */
  readonly ledger?: LedgerReader | null;
  /** The storage the ledger is built over when no service is supplied. */
  readonly adapter?: SqliteAdapter | null;
  readonly currency?: CurrencyCode;
  /**
   * The sponsors whose statements can be shown.
   *
   * The platform models no sponsor invoice or sponsor receipt entity yet, so a sponsor's documents
   * are the caller's: the split billing of P3-B04 issues a sponsor invoice beside the learner's, and
   * the host names those documents here. Without them the sponsor mode says so.
   */
  readonly sponsors?: readonly SponsorSubject[];
  /** The clock the aging's as-of day falls back to. */
  readonly now?: () => Date;
}

/** The reason the statements are unavailable while the canonical data layer is not open. */
const NOT_CONNECTED_REASON =
  'A statement is the ledger\u2019s running account on the canonical database. The canonical data ' +
  'layer is not open, so the ledger has not been opened either: the app opens it at start-up, and ' +
  'a caller outside that path hands this page the ledger (or the SQLite adapter it is built over) ' +
  'as a prop.';

const SPONSOR_GAP_REASON =
  'The platform models no sponsor invoice or sponsor receipt entity yet, so a sponsor statement ' +
  'needs the sponsor\u2019s documents to be supplied. A host can pass them to this page.';

const CLEARANCE_LABEL: Readonly<Record<ClearanceState, string>> = {
  cleared: 'Cleared',
  on_plan: 'On plan',
  in_arrears: 'In arrears',
};

/** Opens a ledger over an already-open adapter, applying the ledger's DDL once. */
async function openLedgerOver(adapter: SqliteAdapter): Promise<LedgerService> {
  await ensureLedgerSchema(adapter);
  return new LedgerService({ store: createSqliteLedgerStore(adapter) });
}

/**
 * Resolves the ledger the page reads: the one it was handed, or one built over the caller's
 * adapter, or - with neither - the one canonical connection the app opened. Without an adapter of
 * its own the page reads the canonical ledger rather than staying empty.
 */
function useStatementLedger(
  ledger: LedgerReader | null | undefined,
  adapter: SqliteAdapter | null | undefined
): { readonly ledger: LedgerReader | null; readonly status: 'unavailable' | 'loading' | 'ready' | 'error'; readonly error: unknown } {
  const [opened, setOpened] = useState<LedgerService | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const [storage, setStorage] = useState<SqliteAdapter | null | undefined>(
    () => adapter ?? canonicalAdapter()
  );

  useEffect(() => {
    // The canonical database may open just after this page mounts, so it is re-read rather than
    // latched at the first render; the caller's adapter always wins.
    setStorage(adapter ?? canonicalAdapter());
  }, [adapter]);

  useEffect(() => {
    if (ledger || !storage) {
      setOpened(null);
      return;
    }
    let cancelled = false;
    void openLedgerOver(storage)
      .then((service) => {
        if (!cancelled) setOpened(service);
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure(error);
      });
    return () => {
      cancelled = true;
    };
  }, [ledger, storage]);

  if (ledger) return { ledger, status: 'ready', error: null };
  if (failure) return { ledger: null, status: 'error', error: failure };
  if (!storage) return { ledger: null, status: 'unavailable', error: null };
  return { ledger: opened, status: opened ? 'ready' : 'loading', error: null };
}

/** The amount columns of the running balance, formatted exactly. */
function Amount({ value }: { readonly value: { readonly amount_minor: number; readonly currency: CurrencyCode } }): React.ReactElement {
  return <span className="font-mono">{formatMoney(value)}</span>;
}

export const StatementsPageContent: React.FC<StatementsPageProps> = (props) => {
  const repository = useFinanceRepository();
  const institutions = useEntityQuery(repository, 'institution');
  const learners = useEntityQuery(repository, 'learner');
  const households = useEntityQuery(repository, 'household');

  const institution = institutions.data?.items[0];
  const institutionId: Id<'institution'> | undefined = institution
    ? asId<'institution'>(institution.id)
    : undefined;
  const currency: CurrencyCode =
    props.currency ?? (isCurrencyCode(institution?.base_currency) ? institution.base_currency : 'KES');

  const resolved = useStatementLedger(props.ledger, props.adapter);
  const [sponsors] = useState<readonly SponsorSubject[]>(props.sponsors ?? []);
  // The clock is read through a ref so an inline `now` prop cannot re-create the service each
  // render and re-run the statement read forever.
  const nowRef = useRef(props.now);
  nowRef.current = props.now;

  const [kind, setKind] = useState<StatementKind>('learner');
  const [learnerId, setLearnerId] = useState('');
  const [householdId, setHouseholdId] = useState('');
  const [sponsorId, setSponsorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statement, setStatement] = useState<Statement | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const service = useMemo(
    () =>
      resolved.ledger && institutionId
        ? new StatementService({
            ledger: resolved.ledger,
            store: repository,
            institutionId,
            currency,
            ...(nowRef.current === undefined ? {} : { now: nowRef.current }),
          })
        : null,
    [resolved.ledger, repository, institutionId, currency]
  );

  const subjectId = kind === 'learner' ? learnerId : kind === 'household' ? householdId : sponsorId;
  const periodFrom = from === '' ? null : from;
  const periodTo = to === '' ? null : to;

  useEffect(() => {
    if (!service || subjectId === '') {
      setStatement(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const period = { from: periodFrom, to: periodTo };
        let built: Statement;
        if (kind === 'learner') {
          built = await service.learnerStatement(asId<'learner'>(subjectId), period);
        } else if (kind === 'household') {
          built = await service.householdStatement(asId<'household'>(subjectId), period);
        } else {
          const sponsor = sponsors.find((candidate) => candidate.id === subjectId);
          if (!sponsor) throw new Error(SPONSOR_GAP_REASON);
          built = await service.sponsorStatement(sponsor, period);
        }
        if (!cancelled) setStatement(built);
      } catch (thrown: unknown) {
        if (!cancelled) {
          setStatement(null);
          setError(thrown);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [service, kind, subjectId, periodFrom, periodTo, sponsors, nonce]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  const onPrint = useCallback(() => {
    void printReport();
  }, []);

  const onExport = useCallback(() => {
    if (!statement) return;
    const csv = statementCsv(statement);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `statement-${statement.kind}-${statement.subjectId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [statement]);

  const subjectOptions = useMemo(() => {
    if (kind === 'learner') {
      return (learners.data?.items ?? []).map((learner) => ({
        value: learner.id,
        label: `${learner.preferred_name ?? learner.given_name} ${learner.family_name} · ${learner.admission_number}`,
      }));
    }
    if (kind === 'household') {
      return (households.data?.items ?? []).map((household) => ({ value: household.id, label: household.name }));
    }
    return sponsors.map((sponsor) => ({ value: sponsor.id, label: sponsor.name }));
  }, [kind, learners.data, households.data, sponsors]);

  if (resolved.status === 'unavailable') {
    return (
      <Card title="Statements">
        <p role="status" className="font-medium text-surface-foreground">
          The ledger is not connected
        </p>
        <p className="mt-2 text-sm text-surface-muted-fg">{NOT_CONNECTED_REASON}</p>
      </Card>
    );
  }

  if (resolved.status === 'error') {
    return (
      <Card title="Statements">
        <p role="alert" className="font-medium text-red-600">
          The ledger could not be read.
        </p>
        <p className="mt-2 text-sm text-surface-muted-fg">{String(resolved.error)}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card title="Statement">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Select label="Statement for" value={kind} onChange={(event) => setKind(event.target.value as StatementKind)} data-testid="statements-kind">
            <option value="learner">A learner</option>
            <option value="household">A household</option>
            <option value="sponsor">A sponsor</option>
          </Select>
          <Select
            label={kind === 'learner' ? 'Learner' : kind === 'household' ? 'Household' : 'Sponsor'}
            value={subjectId}
            onChange={(event) => {
              if (kind === 'learner') setLearnerId(event.target.value);
              else if (kind === 'household') setHouseholdId(event.target.value);
              else setSponsorId(event.target.value);
            }}
            data-testid="statements-subject"
          >
            <option value="">Choose…</option>
            {subjectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-surface-foreground">From</span>
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-surface-foreground">To</span>
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="secondary" size="sm" onClick={refresh} data-testid="statements-refresh">
              Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={onPrint} leftIcon={<PrinterIcon className="h-4 w-4" />} data-testid="statements-print">
              Print
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onExport}
              disabled={statement === null}
              leftIcon={<DownloadIcon className="h-4 w-4" />}
              data-testid="statements-csv"
            >
              CSV
            </Button>
          </div>
        </div>

        {kind === 'sponsor' && sponsors.length === 0 ? (
          <p role="status" className="text-sm text-surface-muted-fg" data-testid="statements-sponsor-gap">
            {SPONSOR_GAP_REASON}
          </p>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
            <Spinner />
            <span className="ml-2 text-sm text-surface-muted-fg">Reading the ledger…</span>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm font-medium text-red-600" data-testid="statements-error">
            {String(error)}
          </p>
        ) : null}

        {!loading && !error && statement ? <StatementView statement={statement} /> : null}
        {!loading && !error && !statement && subjectId === '' ? (
          <p className="text-sm text-surface-muted-fg">Choose a subject to see their statement.</p>
        ) : null}
      </Card>
    </div>
  );
};

/** The statement itself: the tie, the running balance, the aging, the clearance and the notes. */
const StatementView: React.FC<{ readonly statement: Statement }> = ({ statement }) => (
  <div className="space-y-6">
    <div className="flex flex-wrap items-center gap-3">
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          statement.ledger.agrees ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
        data-testid="statement-tie"
      >
        {statement.ledger.agrees ? 'Agrees with the ledger' : 'Does not agree with the ledger'}
      </span>
      <span className="text-sm text-surface-muted-fg">
        Opening <Amount value={statement.openingBalance} /> · Closing <Amount value={statement.closingBalance} />
      </span>
      {statement.clearance ? (
        <span
          className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-surface-foreground"
          data-testid="statement-clearance"
        >
          {CLEARANCE_LABEL[statement.clearance.state]} · outstanding <Amount value={statement.clearance.outstanding} />
        </span>
      ) : null}
    </div>

    <div className="overflow-x-auto" data-testid="statement-movements">
      <table className="min-w-full text-sm">
        <caption className="sr-only">The running account</caption>
        <thead>
          <tr className="border-b border-surface-border">
            <th scope="col" className="py-2 text-left font-medium text-surface-muted-fg">Date</th>
            <th scope="col" className="py-2 text-left font-medium text-surface-muted-fg">Movement</th>
            <th scope="col" className="py-2 text-left font-medium text-surface-muted-fg">Document</th>
            <th scope="col" className="py-2 text-left font-medium text-surface-muted-fg">Description</th>
            <th scope="col" className="py-2 text-right font-medium text-surface-muted-fg">Amount</th>
            <th scope="col" className="py-2 text-right font-medium text-surface-muted-fg">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-surface-border">
            <td className="py-1.5 text-left" />
            <td className="py-1.5 text-left text-surface-muted-fg" colSpan={3}>
              Opening balance
            </td>
            <td className="py-1.5 text-right" />
            <td className="py-1.5 text-right" data-testid="statement-opening">
              <Amount value={statement.openingBalance} />
            </td>
          </tr>
          {statement.movements.map((movement) => (
            <React.Fragment key={movement.id}>
              <tr className="border-b border-surface-border last:border-0">
                <td className="py-1.5 text-left">{movement.date}</td>
                <td className="py-1.5 text-left">{movement.kind.replace('_', ' ')}</td>
                <td className="py-1.5 text-left font-mono">{movement.source.number ?? movement.source.id}</td>
                <td className="py-1.5 text-left">{movement.description}</td>
                <td className="py-1.5 text-right">
                  <Amount value={movement.amount} />
                </td>
                <td className="py-1.5 text-right" data-testid={`statement-balance-${movement.id}`}>
                  <Amount value={movement.balanceAfter} />
                </td>
              </tr>
              {movement.detail.map((line) => (
                <tr key={`${movement.id}:${line.accountCode}:${line.description}`} className="text-surface-muted-fg">
                  <td className="py-1 text-left" />
                  <td className="py-1 pl-4 text-left" colSpan={2}>
                    {line.kind === 'discount' ? 'Less discount' : 'Fee'}
                  </td>
                  <td className="py-1 text-left">{line.description}</td>
                  <td className="py-1 text-right">
                    <Amount value={line.amount} />
                  </td>
                  <td className="py-1 text-right" />
                </tr>
              ))}
            </React.Fragment>
          ))}
          <tr className="border-t border-surface-border font-medium">
            <td className="py-2 text-left" />
            <td className="py-2 text-left" colSpan={3}>
              Closing balance
            </td>
            <td className="py-2 text-right" />
            <td className="py-2 text-right" data-testid="statement-closing">
              <Amount value={statement.closingBalance} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="overflow-x-auto" data-testid="statement-aging">
      <table className="min-w-full text-sm">
        <caption className="sr-only">Aging of the outstanding amounts as of {statement.aging.asOf}</caption>
        <thead>
          <tr className="border-b border-surface-border">
            <th scope="col" className="py-2 text-left font-medium text-surface-muted-fg">Aging (as of {statement.aging.asOf})</th>
            {statement.aging.buckets.map((bucket) => (
              <th key={bucket.name} scope="col" className="py-2 text-right font-medium text-surface-muted-fg">
                {bucket.label}
              </th>
            ))}
            <th scope="col" className="py-2 text-right font-medium text-surface-muted-fg">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1.5 text-left text-surface-muted-fg">Outstanding</td>
            {statement.aging.buckets.map((bucket) => (
              <td key={bucket.name} className="py-1.5 text-right" data-testid={`aging-${bucket.name}`}>
                <Amount value={bucket.amount} />
              </td>
            ))}
            <td className="py-1.5 text-right font-medium" data-testid="aging-total">
              <Amount value={statement.aging.total} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {statement.split ? (
      <div className="overflow-x-auto" data-testid="statement-split">
        <table className="min-w-full text-sm">
          <caption className="sr-only">The household split: what the family owes and what each sponsor owes</caption>
          <thead>
            <tr className="border-b border-surface-border">
              <th scope="col" className="py-2 text-left font-medium text-surface-muted-fg">Learner</th>
              <th scope="col" className="py-2 text-right font-medium text-surface-muted-fg">Family share</th>
              <th scope="col" className="py-2 text-left font-medium text-surface-muted-fg">Sponsor</th>
              <th scope="col" className="py-2 text-right font-medium text-surface-muted-fg">Sponsor share</th>
            </tr>
          </thead>
          <tbody>
            {statement.split.members.map((member) => (
              <tr key={member.learnerId} className="border-b border-surface-border last:border-0">
                <td className="py-1.5 text-left">{member.learnerName}</td>
                <td className="py-1.5 text-right">
                  <Amount value={member.familyShare} />
                </td>
                <td className="py-1.5 text-left">
                  {member.sponsorShares.map((sponsor) => sponsor.name).join(', ')}
                </td>
                <td className="py-1.5 text-right">
                  <Amount
                    value={{
                      amount_minor: member.sponsorShares.reduce((sum, sponsor) => sum + sponsor.amount.amount_minor, 0),
                      currency: statement.currency,
                    }}
                  />
                </td>
              </tr>
            ))}
            <tr className="border-t border-surface-border font-medium">
              <td className="py-2 text-left">Total</td>
              <td className="py-2 text-right" data-testid="split-family">
                <Amount value={statement.split.familyTotal} />
              </td>
              <td className="py-2 text-left" />
              <td className="py-2 text-right" data-testid="split-sponsor">
                <Amount value={statement.split.sponsorTotal} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    ) : null}

    <ul className="list-disc space-y-1 pl-5 text-sm text-surface-muted-fg">
      {statement.notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  </div>
);

const StatementsPage: React.FC<StatementsPageProps> = (props) => (
  <CanonicalRepositoryProvider>
    <div className="space-y-6">
      <StatementsPageContent {...props} />
    </div>
  </CanonicalRepositoryProvider>
);

export default StatementsPage;
