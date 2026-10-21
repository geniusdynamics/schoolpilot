// ABOUTME: The canonical finance data every finance page reads: documents in exact minor units,
// ABOUTME: resolved learner and period names, and the lookups the entity pickers bind to.

import { useMemo } from 'react';

import { formatMinorUnits } from '@/components/ui/forms/MoneyField';
import type { EntityFormLookup, EntityLookupRow } from '@/components/ui/forms/fieldTypes';
import { useEntityQuery, useLookup, type LookupResult } from '@/data/query';
import type { QueryRepository } from '@/data/query';
import type {
  CreateInput,
  RepositoryRow,
  UpdateInput,
  UpdateOptions,
  WriteOptions,
} from '@/data/repository';
import type { SqliteTransaction } from '@/data/adapters/sqlite';
import { asId, type Id } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';
import type { Money } from '@/domain/schema/common';

import { useCanonicalRepository } from './canonicalRepository';

/** The currency every finance document is written in until the currency table arrives. */
export const FINANCE_CURRENCY = 'KES';

/** The minor-unit precision of an ISO-4217 currency. */
export function currencyDigits(currency: string): number {
  switch (currency) {
    case 'JPY':
    case 'KRW':
    case 'VND':
    case 'CLP':
    case 'ISK':
    case 'UGX':
    case 'RWF':
      return 0;
    case 'BHD':
    case 'KWD':
    case 'OMR':
    case 'TND':
    case 'JOD':
      return 3;
    default:
      return 2;
  }
}

/** Builds a money value from whole minor units. Never takes a float. */
export function money(amountMinor: number, currency = FINANCE_CURRENCY): Money {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error('money amounts are whole minor units');
  }
  return { amount_minor: amountMinor, currency };
}

/** Zero in the given currency. */
export function zeroMoney(currency = FINANCE_CURRENCY): Money {
  return money(0, currency);
}

/** Adds money values exactly; they share one currency. */
export function sumMoney(values: readonly Money[], currency = FINANCE_CURRENCY): Money {
  let total = 0;
  for (const value of values) total += value.amount_minor;
  return money(total, currency);
}

/** Subtracts money exactly. */
export function subtractMoney(left: Money, right: Money): Money {
  return money(left.amount_minor - right.amount_minor, left.currency);
}

/** Formats exact minor units, never through a floating-point amount. */
export function formatMoneyMinor(amountMinor: number, currency = FINANCE_CURRENCY): string {
  const digits = currencyDigits(currency);
  return `${currency} ${formatMinorUnits(amountMinor, digits)}`;
}

/** Formats a money value, with an explicit placeholder for "no amount". */
export function formatMoney(value: Money | null | undefined, fallback = '-'): string {
  if (!value) return fallback;
  return formatMoneyMinor(value.amount_minor, value.currency);
}

/** The sum of the allocations of one invoice, in minor units. */
export function allocatedMinor(
  allocations: readonly RepositoryRow<'payment_allocation'>[],
  invoiceId: string
): number {
  let total = 0;
  for (const allocation of allocations) {
    if (allocation.invoice_id === invoiceId) total += allocation.amount.amount_minor;
  }
  return total;
}

/**
 * The writable canonical repository.
 *
 * The provider hands the pages the query surface; the pages that write need the
 * repository's create/update/remove too. The guard checks the methods at runtime so a
 * read-only stand-in fails loudly instead of silently dropping a write.
 */
export interface FinanceRepository extends QueryRepository {
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
  update<E extends EntityName>(
    entity: E,
    id: Id<E>,
    patch: UpdateInput<E>,
    options: UpdateOptions
  ): Promise<RepositoryRow<E>>;
  remove<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>>;
  transaction?<T>(work: (tx: SqliteTransaction) => Promise<T>): Promise<T>;
}

function isFinanceRepository(repository: QueryRepository): repository is FinanceRepository {
  const candidate: Partial<FinanceRepository> = repository;
  return (
    typeof candidate.create === 'function' &&
    typeof candidate.update === 'function' &&
    typeof candidate.remove === 'function'
  );
}

