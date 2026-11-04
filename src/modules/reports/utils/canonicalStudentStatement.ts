// ABOUTME: Builds a student votehead statement from canonical finance rows, exactly as stored:
// ABOUTME: opening balance as of the period, then posted invoice lines and period credits in minor units.

import type { Money } from '@/domain/schema/common';

/** The invoice fields the statement reads. A canonical `invoice` row satisfies this shape. */
export interface StatementInvoice {
  readonly id: string;
  readonly number: string;
  readonly learner_id?: string | null;
  readonly academic_period_id?: string | null;
  readonly issue_date: string;
  readonly status: string;
  readonly total: Money;
}

/** The invoice-line fields the statement reads. */
export interface StatementInvoiceLine {
  readonly id: string;
  readonly invoice_id: string;
  readonly description: string;
  readonly amount: Money;
}

/** The payment fields a credit line names and labels. */
export interface StatementPayment {
  readonly id: string;
  readonly learner_id?: string | null;
  readonly channel: string;
  readonly received_at: string;
  readonly reference?: string | null;
  readonly external_reference?: string | null;
  readonly status: string;
}

/** The allocation fields that turn a payment into a credit on one invoice. */
export interface StatementAllocation {
  readonly id: string;
  readonly payment_id: string;
  readonly invoice_id: string;
  readonly amount: Money;
  readonly allocated_at: string;
}

/** The credit-note fields the statement reads. */
export interface StatementCreditNote {
  readonly id: string;
  readonly number: string;
  readonly learner_id?: string | null;
  readonly invoice_id?: string | null;
  readonly amount: Money;
  readonly reason: string;
  readonly issue_date: string;
  readonly status: string;
}

export interface BuildCanonicalStudentStatementInput {
  readonly learnerId: string;
  readonly periodId: string;
  readonly periodStartDate: string;
  readonly periodEndDate: string;
  readonly invoices: readonly StatementInvoice[];
  readonly invoiceLines: readonly StatementInvoiceLine[];
  readonly payments: readonly StatementPayment[];
  readonly allocations: readonly StatementAllocation[];
  readonly creditNotes: readonly StatementCreditNote[];
}

/** One line of the statement, in whole minor units. */
export interface CanonicalStatementRow {
  readonly date: string;
  readonly description: string;
  readonly reference: string;
  readonly debitMinor: number;
  readonly creditMinor: number;
  readonly balanceMinor: number;
}

/** The statement: the balance carried in, the period's lines, and the balance carried out. */
export interface CanonicalStudentStatement {
  readonly openingBalanceMinor: number;
  readonly rows: readonly CanonicalStatementRow[];
  readonly totals: {
    readonly debitMinor: number;
    readonly creditMinor: number;
  };
  readonly closingBalanceMinor: number;
}

interface StatementEntry {
  readonly id: string;
  readonly date: string;
  readonly description: string;
  readonly reference: string;
  readonly debitMinor: number;
  readonly creditMinor: number;
}

const EXCLUDED_INVOICE_STATUSES = new Set(['draft', 'void']);

function isPostedInvoice(invoice: StatementInvoice): boolean {
  return !EXCLUDED_INVOICE_STATUSES.has(invoice.status);
}

