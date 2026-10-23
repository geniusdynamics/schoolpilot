// ABOUTME: The statement service against a real SQLite database: a learner's statement equals the
// ABOUTME: ledger's own account balances, the aging of a partly paid invoice ties to the balance, a
// ABOUTME: household's children combine with the split shown, and a sponsor's documents are read.

import { afterEach, describe, expect, it } from 'vitest';

import type { RepositoryRow } from '@/data/repository';
import {
  closeTestContext,
  createTestContext,
  TEST_ACTOR,
  type TestContext,
} from '@/data/__tests__/harness';
import {
  CONTROL_ACCOUNTS,
  LedgerService,
  createSqliteLedgerStore,
  ensureLedgerSchema,
} from '@/domain/finance/ledger';
import { asId, type Id } from '@/domain/ids';
import { fromMinor, type CurrencyCode } from '@/domain/money';

import { StatementService, householdSplit, isStatementError, type HouseholdMemberSplit } from '..';

const contexts: TestContext[] = [];

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => closeTestContext(context)));
});

const kes = (minor: number) => fromMinor(minor, 'KES');
const RECEIVABLES = CONTROL_ACCOUNTS.receivables.code;
const LEARNER_CREDIT = CONTROL_ACCOUNTS.learner_credit.code;

interface Fixture {
  readonly context: TestContext;
  readonly ledger: LedgerService;
  readonly service: StatementService;
  readonly institutionId: Id<'institution'>;
  readonly currency: CurrencyCode;
}

/** A fresh context with the ledger's schema applied and a statement service over both. */
async function fixture(): Promise<Fixture> {
  const context = await createTestContext();
  contexts.push(context);
  await context.repository.whenIdle();
  await ensureLedgerSchema(context.adapter);
  const ledger = new LedgerService({
    store: createSqliteLedgerStore(context.adapter),
    actor: TEST_ACTOR,
    now: () => new Date('2027-06-30T09:00:00.000Z'),
  });
  const institutionId = context.seed.idOf('institution');
  const service = new StatementService({
    ledger,
    store: context.repository,
    institutionId,
    currency: 'KES',
    now: () => new Date('2027-06-30T09:00:00.000Z'),
  });
  return { context, ledger, service, institutionId, currency: 'KES' };
}

async function addLearner(
  fixture: Fixture,
  admissionNumber: string,
  givenName: string,
  options: { readonly householdId?: string } = {}
): Promise<string> {
  const learner = await fixture.context.repository.create('learner', {
    institution_id: asId<'institution'>(fixture.institutionId),
    admission_number: admissionNumber,
    given_name: givenName,
    family_name: 'Wanjiru',
    name_order: 'given_first',
    gender: 'female',
    status: 'enrolled',
    residence_status: 'day',
    ...(options.householdId === undefined ? {} : { household_id: asId<'household'>(options.householdId) }),
  });
  return learner.id;
}

async function addInvoice(
  fixture: Fixture,
  input: {
    readonly learnerId?: string;
    readonly householdId?: string;
    readonly guardianId?: string;
    readonly number: string;
    readonly totalMinor: number;
    readonly issueDate: string;
    readonly dueDate?: string;
    readonly status?: RepositoryRow<'invoice'>['status'];
  }
): Promise<string> {
  const invoice = await fixture.context.repository.create('invoice', {
    institution_id: asId<'institution'>(fixture.institutionId),
    number: input.number,
    ...(input.learnerId === undefined ? {} : { learner_id: asId<'learner'>(input.learnerId) }),
    ...(input.householdId === undefined ? {} : { household_id: asId<'household'>(input.householdId) }),
    ...(input.guardianId === undefined ? {} : { payer_guardian_id: asId<'guardian'>(input.guardianId) }),
    issue_date: input.issueDate,
    ...(input.dueDate === undefined ? {} : { due_date: input.dueDate }),
    total: kes(input.totalMinor),
    status: input.status ?? 'posted',
  });
  await fixture.ledger.postInvoice({
    invoice: {
      id: invoice.id,
      number: invoice.number,
      institutionId: fixture.institutionId,
      issueDate: input.issueDate,
      lines: [{ amount: kes(input.totalMinor), description: 'Tuition' }],
    },
  });
  return invoice.id;
}

