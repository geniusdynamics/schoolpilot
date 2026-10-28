// ABOUTME: The finance documents the UI writes: billing runs, payments with receipts, allocations,
// ABOUTME: charge invoices and credit notes. Every amount is whole minor units and every write
// ABOUTME: goes through the canonical repository, so the posting freeze is the repository's own rule.

import { asId, type Id } from '@/domain/ids';
import type {
  CreateInput,
  RepositoryRow,
  UpdateInput,
} from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import {
  FINANCE_CURRENCY,
  money,
  sumMoney,
  type FinanceRepository,
} from '../data/canonicalFinance';

/** A row of the invoice-generation preview: one learner and the invoice the run gives them. */
export interface BillingRunLine {
  readonly learnerId: string;
  readonly learnerName: string;
  readonly invoiceNumber: string;
  readonly amount: import('@/domain/schema/common').Money;
  readonly isNew: boolean;
}

/** What a billing run did, or would do when it was a dry run. */
export interface BillingRunResult {
  readonly dryRun: boolean;
  readonly invoicesCreated: number;
  readonly skippedLearnerIds: readonly string[];
  readonly unmatchedLearnerIds: readonly string[];
  readonly amount: import('@/domain/schema/common').Money;
  readonly lines: readonly BillingRunLine[];
}

export interface GenerateInvoicesInput {
  readonly academicPeriodId: string;
  readonly scheduleIds?: readonly string[];
  readonly levelIds?: readonly string[];
  readonly dryRun: boolean;
  /** The issue date, so a test can pin it. Defaults to today. */
  readonly issueDate?: string;
}

const ACTIVE_ENROLMENT_STATUSES = new Set(['active', 'repeating']);
const BILLABLE_SCHEDULE_STATUSES = new Set(['approved', 'published']);

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** The next document number of a prefix, counting the numeric suffix of the known numbers. */
export function nextDocumentNumber(prefix: string, existing: readonly string[]): string {
  let highest = 0;
  for (const number of existing) {
    const match = /(\d+)\s*$/.exec(number);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isSafeInteger(value) && value > highest) highest = value;
  }
  return `${prefix}-${String(highest + 1).padStart(6, '0')}`;
}

function feeItemLabel(row: RepositoryRow<'fee_item'>): string {
  return `${row.code} ${row.name}`;
}

async function listAll<E extends EntityName>(
  repository: FinanceRepository,
  entity: E
): Promise<readonly RepositoryRow<E>[]> {
  return (await repository.list(entity)).items;
}

/**
 * Bills every published fee schedule of an academic period to the enrolled learners it
 * applies to. One posted invoice per learner per period; a learner who is already billed
 * is reported, never edited.
 */