/** The canonical repository, narrowed to the writable surface the finance pages need. */
export function useFinanceRepository(): FinanceRepository {
  const repository = useCanonicalRepository();
  if (!isFinanceRepository(repository)) {
    throw new Error('The finance pages need a writable canonical repository.');
  }
  return repository;
}

/**
 * Adapts a query lookup to the form lookup contract.
 *
 * The form only needs ids, labels and the archived marker; rebuilding the map keeps the
 * branded id of the lookup from leaking into the form's plain-string contract.
 */
export function toFormLookup<E extends EntityName>(lookup: LookupResult<E>): EntityFormLookup {
  const byId = new Map<string, EntityLookupRow>();
  for (const [id, row] of lookup.byId) byId.set(id, row);
  return {
    options: lookup.options,
    byId,
    label: (id, fallback) => lookup.label(asId<E>(id), fallback),
    resolve: (id) => {
      const row = lookup.byId.get(asId<E>(id));
      return row;
    },
    status: lookup.status,
    error: lookup.error,
    isFetching: lookup.isFetching,
    isArchived: (row) => {
      const resolved = lookup.byId.get(asId<E>(row.id));
      return resolved ? lookup.isArchived(resolved) : false;
    },
    getId: (row) => row.id,
  };
}

/** A fee schedule with its lines and the exact total of those lines. */
export interface FinanceScheduleRow {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly status: string;
  readonly academicYearId: string;
  readonly academicYearName: string;
  readonly periodIds: readonly string[];
  readonly periodNames: readonly string[];
  readonly levelIds: readonly string[];
  readonly levelNames: readonly string[];
  readonly lines: readonly RepositoryRow<'fee_schedule_line'>[];
  readonly total: Money;
  readonly row: RepositoryRow<'fee_schedule'>;
}

/** An invoice with its learner, period, paid amount and exact balance. */
export interface FinanceInvoiceRow {
  readonly id: string;
  readonly number: string;
  readonly learnerId: string | null;
  readonly learnerName: string;
  readonly periodId: string | null;
  readonly periodName: string;
  readonly issueDate: string;
  readonly dueDate: string | null;
  readonly total: Money;
  readonly paid: Money;
  readonly balance: Money;
  readonly status: string;
  readonly lineCount: number;
  readonly row: RepositoryRow<'invoice'>;
}

/** A payment with the learner it belongs to and the receipt it issued. */
export interface FinancePaymentRow {
  readonly id: string;
  readonly learnerId: string | null;
  readonly learnerName: string;
  readonly amount: Money;
  readonly channel: string;
  readonly receivedAt: string;
  readonly reference: string;
  readonly status: string;
  readonly receiptNumber: string;
  readonly row: RepositoryRow<'payment'>;
}

/** A payment allocation with the invoice and payment it names. */
export interface FinanceAllocationRow {
  readonly id: string;
  readonly paymentId: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly learnerName: string;
  readonly amount: Money;
  readonly allocatedAt: string;
  readonly row: RepositoryRow<'payment_allocation'>;
}

/** An invoice line with the invoice, learner and votehead it belongs to. */
export interface FinanceInvoiceLineRow {
  readonly id: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly learnerId: string | null;
  readonly learnerName: string;
  readonly periodId: string | null;
  readonly periodName: string;
  readonly invoiceStatus: string;
  readonly description: string;
  readonly kind: string;
  readonly amount: Money;
  readonly paid: Money;
  readonly balance: Money;
  readonly row: RepositoryRow<'invoice_line'>;
}

/** A learner with the admission number and current class the reports show. */
export interface FinanceLearnerRow {
  readonly id: string;
  readonly name: string;
  readonly admissionNumber: string;
  readonly status: string;
  readonly className: string;
  readonly levelId: string;
  readonly levelName: string;
  readonly row: RepositoryRow<'learner'>;
}

