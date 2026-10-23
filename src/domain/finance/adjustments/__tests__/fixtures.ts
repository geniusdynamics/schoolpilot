// ABOUTME: The adjustments test fixture: a real SQLite database with the seeded canonical rows, a
// ABOUTME: learner of its own, a fee item, and the posted invoice and payment documents the credit
// ABOUTME: notes, refunds, write-offs and balance explanations are exercised against.

import type { RepositoryRow } from '@/data/repository';
import { closeTestContext, createTestContext, TEST_ACTOR, type TestContext } from '@/data/__tests__/harness';
import { asId, type Id } from '@/domain/ids';
import { fromMinor, isCurrencyCode, toDecimalString, type CurrencyCode, type Money } from '@/domain/money';
import {
  CONTROL_ACCOUNTS,
  LedgerService,
  createSqliteLedgerStore,
  ensureLedgerSchema,
} from '@/domain/finance/ledger';
import type { PaymentChannel } from '@/domain/finance/payments';
import { SEQUENCE_DDL } from '@/domain/sequences';

import { AdjustmentsService } from '../service';
import { buildChart, revenueAccountsOf } from '../support';

/** Money in the fixture's currency, from whole minor units. */
export function money(minor: number, currency: CurrencyCode = 'KES'): Money {
  return fromMinor(minor, currency);
}

/** A learner the fixture created. */
export interface TestLearner {
  readonly id: Id<'learner'>;
  readonly admissionNumber: string;
}

/** The ids and helpers one test works with. */
export interface AdjustmentsFixture {
  readonly context: TestContext;
  readonly institutionId: Id<'institution'>;
  readonly periodId: Id<'academic_period'>;
  readonly currency: CurrencyCode;
  readonly feeItemId: Id<'fee_item'>;
  readonly revenueAccountCode: string;
  /** The actor the fixture's writes are stamped with; the maker of a request. */
  readonly actor: string;
  /** A real user the checker's approvals are stamped with. */
  readonly checker: string;
  /** A real user with no approval role. */
  readonly clerk: string;
  learner(admissionNumber: string): Promise<TestLearner>;
  service(options?: { readonly writeOffApprovalThresholdMinor?: number; readonly now?: string }): AdjustmentsService;
  invoice(spec: {
    readonly learnerId: Id<'learner'>;
    readonly amountMinor: number;
    readonly issueDate?: string;
    readonly kind?: 'fee' | 'opening_balance';
    readonly feeItemId?: Id<'fee_item'> | null;
  }): Promise<{ readonly invoice: RepositoryRow<'invoice'>; readonly line: RepositoryRow<'invoice_line'> }>;
  payment(spec: {
    readonly learnerId: Id<'learner'>;
    readonly amountMinor: number;
    readonly channel?: PaymentChannel;
    readonly receivedAt?: string;
    readonly allocateTo?: { readonly invoiceId: Id<'invoice'>; readonly amountMinor: number };
  }): Promise<RepositoryRow<'payment'>>;
  ledger(): Promise<LedgerService>;
  close(): Promise<void>;
}