export async function generateInvoices(
  repository: FinanceRepository,
  input: GenerateInvoicesInput
): Promise<BillingRunResult> {
  const period = await repository.get('academic_period', asId<'academic_period'>(input.academicPeriodId));
  if (!period) {
    throw new Error('The selected academic period no longer exists.');
  }

  const schedules = (await repository.list('fee_schedule', {
    where: { academic_year_id: period.academic_year_id },
  })).items.filter(
    (schedule) =>
      BILLABLE_SCHEDULE_STATUSES.has(schedule.status) &&
      (!input.scheduleIds || input.scheduleIds.includes(schedule.id)) &&
      (schedule.academic_period_ids.length === 0 ||
        schedule.academic_period_ids.includes(period.id))
  );

  const allLines = await listAll(repository, 'fee_schedule_line');
  const linesBySchedule = new Map<string, RepositoryRow<'fee_schedule_line'>[]>();
  for (const line of allLines) {
    const list = linesBySchedule.get(line.fee_schedule_id) ?? [];
    list.push(line);
    linesBySchedule.set(line.fee_schedule_id, list);
  }

  const feeItems = new Map<string, RepositoryRow<'fee_item'>>();
  for (const item of await listAll(repository, 'fee_item')) feeItems.set(item.id, item);

  const learners = (await repository.list('learner', { where: { status: 'enrolled' } })).items;
  const enrolments = (await repository.list('enrolment', {
    where: { academic_year_id: period.academic_year_id },
  })).items;
  const enrolmentByLearner = new Map<string, RepositoryRow<'enrolment'>>();
  for (const enrolment of enrolments) {
    if (!ACTIVE_ENROLMENT_STATUSES.has(enrolment.status)) continue;
    enrolmentByLearner.set(enrolment.learner_id, enrolment);
  }

  const existingInvoices = (await repository.list('invoice', {
    where: { academic_period_id: period.id },
  })).items;
  const billedLearnerIds = new Set(
    existingInvoices.filter((invoice) => invoice.status !== 'void').map((invoice) => invoice.learner_id)
  );
  const appliesTo = (
    schedule: RepositoryRow<'fee_schedule'>,
    learner: RepositoryRow<'learner'>
  ): boolean => {
    const enrolment = enrolmentByLearner.get(learner.id);
    if (!enrolment) return false;
    if (input.levelIds && input.levelIds.length > 0 && !input.levelIds.includes(enrolment.level_id)) {
      return false;
    }
    if (schedule.level_ids.length > 0 && !schedule.level_ids.includes(enrolment.level_id)) {
      return false;
    }
    if (
      schedule.programme_ids.length > 0 &&
      !schedule.programme_ids.includes(enrolment.programme_id)
    ) {
      return false;
    }
    if (
      schedule.residence_statuses.length > 0 &&
      !schedule.residence_statuses.includes(learner.residence_status)
    ) {
      return false;
    }
    if (
      schedule.new_learners_only &&
      learner.admission_date !== undefined &&
      learner.admission_date < period.start_date
    ) {
      return false;
    }
    return true;
  };

  const issueDate = input.issueDate ?? todayIsoDate();
  const lines: BillingRunLine[] = [];
  const skippedLearnerIds: string[] = [];
  const unmatchedLearnerIds: string[] = [];
  let amount = money(0, FINANCE_CURRENCY);
  let created = 0;
  let numberCursor = existingInvoices.map((invoice) => invoice.number);
  const pending: {
    learner: RepositoryRow<'learner'>;
    invoiceNumber: string;
    total: import('@/domain/schema/common').Money;
    lines: readonly RepositoryRow<'fee_schedule_line'>[];
  }[] = [];

  for (const learner of learners) {
    const applicable = schedules
      .filter((schedule) => (linesBySchedule.get(schedule.id) ?? []).length > 0)
      .filter((schedule) => appliesTo(schedule, learner));
    if (applicable.length === 0) {
      unmatchedLearnerIds.push(learner.id);
      continue;
    }
    if (billedLearnerIds.has(learner.id)) {
      skippedLearnerIds.push(learner.id);
      continue;
    }
    const scheduleLines = applicable.flatMap((schedule) => linesBySchedule.get(schedule.id) ?? []);
    const total = sumMoney(scheduleLines.map((line) => line.amount));
    if (total.amount_minor <= 0) {
      unmatchedLearnerIds.push(learner.id);
      continue;
    }
    const invoiceNumber = nextDocumentNumber('INV', numberCursor);
    numberCursor = [...numberCursor, invoiceNumber];
    pending.push({ learner, invoiceNumber, total, lines: scheduleLines });
    amount = money(amount.amount_minor + total.amount_minor, total.currency);
  }

  if (!input.dryRun) {
    const write = async () => {
      for (const entry of pending) {
        const institutionId = entry.learner.institution_id;
        const invoice = await repository.create('invoice', {
          institution_id: institutionId,
          number: entry.invoiceNumber,
          learner_id: entry.learner.id,
          academic_period_id: period.id,
          issue_date: issueDate,
          total: entry.total,
          status: 'posted',
        });
        created += 1;
        for (const line of entry.lines) {
          const item = feeItems.get(line.fee_item_id);
          await repository.create('invoice_line', {
            institution_id: institutionId,
            invoice_id: invoice.id,
            fee_item_id: line.fee_item_id,
            description: item ? feeItemLabel(item) : `Fee item ${line.fee_item_id}`,
            amount: line.amount,
            kind: 'fee',
          });
        }
        lines.push({
          learnerId: entry.learner.id,
          learnerName: `${entry.learner.preferred_name ?? entry.learner.given_name} ${entry.learner.family_name}`.trim(),
          invoiceNumber: entry.invoiceNumber,
          amount: entry.total,
          isNew: true,
        });
      }
    };
    if (repository.transaction) await repository.transaction(write);
    else await write();
  } else {
    for (const entry of pending) {
      lines.push({
        learnerId: entry.learner.id,
        learnerName: `${entry.learner.preferred_name ?? entry.learner.given_name} ${entry.learner.family_name}`.trim(),
        invoiceNumber: entry.invoiceNumber,
        amount: entry.total,
        isNew: true,
      });
    }
  }

  return {
    dryRun: input.dryRun,
    invoicesCreated: created,
    skippedLearnerIds,
    unmatchedLearnerIds,
    amount,
    lines,
  };
}