/** The canonical entities and resolved rows the finance pages read. */
export interface CanonicalFinance {
  readonly repository: QueryRepository;
  readonly status: 'idle' | 'loading' | 'refreshing' | 'success' | 'error';
  readonly error: unknown;
  readonly learners: readonly RepositoryRow<'learner'>[];
  readonly learnerRows: readonly FinanceLearnerRow[];
  readonly classGroups: readonly RepositoryRow<'class_group'>[];
  readonly levels: readonly RepositoryRow<'level'>[];
  readonly periods: readonly RepositoryRow<'academic_period'>[];
  readonly years: readonly RepositoryRow<'academic_year'>[];
  readonly feeItems: readonly RepositoryRow<'fee_item'>[];
  readonly feeSchedules: readonly RepositoryRow<'fee_schedule'>[];
  readonly feeScheduleLines: readonly RepositoryRow<'fee_schedule_line'>[];
  readonly invoices: readonly RepositoryRow<'invoice'>[];
  readonly invoiceLines: readonly RepositoryRow<'invoice_line'>[];
  readonly payments: readonly RepositoryRow<'payment'>[];
  readonly allocations: readonly RepositoryRow<'payment_allocation'>[];
  readonly receipts: readonly RepositoryRow<'receipt'>[];
  readonly creditNotes: readonly RepositoryRow<'credit_note'>[];
  readonly refunds: readonly RepositoryRow<'refund'>[];
  readonly discountRules: readonly RepositoryRow<'discount_rule'>[];
  readonly sponsorships: readonly RepositoryRow<'sponsorship'>[];
  readonly installmentPlans: readonly RepositoryRow<'installment_plan'>[];
  readonly scheduleRows: readonly FinanceScheduleRow[];
  readonly invoiceRows: readonly FinanceInvoiceRow[];
  readonly paymentRows: readonly FinancePaymentRow[];
  readonly allocationRows: readonly FinanceAllocationRow[];
  readonly invoiceLineRows: readonly FinanceInvoiceLineRow[];
  readonly lookups: {
    readonly learner: LookupResult<'learner'>;
    readonly period: LookupResult<'academic_period'>;
    readonly year: LookupResult<'academic_year'>;
    readonly level: LookupResult<'level'>;
    readonly classGroup: LookupResult<'class_group'>;
    readonly feeItem: LookupResult<'fee_item'>;
    readonly feeSchedule: LookupResult<'fee_schedule'>;
    readonly invoice: LookupResult<'invoice'>;
    readonly payment: LookupResult<'payment'>;
    readonly staff: LookupResult<'staff'>;
  };
  readonly learnerName: (id: string | null | undefined) => string;
  readonly periodName: (id: string | null | undefined) => string;
  readonly levelName: (id: string | null | undefined) => string;
  readonly classGroupName: (id: string | null | undefined) => string;
  readonly feeItemName: (id: string | null | undefined) => string;
  readonly scheduleName: (id: string | null | undefined) => string;
  readonly invoiceNumber: (id: string | null | undefined) => string;
  readonly paymentLabel: (id: string | null | undefined) => string;
}

function labelOfId<E extends EntityName>(
  lookup: LookupResult<E>,
  id: string | null | undefined
): string {
  if (!id) return '';
  return lookup.label(asId<E>(id), '');
}

/**
 * Reads the canonical finance entities and derives the rows the pages render.
 *
 * Amounts stay in minor units from the repository to the screen: nothing here divides
 * by 100, so a payment of 15 000.05 is the integer 1 500 005 from end to end.
 */
