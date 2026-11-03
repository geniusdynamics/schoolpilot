// ABOUTME: Bills a transport route for a term: one posted invoice per assigned learner who is
// ABOUTME: enrolled and not yet charged, with one transport line and the ledger entry it posts.

import type { SqliteTransaction } from '@/data/adapters/sqlite';
import type { QueryRepository } from '@/data/query';
import { readEveryPage } from '@/data/query/readEveryPage';
import type {
  CreateInput,
  ListQuery,
  Page,
  RepositoryRow,
  WriteOptions,
} from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { add, fromMinor, isCurrencyCode, zero, type Money } from '@/domain/money';
import type { EntityName } from '@/domain/schema';
import type { ScopeValues } from '@/domain/sequences';
import {
  LedgerService,
  createLedgerAccountMapping,
  createTransactionLedgerStore,
  type InvoicePostingInput,
} from '@/domain/finance/ledger';

import { TransportError } from './errors';

const PAGE_LIMIT = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The writable canonical surface a transport run needs, plus the transaction it posts in. */
export interface TransportRepository extends QueryRepository {
  get<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: { readonly includeDeleted?: boolean }
  ): Promise<RepositoryRow<E> | null>;
  create<E extends EntityName>(
    entity: E,
    input: CreateInput<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>>;
  list<E extends EntityName>(entity: E, query?: ListQuery): Promise<Page<RepositoryRow<E>>>;
  transaction<T>(work: (tx: SqliteTransaction) => Promise<T>): Promise<T>;
}

/**
 * Where an invoice number comes from.
 *
 * This is the sequences module and nothing else: `SequenceService` satisfies it structurally. A
 * number is issued before the run's transaction, so a rollback leaves a gap rather than handing
 * the same number to two invoices; that is the module's documented `burn` policy.
 */
export interface TransportNumberSource {
  issue(name: string, scope: ScopeValues): Promise<{ readonly number: string }>;
}

/** What a caller states to bill a route for a term. */
export interface BillRouteInput {
  readonly institutionId: string;
  readonly routeId: string;
  readonly academicPeriodId: string;
  /** The day the charge takes effect; defaults to today. */
  readonly issueDate?: string;
  /** The user raising the charge. */
  readonly actor?: string;
}

/** One learner the run charged. */
export interface TransportCharge {
  readonly learnerId: string;
  readonly learnerName: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly amount: Money;
}

/** Why a learner was not charged. */
export type TransportSkipReason = 'no_active_enrolment' | 'already_charged';

/** One learner the run did not charge, and why. */
export interface TransportSkip {
  readonly learnerId: string;
  readonly learnerName: string;
  readonly reason: TransportSkipReason;
  /** A sentence the screen can show: the period they are not enrolled in, or the invoice. */
  readonly message: string;
}

/** What a run reported. */
export interface TransportBillingResult {
  readonly routeId: string;
  readonly routeName: string;
  readonly academicPeriodId: string;
  readonly periodName: string;
  readonly chargedCount: number;
  readonly skippedCount: number;
  readonly totalCharged: Money;
  readonly charged: readonly TransportCharge[];
  readonly skipped: readonly TransportSkip[];
}

export interface TransportBillingServiceOptions {
  readonly repository: TransportRepository;
  readonly numbers: TransportNumberSource;
  readonly actor?: string;
  readonly now?: () => Date;
}

interface PlannedCharge {
  readonly learnerId: string;
  readonly learnerName: string;
  readonly invoiceNumber: string;
}

interface ExistingCharge {
  readonly invoiceId: string;
  readonly number: string;
}

function trimmed(value: string | undefined): string {
  return (value ?? '').trim();
}

function uuidOrUndefined(value: string | undefined): string | undefined {
  return value !== undefined && UUID.test(value) ? value : undefined;
}