export interface RecordPaymentInput {
  readonly learnerId: string;
  readonly amount: import('@/domain/schema/common').Money;
  readonly channel: RepositoryRow<'payment'>['channel'];
  readonly receivedAt: string;
  readonly reference?: string;
  readonly invoiceId?: string;
  /** The receipt number when the cashier sequence has already issued one. */
  readonly receiptNumber?: string;
}

/** Records a posted payment and issues its receipt. */
export async function recordPayment(
  repository: FinanceRepository,
  input: RecordPaymentInput
): Promise<{ payment: RepositoryRow<'payment'>; receipt: RepositoryRow<'receipt'> }> {
  const learner = await repository.get('learner', asId<'learner'>(input.learnerId));
  if (!learner) throw new Error('The selected learner no longer exists.');
  if (input.amount.amount_minor <= 0) throw new Error('A payment must be greater than zero.');

  const receiptNumber =
    input.receiptNumber ??
    nextDocumentNumber(
      'RCT',
      (await listAll(repository, 'receipt')).map((receipt) => receipt.number)
    );

  const write = async () => {
    const payment = await repository.create('payment', {
      institution_id: learner.institution_id,
      learner_id: learner.id,
      amount: input.amount,
      channel: input.channel,
      received_at: input.receivedAt,
      status: 'posted',
      ...(input.reference ? { reference: input.reference } : {}),
    });
    const receipt = await repository.create('receipt', {
      institution_id: learner.institution_id,
      number: receiptNumber,
      payment_id: payment.id,
      issued_at: input.receivedAt,
      status: 'issued',
    });
    return { payment, receipt };
  };

  const result = repository.transaction ? await repository.transaction(write) : await write();
  if (input.invoiceId) {
    await allocatePayment(repository, {
      paymentId: result.payment.id,
      invoiceId: input.invoiceId,
      amount: input.amount,
    });
  }
  return result;
}

export interface AllocatePaymentInput {
  readonly paymentId: string;
  readonly invoiceId: string;
  readonly amount: import('@/domain/schema/common').Money;
}

/** Applies part of a posted payment to a posted invoice and moves the invoice's status. */
export async function allocatePayment(
  repository: FinanceRepository,
  input: AllocatePaymentInput
): Promise<{ allocation: RepositoryRow<'payment_allocation'>; invoice: RepositoryRow<'invoice'> }> {
  const payment = await repository.get('payment', asId<'payment'>(input.paymentId));
  if (!payment) throw new Error('The selected payment no longer exists.');
  if (payment.status !== 'posted' && payment.status !== 'cleared') {
    throw new Error(`A ${payment.status} payment cannot be allocated.`);
  }
  const invoice = await repository.get('invoice', asId<'invoice'>(input.invoiceId));
  if (!invoice) throw new Error('The selected invoice no longer exists.');
  if (invoice.status === 'draft' || invoice.status === 'void') {
    throw new Error(`A ${invoice.status} invoice cannot receive an allocation.`);
  }
  if (input.amount.amount_minor <= 0) throw new Error('An allocation must be greater than zero.');

  const allocations = (await repository.list('payment_allocation', {
    where: { payment_id: payment.id },
  })).items;
  const alreadyAllocated = allocations.reduce(
    (total, allocation) => total + allocation.amount.amount_minor,
    0
  );
  if (alreadyAllocated + input.amount.amount_minor > payment.amount.amount_minor) {
    throw new Error('The allocations of this payment exceed the amount that was paid.');
  }

  const write = async () => {
    const allocation = await repository.create('payment_allocation', {
      institution_id: payment.institution_id,
      payment_id: payment.id,
      invoice_id: invoice.id,
      amount: input.amount,
      allocated_at: new Date().toISOString(),
    });
    const invoiceAllocations = (await repository.list('payment_allocation', {
      where: { invoice_id: invoice.id },
    })).items;
    const paid = invoiceAllocations.reduce(
      (total, entry) => total + entry.amount.amount_minor,
      0
    );
    const status: RepositoryRow<'invoice'>['status'] =
      paid >= invoice.total.amount_minor ? 'paid' : paid > 0 ? 'partially_paid' : invoice.status;
    const updated =
      status === invoice.status
        ? invoice
        : await repository.update(
            'invoice',
            invoice.id,
            { status },
            { expectedVersion: invoice.rowVersion }
          );
    return { allocation, invoice: updated };
  };

  return repository.transaction ? repository.transaction(write) : write();
}