function minorOf(amount: Money): number {
  if (!Number.isSafeInteger(amount.amount_minor)) {
    throw new Error('statement amounts must be whole minor units');
  }
  return amount.amount_minor;
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** True when an invoice is billed in the selected period, by its period or its issue date. */
function isBilledInPeriod(
  invoice: StatementInvoice,
  periodId: string,
  periodStartDate: string,
  periodEndDate: string
): boolean {
  if (invoice.academic_period_id) return invoice.academic_period_id === periodId;
  return invoice.issue_date >= periodStartDate && invoice.issue_date <= periodEndDate;
}

/** True when an invoice belongs to an earlier period and was issued before this one opened. */
function isBilledBeforePeriod(invoice: StatementInvoice, periodId: string, periodStartDate: string): boolean {
  return invoice.academic_period_id !== periodId && invoice.issue_date < periodStartDate;
}

function channelLabel(channel: string | undefined): string {
  const text = (channel ?? '').replaceAll('_', ' ').trim();
  return text || 'payment';
}

/**
 * Builds the statement for one learner and one period.
 *
 * The opening balance is the net billed before the period: earlier posted invoice lines, less the
 * allocations made before the period to those invoices, less posted credit notes issued before it.
 * The period rows are the posted invoice lines billed in the selected period, the allocations made
 * in the period against those or earlier invoices, and the posted credit notes issued in it. A
 * payment without an allocation is cash received, not a credit to an invoice, so it has no row.
 */
export function buildCanonicalStudentStatement(
  input: BuildCanonicalStudentStatementInput
): CanonicalStudentStatement {
  const {
    learnerId,
    periodId,
    periodStartDate,
    periodEndDate,
    invoices,
    invoiceLines,
    payments,
    allocations,
    creditNotes,
  } = input;

  const learnerInvoices = invoices.filter((invoice) => invoice.learner_id === learnerId);
  const invoiceById = new Map(learnerInvoices.map((invoice) => [invoice.id, invoice]));
  const learnerInvoiceIds = new Set(learnerInvoices.map((invoice) => invoice.id));

  const linesByInvoice = new Map<string, StatementInvoiceLine[]>();
  for (const line of invoiceLines) {
    const list = linesByInvoice.get(line.invoice_id) ?? [];
    list.push(line);
    linesByInvoice.set(line.invoice_id, list);
  }

  const openingInvoices = learnerInvoices.filter(
    (invoice) => isPostedInvoice(invoice) && isBilledBeforePeriod(invoice, periodId, periodStartDate)
  );
  const openingInvoiceIds = new Set(openingInvoices.map((invoice) => invoice.id));
  const periodInvoices = learnerInvoices.filter(
    (invoice) =>
      isPostedInvoice(invoice) && isBilledInPeriod(invoice, periodId, periodStartDate, periodEndDate)
  );

  let openingBalanceMinor = 0;
  for (const invoice of openingInvoices) {
    openingBalanceMinor += minorOf(invoice.total);
  }

  for (const allocation of allocations) {
    if (!openingInvoiceIds.has(allocation.invoice_id)) continue;
    if (dateOnly(allocation.allocated_at) >= periodStartDate) continue;
    openingBalanceMinor -= minorOf(allocation.amount);
  }

  const creditNoteBelongsToLearner = (creditNote: StatementCreditNote): boolean => {
    if (creditNote.learner_id) return creditNote.learner_id === learnerId;
    return creditNote.invoice_id ? learnerInvoiceIds.has(creditNote.invoice_id) : false;
  };

  for (const creditNote of creditNotes) {
    if (creditNote.status !== 'posted') continue;
    if (!creditNoteBelongsToLearner(creditNote)) continue;
    if (creditNote.issue_date >= periodStartDate) continue;
    openingBalanceMinor -= minorOf(creditNote.amount);
  }

  const entries: StatementEntry[] = [];

  for (const invoice of periodInvoices) {
    for (const line of linesByInvoice.get(invoice.id) ?? []) {
      entries.push({
        id: line.id,
        date: invoice.issue_date,
        description: line.description,
        reference: invoice.number,
        debitMinor: minorOf(line.amount),
        creditMinor: 0,
      });
    }
  }

  const paymentById = new Map(payments.map((payment) => [payment.id, payment]));
  for (const allocation of allocations) {
    const invoice = invoiceById.get(allocation.invoice_id);
    if (!invoice || !isPostedInvoice(invoice)) continue;
    if (!openingInvoiceIds.has(invoice.id) && !isBilledInPeriod(invoice, periodId, periodStartDate, periodEndDate)) {
      continue;
    }
    const date = dateOnly(allocation.allocated_at);
    if (date < periodStartDate || date > periodEndDate) continue;
    const payment = paymentById.get(allocation.payment_id);
    entries.push({
      id: allocation.id,
      date,
      description: `Payment received (${channelLabel(payment?.channel)})`,
      reference: payment?.reference ?? payment?.external_reference ?? '',
      debitMinor: 0,
      creditMinor: minorOf(allocation.amount),
    });
  }

  for (const creditNote of creditNotes) {
    if (creditNote.status !== 'posted') continue;
    if (!creditNoteBelongsToLearner(creditNote)) continue;
    if (creditNote.issue_date < periodStartDate || creditNote.issue_date > periodEndDate) continue;
    entries.push({
      id: creditNote.id,
      date: creditNote.issue_date,
      description: creditNote.reason || 'Credit note',
      reference: creditNote.number,
      debitMinor: 0,
      creditMinor: minorOf(creditNote.amount),
    });
  }

  // A statement is read down the page: the same day's entries are ordered by their reference, and
  // the description and id break the remaining ties so two runs always agree.
  entries.sort(
    (left, right) =>
      compareText(left.date, right.date) ||
      compareText(left.reference, right.reference) ||
      compareText(left.description, right.description) ||
      compareText(left.id, right.id)
  );

  let runningBalance = openingBalanceMinor;
  let totalDebitMinor = 0;
  let totalCreditMinor = 0;
  const rows: CanonicalStatementRow[] = entries.map((entry) => {
    totalDebitMinor += entry.debitMinor;
    totalCreditMinor += entry.creditMinor;
    runningBalance += entry.debitMinor - entry.creditMinor;
    return {
      date: entry.date,
      description: entry.description,
      reference: entry.reference,
      debitMinor: entry.debitMinor,
      creditMinor: entry.creditMinor,
      balanceMinor: runningBalance,
    };
  });

  return {
    openingBalanceMinor,
    rows,
    totals: { debitMinor: totalDebitMinor, creditMinor: totalCreditMinor },
    closingBalanceMinor: runningBalance,
  };
}