/** Opens a fixture on a fresh database. */
export async function createAdjustmentsFixture(): Promise<AdjustmentsFixture> {
  const context = await createTestContext();
  const institutionId = context.seed.idOf('institution');
  const periodId = context.seed.idOf('academic_period');
  const currency: CurrencyCode = 'KES';
  const actor = TEST_ACTOR;

  // `refund.approved_by` references a real user, so the checker is the seeded user and the clerk is
  // one more. The maker is the fixture's actor, which only lands in the audit fields.
  const checker = context.seed.idOf('user');
  const clerk = (
    await context.repository.create(
      'user',
      context.seed.inputFor('user', { username: 'adj.clerk', person_ref: { type: 'staff', id: context.seed.idOf('staff') } })
    )
  ).id;

  await ensureLedgerSchema(context.adapter);
  for (const statement of SEQUENCE_DDL) await context.adapter.exec(statement);

  const feeItem = await context.repository.create(
    'fee_item',
    context.seed.inputFor('fee_item', {
      code: 'ADJ-TUITION',
      name: 'Tuition',
      category: 'tuition',
      revenue_account_code: '4100',
    })
  );
  const feeItemId = feeItem.id;
  const revenueAccountCode = '4100';

  let counter = 0;
  const next = (): number => (counter += 1);

  const chart = () => buildChart(revenueAccountsOf([{ id: feeItemId, revenue_account_code: revenueAccountCode }]));

  const ledger = async (): Promise<LedgerService> =>
    new LedgerService({
      store: createSqliteLedgerStore(context.adapter),
      mapping: chart(),
      actor,
      now: () => new Date('2027-02-15T08:00:00.000Z'),
    });

  const learner = async (admissionNumber: string): Promise<TestLearner> => {
    const row = await context.repository.create(
      'learner',
      context.seed.inputFor('learner', {
        admission_number: admissionNumber,
        residence_status: 'day',
        status: 'enrolled',
        admission_date: '2027-01-05',
      })
    );
    return { id: row.id, admissionNumber };
  };

  const invoice = async (spec: {
    readonly learnerId: Id<'learner'>;
    readonly amountMinor: number;
    readonly issueDate?: string;
    readonly kind?: 'fee' | 'opening_balance';
    readonly feeItemId?: Id<'fee_item'> | null;
  }) => {
    const issueDate = spec.issueDate ?? '2027-01-05';
    const amount = money(spec.amountMinor, currency);
    const row = await context.repository.create('invoice', {
      institution_id: institutionId,
      number: `INV/2027/T1/${String(next()).padStart(6, '0')}`,
      learner_id: spec.learnerId,
      academic_period_id: periodId,
      issue_date: issueDate,
      total: amount,
      status: 'posted',
    });
    const line = await context.repository.create('invoice_line', {
      institution_id: institutionId,
      invoice_id: row.id,
      ...(spec.feeItemId === null ? {} : { fee_item_id: spec.feeItemId ?? feeItemId }),
      description: 'Test invoice line',
      amount,
      kind: spec.kind ?? 'fee',
    });
    if (spec.kind === 'opening_balance') {
      // A migrated balance is not revenue: it posts against opening-balance equity, not a revenue
      // account, exactly as the billing run posts it.
      await (await ledger()).postOpeningBalance({
        openingBalance: {
          id: row.id,
          institutionId,
          asOfDate: issueDate,
          amount,
          side: 'debit',
          learnerId: spec.learnerId,
        },
      });
    } else {
      await (await ledger()).postInvoice({
        invoice: {
          id: row.id,
          number: row.number,
          institutionId,
          issueDate,
          total: amount,
          lines: [
            {
              feeItemId: spec.feeItemId === null ? null : spec.feeItemId ?? feeItemId,
              amount,
              description: 'Test invoice line',
            },
          ],
        },
      });
    }
    return { invoice: row, line };
  };

  const payment = async (spec: {
    readonly learnerId: Id<'learner'>;
    readonly amountMinor: number;
    readonly channel?: PaymentChannel;
    readonly receivedAt?: string;
    readonly allocateTo?: { readonly invoiceId: Id<'invoice'>; readonly amountMinor: number };
  }) => {
    const receivedAt = spec.receivedAt ?? '2027-02-01T09:00:00Z';
    const amount = money(spec.amountMinor, currency);
    const channel = spec.channel ?? 'cash';
    const row = await context.repository.create('payment', {
      institution_id: institutionId,
      learner_id: spec.learnerId,
      amount,
      channel,
      reference: `PAY-${next()}`,
      received_at: receivedAt,
      status: 'posted',
    });
    const allocations = [];
    if (spec.allocateTo) {
      await context.repository.create('payment_allocation', {
        institution_id: institutionId,
        payment_id: row.id,
        invoice_id: spec.allocateTo.invoiceId,
        amount: money(spec.allocateTo.amountMinor, currency),
        allocated_at: receivedAt,
      });
      allocations.push({
        invoiceId: spec.allocateTo.invoiceId,
        amount: money(spec.allocateTo.amountMinor, currency),
      });
    }
    await (await ledger()).postPayment({
      payment: {
        id: row.id,
        institutionId,
        amount,
        channel,
        reference: row.reference ?? undefined,
        receivedAt,
      },
      allocations,
    });
    return row;
  };

  const service = (options: { readonly writeOffApprovalThresholdMinor?: number; readonly now?: string } = {}) =>
    new AdjustmentsService({
      store: context.repository,
      actor,
      now: () => new Date(options.now ?? '2027-02-15T08:00:00.000Z'),
      ...(options.writeOffApprovalThresholdMinor === undefined
        ? {}
        : { writeOffApprovalThresholdMinor: options.writeOffApprovalThresholdMinor }),
    });

  return {
    context,
    institutionId,
    periodId,
    currency,
    feeItemId,
    revenueAccountCode,
    actor,
    checker,
    clerk,
    learner,
    service,
    invoice,
    payment,
    ledger,
    close: () => closeTestContext(context),
  };
}

/** The receivable account code a balance is held in. */
export const RECEIVABLES = CONTROL_ACCOUNTS.receivables.code;
/** The learner-credit account code. */
export const LEARNER_CREDIT = CONTROL_ACCOUNTS.learner_credit.code;

/** The id a test addresses a learner by. */
export function learnerId(value: string): Id<'learner'> {
  return asId<'learner'>(value);
}

/** The decimal text of a stored amount, which the schema types as a plain currency string. */
export function decimalOf(
  value: { readonly amount_minor: number; readonly currency: string } | null | undefined
): string {
  if (!value || !isCurrencyCode(value.currency)) return '-';
  return toDecimalString(fromMinor(value.amount_minor, value.currency));
}