async function addPayment(
  fixture: Fixture,
  input: {
    readonly number: string;
    readonly amountMinor: number;
    readonly receivedAt: string;
    readonly learnerId?: string;
    readonly householdId?: string;
    readonly guardianId?: string;
    readonly allocations?: readonly { readonly invoiceId: string; readonly amountMinor: number }[];
  }
): Promise<string> {
  const payment = await fixture.context.repository.create('payment', {
    institution_id: asId<'institution'>(fixture.institutionId),
    amount: kes(input.amountMinor),
    channel: 'cash',
    received_at: input.receivedAt,
    status: 'posted',
    ...(input.learnerId === undefined ? {} : { learner_id: asId<'learner'>(input.learnerId) }),
    ...(input.householdId === undefined ? {} : { household_id: asId<'household'>(input.householdId) }),
    ...(input.guardianId === undefined ? {} : { payer_guardian_id: asId<'guardian'>(input.guardianId) }),
  });
  for (const allocation of input.allocations ?? []) {
    await fixture.context.repository.create('payment_allocation', {
      institution_id: asId<'institution'>(fixture.institutionId),
      payment_id: asId<'payment'>(payment.id),
      invoice_id: asId<'invoice'>(allocation.invoiceId),
      amount: kes(allocation.amountMinor),
      allocated_at: input.receivedAt,
    });
  }
  await fixture.ledger.postPayment({
    payment: {
      id: payment.id,
      institutionId: fixture.institutionId,
      amount: kes(input.amountMinor),
      channel: 'cash',
      receivedAt: input.receivedAt,
    },
    allocations: (input.allocations ?? []).map((allocation) => ({
      invoiceId: allocation.invoiceId,
      amount: kes(allocation.amountMinor),
    })),
  });
  return payment.id;
}

async function addCreditNote(
  fixture: Fixture,
  input: { readonly number: string; readonly learnerId: string; readonly invoiceId: string; readonly amountMinor: number; readonly issueDate: string }
): Promise<string> {
  const note = await fixture.context.repository.create('credit_note', {
    institution_id: asId<'institution'>(fixture.institutionId),
    number: input.number,
    learner_id: asId<'learner'>(input.learnerId),
    invoice_id: asId<'invoice'>(input.invoiceId),
    amount: kes(input.amountMinor),
    reason: 'Overbilled',
    issue_date: input.issueDate,
    status: 'posted',
  });
  await fixture.ledger.postCreditNote({
    creditNote: {
      id: note.id,
      number: note.number,
      institutionId: fixture.institutionId,
      amount: kes(input.amountMinor),
      issueDate: input.issueDate,
      reason: 'Overbilled',
    },
  });
  return note.id;
}

/**
 * The balance the ledger reports for a scope, over the statement's default accounts: the receivable
 * net of the credit held.
 */
async function ledgerBalance(fixture: Fixture, asOf?: string): Promise<number> {
  const query = { currency: fixture.currency, institutionId: fixture.institutionId, ...(asOf === undefined ? {} : { asOf }) };
  const receivables = await fixture.ledger.accountBalance(RECEIVABLES, query);
  const credit = await fixture.ledger.accountBalance(LEARNER_CREDIT, query);
  return receivables.amount_minor + credit.amount_minor;
}