export interface ChargeInvoiceInput {
  readonly learnerId: string;
  readonly academicPeriodId?: string;
  readonly description: string;
  readonly amount: import('@/domain/schema/common').Money;
  readonly kind: 'fine' | 'opening_balance' | 'adjustment' | 'other';
  readonly issueDate: string;
  readonly dueDate?: string;
}

/** Posts a one-line charge (a fine, an opening balance) against a learner. */
export async function createChargeInvoice(
  repository: FinanceRepository,
  input: ChargeInvoiceInput
): Promise<{ invoice: RepositoryRow<'invoice'>; line: RepositoryRow<'invoice_line'> }> {
  const learner = await repository.get('learner', asId<'learner'>(input.learnerId));
  if (!learner) throw new Error('The selected learner no longer exists.');
  if (input.amount.amount_minor <= 0) throw new Error('A charge must be greater than zero.');

  const existing = (await repository.list('invoice')).items.map((invoice) => invoice.number);
  const number = nextDocumentNumber('INV', existing);

  const write = async () => {
    const invoice = await repository.create('invoice', {
      institution_id: learner.institution_id,
      number,
      learner_id: learner.id,
      issue_date: input.issueDate,
      total: input.amount,
      status: 'posted',
      ...(input.academicPeriodId ? { academic_period_id: input.academicPeriodId } : {}),
      ...(input.dueDate ? { due_date: input.dueDate } : {}),
    });
    const line = await repository.create('invoice_line', {
      institution_id: learner.institution_id,
      invoice_id: invoice.id,
      description: input.description,
      amount: input.amount,
      kind: input.kind,
    });
    return { invoice, line };
  };

  return repository.transaction ? repository.transaction(write) : write();
}

export interface CreditNoteInput {
  readonly learnerId: string;
  readonly invoiceId?: string;
  readonly amount: import('@/domain/schema/common').Money;
  readonly reason: string;
  readonly issueDate: string;
  readonly status: 'draft' | 'posted';
}

/** Raises a credit note, the correction path for a posted invoice. */
export async function createCreditNote(
  repository: FinanceRepository,
  input: CreditNoteInput
): Promise<RepositoryRow<'credit_note'>> {
  const learner = await repository.get('learner', asId<'learner'>(input.learnerId));
  if (!learner) throw new Error('The selected learner no longer exists.');
  if (input.amount.amount_minor <= 0) throw new Error('A credit note must be greater than zero.');

  const existing = (await repository.list('credit_note')).items.map((note) => note.number);
  return repository.create('credit_note', {
    institution_id: learner.institution_id,
    number: nextDocumentNumber('CNT', existing),
    learner_id: learner.id,
    amount: input.amount,
    reason: input.reason,
    issue_date: input.issueDate,
    status: input.status,
    ...(input.invoiceId ? { invoice_id: input.invoiceId } : {}),
  });
}

/** Posts a credit note; from then on the repository freezes it. */
export async function postCreditNote(
  repository: FinanceRepository,
  note: RepositoryRow<'credit_note'>
): Promise<RepositoryRow<'credit_note'>> {
  return repository.update(
    'credit_note',
    note.id,
    { status: 'posted' },
    { expectedVersion: note.rowVersion }
  );
}

/** Reverses a posted payment; the payment itself stays on the books. */
export async function reversePayment(
  repository: FinanceRepository,
  payment: RepositoryRow<'payment'>
): Promise<RepositoryRow<'payment'>> {
  if (payment.status !== 'posted' && payment.status !== 'cleared') {
    throw new Error(`A ${payment.status} payment cannot be reversed.`);
  }
  return repository.update(
    'payment',
    payment.id,
    { status: 'reversed' },
    { expectedVersion: payment.rowVersion }
  );
}

/** Writes an update with the version the caller read, keeping the freeze in the repository. */
export async function updateWithVersion<E extends EntityName>(
  repository: FinanceRepository,
  entity: E,
  row: RepositoryRow<E>,
  patch: UpdateInput<E>
): Promise<RepositoryRow<E>> {
  return repository.update(entity, row.id, patch, { expectedVersion: row.rowVersion });
}

/** The error message a page shows when a write is refused. */
export function refusalMessage(error: unknown): string {
  return errorText(error);
}

/** The id a picker hands back, branded for the entity it names. */
export function idOf<E extends EntityName>(value: string): Id<E> {
  return asId<E>(value);
}

/** Creates an installment plan from the form's writable values. */
export async function createInstallmentPlan(
  repository: FinanceRepository,
  input: CreateInput<'installment_plan'>
): Promise<RepositoryRow<'installment_plan'>> {
  return repository.create('installment_plan', input);
}