export function useCanonicalFinance(): CanonicalFinance {
  const repository = useCanonicalRepository();

  const learnersQuery = useEntityQuery(repository, 'learner');
  const enrolmentsQuery = useEntityQuery(repository, 'enrolment');
  const classGroupsQuery = useEntityQuery(repository, 'class_group');
  const levelsQuery = useEntityQuery(repository, 'level');
  const periodsQuery = useEntityQuery(repository, 'academic_period');
  const yearsQuery = useEntityQuery(repository, 'academic_year');
  const feeItemsQuery = useEntityQuery(repository, 'fee_item');
  const schedulesQuery = useEntityQuery(repository, 'fee_schedule');
  const scheduleLinesQuery = useEntityQuery(repository, 'fee_schedule_line');
  const invoicesQuery = useEntityQuery(repository, 'invoice');
  const invoiceLinesQuery = useEntityQuery(repository, 'invoice_line');
  const paymentsQuery = useEntityQuery(repository, 'payment');
  const allocationsQuery = useEntityQuery(repository, 'payment_allocation');
  const receiptsQuery = useEntityQuery(repository, 'receipt');
  const creditNotesQuery = useEntityQuery(repository, 'credit_note');
  const refundsQuery = useEntityQuery(repository, 'refund');
  const discountRulesQuery = useEntityQuery(repository, 'discount_rule');
  const sponsorshipsQuery = useEntityQuery(repository, 'sponsorship');
  const installmentPlansQuery = useEntityQuery(repository, 'installment_plan');

  const learnerLookup = useLookup(repository, 'learner', {});
  const periodLookup = useLookup(repository, 'academic_period', {});
  const yearLookup = useLookup(repository, 'academic_year', {});
  const levelLookup = useLookup(repository, 'level', {});
  const classGroupLookup = useLookup(repository, 'class_group', {});
  const feeItemLookup = useLookup(repository, 'fee_item', {});
  const scheduleLookup = useLookup(repository, 'fee_schedule', {});
  const invoiceLookup = useLookup(repository, 'invoice', {});
  const paymentLookup = useLookup(repository, 'payment', {});
  const staffLookup = useLookup(repository, 'staff', {});

  const learners = useMemo(() => learnersQuery.data?.items ?? [], [learnersQuery.data]);
  const enrolments = useMemo(() => enrolmentsQuery.data?.items ?? [], [enrolmentsQuery.data]);
  const classGroups = useMemo(() => classGroupsQuery.data?.items ?? [], [classGroupsQuery.data]);
  const levels = useMemo(() => levelsQuery.data?.items ?? [], [levelsQuery.data]);
  const periods = useMemo(() => periodsQuery.data?.items ?? [], [periodsQuery.data]);
  const years = useMemo(() => yearsQuery.data?.items ?? [], [yearsQuery.data]);
  const feeItems = useMemo(() => feeItemsQuery.data?.items ?? [], [feeItemsQuery.data]);
  const feeSchedules = useMemo(() => schedulesQuery.data?.items ?? [], [schedulesQuery.data]);
  const feeScheduleLines = useMemo(
    () => scheduleLinesQuery.data?.items ?? [],
    [scheduleLinesQuery.data]
  );
  const invoices = useMemo(() => invoicesQuery.data?.items ?? [], [invoicesQuery.data]);
  const invoiceLines = useMemo(() => invoiceLinesQuery.data?.items ?? [], [invoiceLinesQuery.data]);
  const payments = useMemo(() => paymentsQuery.data?.items ?? [], [paymentsQuery.data]);
  const allocations = useMemo(() => allocationsQuery.data?.items ?? [], [allocationsQuery.data]);
  const receipts = useMemo(() => receiptsQuery.data?.items ?? [], [receiptsQuery.data]);
  const creditNotes = useMemo(() => creditNotesQuery.data?.items ?? [], [creditNotesQuery.data]);
  const refunds = useMemo(() => refundsQuery.data?.items ?? [], [refundsQuery.data]);
  const discountRules = useMemo(
    () => discountRulesQuery.data?.items ?? [],
    [discountRulesQuery.data]
  );
  const sponsorships = useMemo(() => sponsorshipsQuery.data?.items ?? [], [sponsorshipsQuery.data]);
  const installmentPlans = useMemo(
    () => installmentPlansQuery.data?.items ?? [],
    [installmentPlansQuery.data]
  );

  const learnerRows = useMemo<readonly FinanceLearnerRow[]>(() => {
    const currentYear = years.find((year) => year.status === 'current') ?? years[0];
    const enrolmentByLearner = new Map<string, RepositoryRow<'enrolment'>>();
    for (const enrolment of enrolments) {
      if (currentYear && enrolment.academic_year_id !== currentYear.id) continue;
      if (enrolment.status !== 'active' && enrolment.status !== 'repeating') continue;
      enrolmentByLearner.set(enrolment.learner_id, enrolment);
    }
    const classGroupById = new Map<string, RepositoryRow<'class_group'>>();
    for (const group of classGroups) classGroupById.set(group.id, group);
    return learners.map((row) => {
      const enrolment = enrolmentByLearner.get(row.id);
      const group = enrolment ? classGroupById.get(enrolment.class_group_id) : undefined;
      return {
        id: row.id,
        name: `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim(),
        admissionNumber: row.admission_number,
        status: row.status,
        className: group?.name ?? '',
        levelId: group?.level_id ?? '',
        levelName: group ? labelOfId(levelLookup, group.level_id) : '',
        row,
      };
    });
  }, [learners, enrolments, years, classGroups, levelLookup]);

  const learnerName = (id: string | null | undefined) => labelOfId(learnerLookup, id);
  const periodName = (id: string | null | undefined) => labelOfId(periodLookup, id);
  const levelName = (id: string | null | undefined) => labelOfId(levelLookup, id);
  const classGroupName = (id: string | null | undefined) => labelOfId(classGroupLookup, id);
  const feeItemName = (id: string | null | undefined) => labelOfId(feeItemLookup, id);
  const scheduleName = (id: string | null | undefined) => labelOfId(scheduleLookup, id);
  const invoiceNumber = (id: string | null | undefined) => labelOfId(invoiceLookup, id);
  const paymentLabel = (id: string | null | undefined) => labelOfId(paymentLookup, id);

  const scheduleRows = useMemo<readonly FinanceScheduleRow[]>(() => {
    const linesBySchedule = new Map<string, RepositoryRow<'fee_schedule_line'>[]>();
    for (const line of feeScheduleLines) {
      const list = linesBySchedule.get(line.fee_schedule_id) ?? [];
      list.push(line);
      linesBySchedule.set(line.fee_schedule_id, list);
    }
    return feeSchedules
      .map((row) => {
        const lines = linesBySchedule.get(row.id) ?? [];
        return {
          id: row.id,
          name: row.name,
          version: row.version,
          status: row.status,
          academicYearId: row.academic_year_id,
          academicYearName: labelOfId(yearLookup, row.academic_year_id),
          periodIds: row.academic_period_ids,
          periodNames: row.academic_period_ids.map((id) => labelOfId(periodLookup, id)),
          levelIds: row.level_ids,
          levelNames: row.level_ids.map((id) => labelOfId(levelLookup, id)),
          lines,
          total: sumMoney(lines.map((line) => line.amount)),
          row,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [feeSchedules, feeScheduleLines, yearLookup, periodLookup, levelLookup]);

  const invoiceRows = useMemo<readonly FinanceInvoiceRow[]>(() => {
    const lineCounts = new Map<string, number>();
    for (const line of invoiceLines) {
      lineCounts.set(line.invoice_id, (lineCounts.get(line.invoice_id) ?? 0) + 1);
    }
    return invoices
      .map((row) => {
        const paidMinor = allocatedMinor(allocations, row.id);
        const paid = money(paidMinor, row.total.currency);
        return {
          id: row.id,
          number: row.number,
          learnerId: row.learner_id ?? null,
          learnerName: labelOfId(learnerLookup, row.learner_id),
          periodId: row.academic_period_id ?? null,
          periodName: labelOfId(periodLookup, row.academic_period_id),
          issueDate: row.issue_date,
          dueDate: row.due_date ?? null,
          total: row.total,
          paid,
          balance: subtractMoney(row.total, paid),
          status: row.status,
          lineCount: lineCounts.get(row.id) ?? 0,
          row,
        };
      })
      .sort((left, right) => right.issueDate.localeCompare(left.issueDate));
  }, [invoices, invoiceLines, allocations, learnerLookup, periodLookup]);

  const receiptByPayment = useMemo(() => {
    const map = new Map<string, string>();
    for (const receipt of receipts) map.set(receipt.payment_id, receipt.number);
    return map;
  }, [receipts]);

  const paymentRows = useMemo<readonly FinancePaymentRow[]>(
    () =>
      payments
        .map((row) => ({
          id: row.id,
          learnerId: row.learner_id ?? null,
          learnerName: labelOfId(learnerLookup, row.learner_id),
          amount: row.amount,
          channel: row.channel,
          receivedAt: row.received_at,
          reference: row.reference ?? row.external_reference ?? '',
          status: row.status,
          receiptNumber: receiptByPayment.get(row.id) ?? '',
          row,
        }))
        .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt)),
    [payments, learnerLookup, receiptByPayment]
  );

  const invoiceById = useMemo(() => {
    const map = new Map<string, RepositoryRow<'invoice'>>();
    for (const invoice of invoices) map.set(invoice.id, invoice);
    return map;
  }, [invoices]);

  const allocationRows = useMemo<readonly FinanceAllocationRow[]>(
    () =>
      allocations
        .map((row) => {
          const invoice = invoiceById.get(row.invoice_id);
          return {
            id: row.id,
            paymentId: row.payment_id,
            invoiceId: row.invoice_id,
            invoiceNumber: invoice?.number ?? '',
            learnerName: labelOfId(learnerLookup, invoice?.learner_id),
            amount: row.amount,
            allocatedAt: row.allocated_at,
            row,
          };
        })
        .sort((left, right) => right.allocatedAt.localeCompare(left.allocatedAt)),
    [allocations, invoiceById, learnerLookup]
  );

  const invoiceLineRows = useMemo<readonly FinanceInvoiceLineRow[]>(() => {
    const paidByInvoice = new Map<string, number>();
    for (const invoice of invoices) {
      paidByInvoice.set(invoice.id, allocatedMinor(allocations, invoice.id));
    }
    return invoiceLines
      .map((row) => {
        const invoice = invoiceById.get(row.invoice_id);
        const invoiceTotalMinor = invoice?.total.amount_minor ?? 0;
        const paidMinor = paidByInvoice.get(row.invoice_id) ?? 0;
        // The paid share of one line is the invoice's paid share of that line, in minor
        // units; the last line absorbs the rounding remainder so the shares stay exact.
        const share =
          invoiceTotalMinor > 0
            ? Math.round((paidMinor * row.amount.amount_minor) / invoiceTotalMinor)
            : 0;
        return {
          id: row.id,
          invoiceId: row.invoice_id,
          invoiceNumber: invoice?.number ?? '',
          learnerId: invoice?.learner_id ?? null,
          learnerName: labelOfId(learnerLookup, invoice?.learner_id),
          periodId: invoice?.academic_period_id ?? null,
          periodName: labelOfId(periodLookup, invoice?.academic_period_id),
          invoiceStatus: invoice?.status ?? '',
          description: row.description,
          kind: row.kind,
          amount: row.amount,
          paid: money(share, row.amount.currency),
          balance: subtractMoney(row.amount, money(share, row.amount.currency)),
          row,
        };
      })
      .sort((left, right) => left.invoiceNumber.localeCompare(right.invoiceNumber));
  }, [invoiceLines, invoices, allocations, invoiceById, learnerLookup, periodLookup]);

  const statuses = [
    learnersQuery.status,
    enrolmentsQuery.status,
    classGroupsQuery.status,
    schedulesQuery.status,
    invoiceLinesQuery.status,
    invoicesQuery.status,
    paymentsQuery.status,
    allocationsQuery.status,
  ];
  const status: CanonicalFinance['status'] = statuses.includes('error')
    ? 'error'
    : statuses.includes('loading')
      ? 'loading'
      : 'success';

  const error =
    learnersQuery.error ??
    classGroupsQuery.error ??
    feeItemsQuery.error ??
    schedulesQuery.error ??
    invoicesQuery.error ??
    paymentsQuery.error ??
    null;

  return {
    repository,
    status,
    error,
    learners,
    learnerRows,
    classGroups,
    levels,
    periods,
    years,
    feeItems,
    feeSchedules,
    feeScheduleLines,
    invoices,
    invoiceLines,
    payments,
    allocations,
    receipts,
    creditNotes,
    refunds,
    discountRules,
    sponsorships,
    installmentPlans,
    scheduleRows,
    invoiceRows,
    paymentRows,
    allocationRows,
    invoiceLineRows,
    lookups: {
      learner: learnerLookup,
      period: periodLookup,
      year: yearLookup,
      level: levelLookup,
      classGroup: classGroupLookup,
      feeItem: feeItemLookup,
      feeSchedule: scheduleLookup,
      invoice: invoiceLookup,
      payment: paymentLookup,
      staff: staffLookup,
    },
    learnerName,
    periodName,
    levelName,
    classGroupName,
    feeItemName,
    scheduleName,
    invoiceNumber,
    paymentLabel,
  };
}