describe('a learner statement equals the ledger', () => {
  it('runs the account and its closing balance equals the ledger\'s own account balances', async () => {
    const f = await fixture();
    const learnerId = await addLearner(f, 'STMT-1', 'Amina');
    const invoiceId = await addInvoice(f, {
      learnerId,
      number: 'INV/2027/1/000001',
      totalMinor: 600_000,
      issueDate: '2027-01-10',
      dueDate: '2027-01-31',
    });
    await addPayment(f, {
      number: 'RCT/1',
      amountMinor: 400_000,
      receivedAt: '2027-02-05T09:00:00.000Z',
      learnerId,
      allocations: [{ invoiceId, amountMinor: 300_000 }],
    });
    await addCreditNote(f, {
      number: 'CN/1',
      learnerId,
      invoiceId,
      amountMinor: 50_000,
      issueDate: '2027-02-10',
    });

    const statement = await f.service.learnerStatement(asId<'learner'>(learnerId), { to: '2027-06-30' });

    expect(statement.closingBalance.amount_minor).toBe(150_000);
    expect(statement.ledger.agrees).toBe(true);
    expect(statement.movementsAgree).toBe(true);
    // The acceptance: the closing balance equals what the ledger reports for the same accounts.
    expect(statement.closingBalance.amount_minor).toBe(await ledgerBalance(f, '2027-06-30'));

    expect(
      statement.movements.map((movement) => [movement.kind, movement.amount.amount_minor])
    ).toEqual([
      ['invoice', 600_000],
      ['allocation', -300_000],
      ['credit', -100_000],
      ['credit_note', -50_000],
    ]);

    // Aging: the invoice's outstanding part, and the tie to the balance the ledger holds.
    expect(statement.aging.total.amount_minor).toBe(250_000);
    expect(statement.aging.total.amount_minor).toBe(statement.closingBalance.amount_minor + 100_000);
    // Due 2027-01-31, as of 2027-06-30: 150 days past due -> 90+.
    expect(statement.aging.buckets.find((bucket) => bucket.name === 'days_90_plus')?.amount.amount_minor).toBe(250_000);

    // Clearance: an amount owed with no plan is in arrears.
    expect(statement.clearance?.state).toBe('in_arrears');
    expect(statement.clearance?.outstanding.amount_minor).toBe(150_000);
  });

  it('clears the learner once the account is settled, and a credit balance clears too', async () => {
    const f = await fixture();
    const learnerId = await addLearner(f, 'STMT-2', 'Brian');
    const invoiceId = await addInvoice(f, {
      learnerId,
      number: 'INV/2027/1/000002',
      totalMinor: 200_000,
      issueDate: '2027-01-10',
      dueDate: '2027-01-31',
    });
    await addPayment(f, {
      number: 'RCT/2',
      amountMinor: 200_000,
      receivedAt: '2027-02-05T09:00:00.000Z',
      learnerId,
      allocations: [{ invoiceId, amountMinor: 200_000 }],
    });

    const settled = await f.service.learnerStatement(asId<'learner'>(learnerId), { to: '2027-06-30' });
    expect(settled.closingBalance.amount_minor).toBe(0);
    expect(settled.clearance?.state).toBe('cleared');
    expect(settled.clearance?.cleared).toBe(true);

    // A further payment with no allocation becomes learner credit, and a credit balance clears.
    await addPayment(f, {
      number: 'RCT/3',
      amountMinor: 75_000,
      receivedAt: '2027-03-05T09:00:00.000Z',
      learnerId,
    });
    const inCredit = await f.service.learnerStatement(asId<'learner'>(learnerId), { to: '2027-06-30' });
    expect(inCredit.closingBalance.amount_minor).toBe(-75_000);
    expect(inCredit.clearance?.state).toBe('cleared');
    expect(inCredit.clearance?.credit.amount_minor).toBe(75_000);
    expect(inCredit.movements.map((movement) => movement.kind)).toEqual(['invoice', 'allocation', 'credit']);
    expect(inCredit.ledger.agrees).toBe(true);
  });
});