/** A learner's name as the result names them. */
function learnerName(row: RepositoryRow<'learner'>): string {
  return `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim();
}

/** True when an enrolment is current for the period's academic year and covers its dates. */
function coversPeriod(
  enrolment: RepositoryRow<'enrolment'>,
  period: RepositoryRow<'academic_period'>
): boolean {
  if (enrolment.status !== 'active' && enrolment.status !== 'repeating') return false;
  if (enrolment.start_date > period.end_date) return false;
  return !enrolment.end_date || enrolment.end_date >= period.start_date;
}

/**
 * The chart a transport invoice posts against.
 *
 * The posting engine resolves a line's revenue account through the mapping's fee-item seam. The
 * route's own id is the key that seam is given, and the route's revenue account code is what it
 * resolves to; no fee item is invented and no ledger code is changed. The account is declared
 * revenue so a mis-set code is still an account of the posting chart.
 */
function chartForRoute(route: RepositoryRow<'transport_route'>) {
  const code = trimmed(route.revenue_account_code);
  return createLedgerAccountMapping({
    accounts: [{ code, name: code, kind: 'revenue' }],
    feeItemRevenueAccounts: { [route.id]: code },
  });
}

/**
 * Bills a route's assigned learners for one academic period.
 *
 * One invoice is raised per learner who is enrolled in the period and has no transport charge for
 * it, and the invoice is posted with `LedgerService.postInvoice`: the receivable is debited, the
 * route's revenue account credited. All the writes of one press commit together. A second press
 * finds the invoices the first one posted and charges nobody, so the (learner, route, period)
 * charge exists once. A closed period is refused before anything is written, and a learner with no
 * active enrolment is skipped and named rather than charged.
 *
 * A transport charge is corrected by a credit note or a reversal of its entry, never by editing or
 * deleting the posted invoice.
 */
export class TransportBillingService {
  private readonly repository: TransportRepository;
  private readonly numbers: TransportNumberSource;
  private readonly actor: string | undefined;
  private readonly clock: () => Date;

  constructor(options: TransportBillingServiceOptions) {
    this.repository = options.repository;
    this.numbers = options.numbers;
    this.actor = options.actor;
    this.clock = options.now ?? (() => new Date());
  }

  /** Raises the term's charges for a route and reports who was charged and who was skipped. */
  async billRoute(input: BillRouteInput): Promise<TransportBillingResult> {
    const institutionId = trimmed(input.institutionId);
    const routeId = trimmed(input.routeId);
    const academicPeriodId = trimmed(input.academicPeriodId);
    if (institutionId === '') {
      throw new TransportError('institution_required', 'Choose the institution to bill.');
    }
    if (routeId === '') {
      throw new TransportError('route_not_found', 'Choose the transport route to bill.');
    }
    if (academicPeriodId === '') {
      throw new TransportError('period_not_found', 'Choose the academic period to bill.');
    }

    const route = await this.repository.get('transport_route', asId<'transport_route'>(routeId));
    if (!route) {
      throw new TransportError('route_not_found', `Transport route ${routeId} does not exist.`, {
        id: routeId,
      });
    }
    if (route.institution_id !== institutionId) {
      throw new TransportError(
        'route_institution_mismatch',
        `Transport route "${route.name}" belongs to another institution.`,
        { id: route.id }
      );
    }
    if (!route.active) {
      throw new TransportError(
        'route_inactive',
        `Transport route "${route.name}" is not active, so it cannot be billed.`,
        { id: route.id }
      );
    }
    if (
      !Number.isSafeInteger(route.cost.amount_minor) ||
      route.cost.amount_minor <= 0 ||
      !isCurrencyCode(route.cost.currency)
    ) {
      throw new TransportError(
        'amount_invalid',
        `Transport route "${route.name}" needs a positive cost in a known currency before it can be billed.`,
        { id: route.id }
      );
    }
    if (trimmed(route.revenue_account_code) === '') {
      throw new TransportError(
        'revenue_account_missing',
        `Transport route "${route.name}" names no revenue account to credit.`,
        { id: route.id }
      );
    }

    const period = await this.repository.get(
      'academic_period',
      asId<'academic_period'>(academicPeriodId)
    );
    if (!period) {
      throw new TransportError(
        'period_not_found',
        `Academic period ${academicPeriodId} does not exist.`,
        { id: academicPeriodId }
      );
    }
    if (period.institution_id !== institutionId) {
      throw new TransportError(
        'period_institution_mismatch',
        `Academic period "${period.name}" belongs to another institution.`,
        { id: period.id }
      );
    }
    if (period.status === 'closed') {
      throw new TransportError(
        'period_closed',
        `Academic period "${period.name}" is closed, so no transport charge can be raised in it.`,
        { id: period.id }
      );
    }

    const issueDate = this.issueDateFor(input.issueDate);
    const amount = fromMinor(route.cost.amount_minor, route.cost.currency);
    const actor = input.actor ?? this.actor;
    const currency = amount.currency;

    const assignments = await readEveryPage(this.repository, 'transport_assignment', {
      where: {
        institution_id: institutionId,
        route_id: route.id,
        academic_period_id: period.id,
        status: 'active',
      },
    });

    const skipped: TransportSkip[] = [];
    const candidates: {
      readonly learnerId: string;
      readonly learnerName: string;
    }[] = [];

    const seen = new Set<string>();
    for (const assignment of assignments.items) {
      if (seen.has(assignment.learner_id)) continue;
      seen.add(assignment.learner_id);

      const learner = await this.repository.get(
        'learner',
        asId<'learner'>(assignment.learner_id)
      );
      if (!learner) {
        skipped.push({
          learnerId: assignment.learner_id,
          learnerName: assignment.learner_id,
          reason: 'no_active_enrolment',
          message: `The learner ${assignment.learner_id} is no longer on the school's records.`,
        });
        continue;
      }
      const name = learnerName(learner);

      const enrolments = await this.repository.list('enrolment', {
        where: {
          institution_id: institutionId,
          learner_id: learner.id,
          academic_year_id: period.academic_year_id,
        },
        limit: PAGE_LIMIT,
      });
      if (!enrolments.items.some((enrolment) => coversPeriod(enrolment, period))) {
        skipped.push({
          learnerId: learner.id,
          learnerName: name,
          reason: 'no_active_enrolment',
          message: `${name} has no active enrolment in ${period.name}.`,
        });
        continue;
      }

      const existing = await this.findCharge(institutionId, learner.id, period.id);
      if (existing) {
        skipped.push({
          learnerId: learner.id,
          learnerName: name,
          reason: 'already_charged',
          message: `${name} is already charged for ${period.name} on ${existing.number}.`,
        });
        continue;
      }

      candidates.push({ learnerId: learner.id, learnerName: name });
    }

    if (candidates.length === 0) {
      return this.result(route, period, currency, [], skipped);
    }

    const planned: PlannedCharge[] = [];
    for (const candidate of candidates) {
      const issued = await this.numbers.issue('invoice', {
        institution: institutionId,
        year: Number(period.start_date.slice(0, 4)),
        term: period.sequence,
      });
      planned.push({ ...candidate, invoiceNumber: issued.number });
    }

    const description = `Transport · ${route.name} · ${period.name}`;
    const mapping = chartForRoute(route);
    const writeOptions: WriteOptions =
      uuidOrUndefined(actor) === undefined
        ? { reason: `transport charge for ${period.name}` }
        : { actor: uuidOrUndefined(actor), reason: `transport charge for ${period.name}` };

    const charged = await this.repository.transaction(async (tx) => {
      const ledger = new LedgerService({
        store: createTransactionLedgerStore(tx),
        mapping,
        bound: true,
        now: this.clock,
        ...(actor === undefined ? {} : { actor }),
      });
      const written: TransportCharge[] = [];

      for (const candidate of planned) {
        // The authoritative check is inside the transaction: a second press that raced this one
        // waits for it to commit and then finds the invoice instead of raising another.
        const existing = await this.findCharge(institutionId, candidate.learnerId, period.id);
        if (existing) {
          skipped.push({
            learnerId: candidate.learnerId,
            learnerName: candidate.learnerName,
            reason: 'already_charged',
            message: `${candidate.learnerName} is already charged for ${period.name} on ${existing.number}.`,
          });
          continue;
        }

        const invoice = await this.repository.create(
          'invoice',
          {
            institution_id: institutionId,
            number: candidate.invoiceNumber,
            learner_id: candidate.learnerId,
            academic_period_id: period.id,
            issue_date: issueDate,
            total: amount,
            status: 'posted',
          },
          writeOptions
        );
        await this.repository.create(
          'invoice_line',
          {
            institution_id: institutionId,
            invoice_id: invoice.id,
            description,
            amount,
            kind: 'transport',
          },
          writeOptions
        );

        await ledger.postInvoice(
          this.postingFor({
            invoiceId: invoice.id,
            invoiceNumber: candidate.invoiceNumber,
            institutionId,
            issueDate,
            amount,
            description,
            routeId: route.id,
            ...(actor === undefined ? {} : { actor }),
          })
        );

        written.push({
          learnerId: candidate.learnerId,
          learnerName: candidate.learnerName,
          invoiceId: invoice.id,
          invoiceNumber: candidate.invoiceNumber,
          amount,
        });
      }

      return written;
    });

    return this.result(route, period, currency, charged, skipped);
  }

  /** The charge already posted for a learner and period, or null. */
  private async findCharge(
    institutionId: string,
    learnerId: string,
    academicPeriodId: string
  ): Promise<ExistingCharge | null> {
    const invoices = await this.repository.list('invoice', {
      where: {
        institution_id: institutionId,
        learner_id: learnerId,
        academic_period_id: academicPeriodId,
      },
      limit: PAGE_LIMIT,
    });
    for (const invoice of invoices.items) {
      if (invoice.status === 'void') continue;
      const lines = await this.repository.list('invoice_line', {
        where: { invoice_id: invoice.id },
        limit: PAGE_LIMIT,
      });
      if (lines.items.some((line) => line.kind === 'transport')) {
        return { invoiceId: invoice.id, number: invoice.number };
      }
    }
    return null;
  }

  private postingFor(input: {
    readonly invoiceId: string;
    readonly invoiceNumber: string;
    readonly institutionId: string;
    readonly issueDate: string;
    readonly amount: Money;
    readonly description: string;
    readonly routeId: string;
    readonly actor?: string;
  }): InvoicePostingInput {
    return {
      invoice: {
        id: input.invoiceId,
        number: input.invoiceNumber,
        institutionId: input.institutionId,
        issueDate: input.issueDate,
        total: input.amount,
        lines: [
          {
            // The route id is the chart key: `chartForRoute` maps it to the route's revenue code.
            feeItemId: input.routeId,
            amount: input.amount,
            description: input.description,
          },
        ],
      },
      ...(input.actor === undefined ? {} : { postedBy: input.actor }),
    };
  }

  private result(
    route: RepositoryRow<'transport_route'>,
    period: RepositoryRow<'academic_period'>,
    currency: Money['currency'],
    charged: readonly TransportCharge[],
    skipped: readonly TransportSkip[]
  ): TransportBillingResult {
    let totalCharged = zero(currency);
    for (const charge of charged) totalCharged = add(totalCharged, charge.amount);
    return {
      routeId: route.id,
      routeName: route.name,
      academicPeriodId: period.id,
      periodName: period.name,
      chargedCount: charged.length,
      skippedCount: skipped.length,
      totalCharged,
      charged,
      skipped,
    };
  }

  private issueDateFor(value: string | undefined): string {
    const candidate = trimmed(value);
    if (candidate === '') return this.clock().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(new Date(candidate).getTime())) {
      throw new TransportError('date_invalid', 'Choose an ISO day for the charge.');
    }
    return candidate;
  }
}