describe('a household statement', () => {
  it('combines the siblings, keeps the split visible, and equals the ledger', async () => {
    const f = await fixture();
    const household = await f.context.repository.create('household', {
      institution_id: asId<'institution'>(f.institutionId),
      name: 'The Wanjiru family',
    });
    const amina = await addLearner(f, 'HH-1', 'Amina', { householdId: household.id });
    const brian = await addLearner(f, 'HH-2', 'Brian', { householdId: household.id });

    await addInvoice(f, {
      learnerId: amina,
      householdId: household.id,
      number: 'INV/2027/1/000010',
      totalMinor: 600_000,
      issueDate: '2027-01-10',
      dueDate: '2027-01-31',
    });
    const brianInvoice = await addInvoice(f, {
      learnerId: brian,
      householdId: household.id,
      number: 'INV/2027/1/000011',
      totalMinor: 400_000,
      issueDate: '2027-01-11',
      dueDate: '2027-01-31',
    });

    const statement = await f.service.householdStatement(asId<'household'>(household.id), { to: '2027-06-30' });

    expect(statement.closingBalance.amount_minor).toBe(1_000_000);
    expect(statement.ledger.agrees).toBe(true);
    expect(statement.closingBalance.amount_minor).toBe(await ledgerBalance(f, '2027-06-30'));
    // The household's outstanding is the whole bill: nothing has been paid.
    expect(statement.aging.total.amount_minor).toBe(1_000_000);

    // The split is shown, not netted: the family owes the residual and the sponsor its share.
    const members: HouseholdMemberSplit[] = [
      {
        learnerId: amina,
        learnerName: 'Amina Wanjiru',
        familyShare: kes(600_000),
        sponsorShares: [],
        total: kes(600_000),
      },
      {
        learnerId: brian,
        learnerName: 'Brian Wanjiru',
        familyShare: kes(0),
        sponsorShares: [{ payerId: 'sp-county', name: 'Nairobi County Bursary', amount: kes(400_000) }],
        total: kes(400_000),
      },
    ];
    const withSplit = await f.service.householdStatement(asId<'household'>(household.id), { to: '2027-06-30' }, {
      split: householdSplit(household.id, 'KES', members),
    });

    expect(withSplit.split?.familyTotal.amount_minor).toBe(600_000);
    expect(withSplit.split?.sponsorTotal.amount_minor).toBe(400_000);
    expect(withSplit.split?.total.amount_minor).toBe(1_000_000);
    // The ledger balance is unchanged by showing the split: it is the same 1,000,000.
    expect(withSplit.closingBalance.amount_minor).toBe(1_000_000);
    expect(withSplit.ledger.agrees).toBe(true);
    expect(brianInvoice).toBeTruthy();
  });
});

describe('a sponsor statement', () => {
  it('reads the sponsor\'s own documents and equals the ledger', async () => {
    const f = await fixture();
    const sponsor = await f.context.repository.create('guardian', {
      institution_id: asId<'institution'>(f.institutionId),
      given_name: 'Nairobi',
      family_name: 'County Bursary',
      name_order: 'given_first',
      gender: 'not_stated',
    });
    const invoiceId = await addInvoice(f, {
      guardianId: sponsor.id,
      number: 'SPINV/2027/1/000001',
      totalMinor: 500_000,
      issueDate: '2027-01-10',
      dueDate: '2027-01-31',
    });
    const paymentId = await addPayment(f, {
      number: 'SPRCT/1',
      amountMinor: 200_000,
      receivedAt: '2027-02-05T09:00:00.000Z',
      guardianId: sponsor.id,
      allocations: [{ invoiceId, amountMinor: 200_000 }],
    });

    const statement = await f.service.sponsorStatement(
      {
        id: sponsor.id,
        name: 'Nairobi County Bursary',
        documents: [
          { kind: 'invoice', id: invoiceId },
          { kind: 'payment', id: paymentId },
        ],
      },
      { to: '2027-06-30' }
    );

    expect(statement.closingBalance.amount_minor).toBe(300_000);
    expect(statement.ledger.agrees).toBe(true);
    expect(statement.closingBalance.amount_minor).toBe(await ledgerBalance(f, '2027-06-30'));
    expect(statement.movements.map((movement) => movement.kind)).toEqual(['invoice', 'allocation']);
    expect(statement.clearance).toBeNull();
  });

  it('refuses a sponsor that names no document', async () => {
    const f = await fixture();
    let thrown: unknown = null;
    try {
      await f.service.sponsorStatement({ id: 'sp-none', name: 'Nobody', documents: [] }, {});
    } catch (error) {
      thrown = error;
    }
    expect(isStatementError(thrown, 'no_documents')).toBe(true);
  });
});

describe('the service refusals', () => {
  it('refuses a learner the repository does not hold', async () => {
    const f = await fixture();
    let thrown: unknown = null;
    try {
      await f.service.learnerStatement(asId<'learner'>('00000000-0000-7000-8000-0000000000ff'), {});
    } catch (error) {
      thrown = error;
    }
    expect(isStatementError(thrown, 'not_found')).toBe(true);
  });
});
