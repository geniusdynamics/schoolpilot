// ABOUTME: The pure statement builder, proven against the ledger's own derivations: the running
// ABOUTME: balance and its two invariants, the discount a movement carries as detail, a credit note,
// ABOUTME: an opening balance, a reversal as an adjustment, and the household split made visible.

import { describe, expect, it } from 'vitest';

import {
  createLedgerAccountMapping,
  creditNoteEntry,
  invoiceEntry,
  openingBalanceEntry,
  paymentEntry,
  refundEntry,
  reverseJournalEntry,
  type JournalEntry,
} from '@/domain/finance/ledger';
import { planLearnerBill } from '@/domain/finance/discounts';
import { fromMinor } from '@/domain/money';

import {
  buildStatement,
  householdSplit,
  memberSplitFromBillPlan,
  statementCsv,
  type HouseholdMemberSplit,
} from '..';

const kes = (minor: number) => fromMinor(minor, 'KES');
const INST = 'inst-1';

const CHART = createLedgerAccountMapping({
  accounts: [{ code: '4100', name: 'Tuition revenue', kind: 'revenue' }],
  feeItemRevenueAccounts: { 'fee-tuition': '4100' },
});

function invoice(id: string, issueDate: string, lines: readonly { amount: number; description?: string }[]): JournalEntry {
  return invoiceEntry(
    {
      invoice: {
        id,
        number: `INV/${id}`,
        institutionId: INST,
        issueDate,
        lines: lines.map((line) => ({
          feeItemId: 'fee-tuition',
          amount: kes(line.amount),
          ...(line.description === undefined ? {} : { description: line.description }),
        })),
      },
    },
    CHART,
    { id: `e-${id}` }
  );
}

describe('the running balance', () => {
  const entries: readonly JournalEntry[] = [
    invoice('inv-1', '2027-01-10', [{ amount: 600_000 }]),
    paymentEntry(
      {
        payment: {
          id: 'pay-1',
          institutionId: INST,
          amount: kes(400_000),
          channel: 'cash',
          receivedAt: '2027-02-05T09:00:00.000Z',
        },
        allocations: [{ invoiceId: 'inv-1', invoiceNumber: 'INV/inv-1', amount: kes(300_000) }],
      },
      CHART,
      { id: 'e-pay-1' }
    ),
  ];

  it('runs the balance from the invoice through the allocation to the credit left', () => {
    const statement = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-1',
      subjectName: 'Amina',
      currency: 'KES',
      entries,
      period: {},
      asOf: '2027-02-28',
      agingItems: [],
    });

    expect(
      statement.movements.map((movement) => [
        movement.kind,
        movement.amount.amount_minor,
        movement.balanceAfter.amount_minor,
      ])
    ).toEqual([
      ['invoice', 600_000, 600_000],
      ['allocation', -300_000, 300_000],
      ['credit', -100_000, 200_000],
    ]);
    expect(statement.openingBalance.amount_minor).toBe(0);
    expect(statement.closingBalance.amount_minor).toBe(200_000);
  });

  it('agrees with the ledger, and the movements sum to closing minus opening', () => {
    const statement = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-1',
      subjectName: 'Amina',
      currency: 'KES',
      entries,
      period: {},
      asOf: '2027-02-28',
      agingItems: [],
    });

    expect(statement.movementsAgree).toBe(true);
    expect(statement.ledger.agrees).toBe(true);
    // The ledger's weighted accounts: receivables 300,000 and learner credit 100,000 held.
    expect(statement.ledger.ledgerBalance.amount_minor).toBe(200_000);
    expect(statement.ledger.accounts.map((account) => account.code)).toEqual(['1100', '2150']);
  });

  it('moves everything before the period into the opening balance', () => {
    const statement = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-1',
      subjectName: 'Amina',
      currency: 'KES',
      entries,
      period: { from: '2027-02-01', to: '2027-12-31' },
      asOf: '2027-12-31',
      agingItems: [],
    });

    expect(statement.openingBalance.amount_minor).toBe(600_000);
    expect(statement.movements).toHaveLength(2);
    expect(statement.closingBalance.amount_minor).toBe(200_000);
    expect(statement.movementsAgree).toBe(true);
    // The closing balance is the ledger's balance whether or not a period bounds it.
    expect(statement.ledger.agrees).toBe(true);
  });

  it('totals each movement kind', () => {
    const statement = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-1',
      subjectName: 'Amina',
      currency: 'KES',
      entries,
      period: {},
      asOf: '2027-02-28',
      agingItems: [],
    });
    const totals = new Map(statement.totals.map((total) => [total.kind, total]));
    expect(totals.get('invoice')?.amount.amount_minor).toBe(600_000);
    expect(totals.get('invoice')?.count).toBe(1);
    expect(totals.get('allocation')?.amount.amount_minor).toBe(-300_000);
    expect(totals.get('credit')?.amount.amount_minor).toBe(-100_000);
  });
});

describe('a discount', () => {
  it('is shown as a detail of the invoice movement, and the details sum to it', () => {
    const discounted = invoice('inv-2', '2027-01-15', [
      { amount: 600_000, description: 'Tuition' },
      { amount: -60_000, description: 'Sibling discount' },
    ]);
    const statement = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-2',
      subjectName: 'Brian',
      currency: 'KES',
      entries: [discounted],
      period: {},
      asOf: '2027-01-31',
      agingItems: [],
    });

    const movement = statement.movements[0];
    // The ledger nets the discount into the invoice's receivable line: 600,000 - 60,000.
    expect(movement?.kind).toBe('invoice');
    expect(movement?.amount.amount_minor).toBe(540_000);
    expect(movement?.detail.map((line) => [line.kind, line.amount.amount_minor])).toEqual([
      ['fee', 600_000],
      ['discount', -60_000],
    ]);
    expect(movement?.detail[1]?.description).toBe('Sibling discount');
    const detailSum = movement?.detail.reduce((sum, line) => sum + line.amount.amount_minor, 0);
    expect(detailSum).toBe(movement?.amount.amount_minor);
    expect(statement.ledger.agrees).toBe(true);
  });
});

describe('a credit note and an opening balance', () => {
  it('reduces the balance and keeps the ledger tie', () => {
    const entries = [
      invoice('inv-3', '2027-01-10', [{ amount: 500_000 }]),
      creditNoteEntry(
        {
          creditNote: {
            id: 'cn-1',
            number: 'CN/1',
            institutionId: INST,
            amount: kes(200_000),
            issueDate: '2027-02-01',
            reason: 'Overbilled',
          },
        },
        CHART,
        { id: 'e-cn-1' }
      ),
    ];
    const statement = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-3',
      subjectName: 'Cara',
      currency: 'KES',
      entries,
      period: {},
      asOf: '2027-02-28',
      agingItems: [],
    });
    expect(statement.closingBalance.amount_minor).toBe(300_000);
    expect(statement.movements.map((movement) => movement.kind)).toEqual(['invoice', 'credit_note']);
    expect(statement.movements[1]?.amount.amount_minor).toBe(-200_000);
    expect(statement.ledger.agrees).toBe(true);
  });

  it('carries a debit opening balance as a charge and a credit one as a credit', () => {
    const debit = openingBalanceEntry(
      {
        openingBalance: {
          id: 'ob-debit',
          institutionId: INST,
          asOfDate: '2027-01-01',
          amount: kes(150_000),
          side: 'debit',
          learnerId: 'lrn-4',
        },
      },
      CHART,
      { id: 'e-ob-1' }
    );
    const credit = openingBalanceEntry(
      {
        openingBalance: {
          id: 'ob-credit',
          institutionId: INST,
          asOfDate: '2027-01-02',
          amount: kes(40_000),
          side: 'credit',
          learnerId: 'lrn-4',
        },
      },
      CHART,
      { id: 'e-ob-2' }
    );

    const statement = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-4',
      subjectName: 'Dan',
      currency: 'KES',
      entries: [debit, credit],
      period: {},
      asOf: '2027-01-31',
      agingItems: [],
    });
    expect(statement.movements.map((movement) => [movement.kind, movement.amount.amount_minor])).toEqual([
      ['opening_balance', 150_000],
      ['opening_balance', -40_000],
    ]);
    expect(statement.closingBalance.amount_minor).toBe(110_000);
    expect(statement.ledger.agrees).toBe(true);
  });
});

describe('a reversal', () => {
  it('is an adjustment that nets the invoice back to zero', () => {
    const original = invoice('inv-5', '2027-01-10', [{ amount: 250_000 }]);
    const reversal = reverseJournalEntry(original, { reason: 'the charge belonged to another learner' });

    const statement = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-5',
      subjectName: 'Eve',
      currency: 'KES',
      entries: [original, reversal],
      period: {},
      asOf: '2027-01-31',
      agingItems: [],
    });
    expect(statement.movements.map((movement) => movement.kind)).toEqual(['invoice', 'adjustment']);
    expect(statement.movements[1]?.amount.amount_minor).toBe(-250_000);
    expect(statement.closingBalance.amount_minor).toBe(0);
    expect(statement.ledger.agrees).toBe(true);
  });
});

describe('the household split', () => {
  it('reads the discounts module\'s split, keeping the family\'s share and the sponsor\'s apart', () => {
    const plan = planLearnerBill({
      learnerId: 'lrn-brian',
      institutionId: INST,
      currency: 'KES',
      period: { on: '2027-02-15' },
      lines: [{ feeItemId: 'fee-tuition', feeItemCode: 'TUITION', fundingSource: 'parent', amount: kes(1_000_000) }],
      rules: [],
      sponsorships: [
        {
          id: 'sp-county',
          sponsorName: 'Nairobi County Bursary',
          fundingSource: 'county_bursary',
          sharePercent: 40,
        },
      ],
      facts: { isStaffWard: false },
      family: { payerId: 'guardian-1', name: 'Mrs Wanjiru' },
    });

    const member = memberSplitFromBillPlan('lrn-brian', 'Brian Wanjiru', plan);
    expect(member.familyShare.amount_minor).toBe(600_000);
    expect(member.sponsorShares).toEqual([
      {
        payerId: 'sp-county',
        name: 'Nairobi County Bursary',
        fundingSource: 'county_bursary',
        amount: kes(400_000),
      },
    ]);
    expect(member.total.amount_minor).toBe(1_000_000);

    const split = householdSplit('hh-1', 'KES', [member]);
    expect(split.familyTotal.amount_minor).toBe(600_000);
    expect(split.sponsorTotal.amount_minor).toBe(400_000);
    expect(split.total.amount_minor).toBe(1_000_000);
  });

  it('shows the split beside the ledger balance rather than netting it away', () => {
    const entries = [
      invoice('inv-hh-1', '2027-01-10', [{ amount: 600_000 }]),
      invoice('inv-hh-2', '2027-01-11', [{ amount: 400_000 }]),
    ];
    const members: HouseholdMemberSplit[] = [
      {
        learnerId: 'lrn-1',
        learnerName: 'Amina',
        familyShare: kes(600_000),
        sponsorShares: [],
        total: kes(600_000),
      },
      {
        learnerId: 'lrn-2',
        learnerName: 'Brian',
        familyShare: kes(0),
        sponsorShares: [{ payerId: 'sp-county', name: 'County', amount: kes(400_000) }],
        total: kes(400_000),
      },
    ];
    const statement = buildStatement({
      kind: 'household',
      subjectId: 'hh-1',
      subjectName: 'The Wanjiru family',
      currency: 'KES',
      entries,
      period: {},
      asOf: '2027-01-31',
      agingItems: [],
      split: householdSplit('hh-1', 'KES', members),
    });

    // The ledger balance is the household's whole receivable: 1,000,000.
    expect(statement.closingBalance.amount_minor).toBe(1_000_000);
    expect(statement.ledger.agrees).toBe(true);
    // The split is shown, not netted: the family owes 600,000 and the sponsor 400,000.
    expect(statement.split?.familyTotal.amount_minor).toBe(600_000);
    expect(statement.split?.sponsorTotal.amount_minor).toBe(400_000);
    expect(statement.split?.members[1]?.sponsorShares[0]?.name).toBe('County');
    expect(statement.notes.join(' ')).toContain('not netted into it');
  });
});

describe('the statement accounts', () => {
  it('defaults to the receivable net of the credit held, and states its own set on request', () => {
    const entries = [invoice('inv-7', '2027-01-10', [{ amount: 100_000 }])];
    const base = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-7',
      subjectName: 'Gus',
      currency: 'KES',
      entries,
      period: {},
      asOf: '2027-01-31',
      agingItems: [],
    });
    expect(base.ledger.accounts.map((account) => account.code)).toEqual(['1100', '2150']);
    expect(base.ledger.agrees).toBe(true);

    const withRefunds = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-7',
      subjectName: 'Gus',
      currency: 'KES',
      entries,
      period: {},
      asOf: '2027-01-31',
      agingItems: [],
      accounts: [
        { code: '1100', name: 'Fee receivables', weight: 1 },
        { code: '2150', name: 'Learner credit', weight: 1 },
        { code: '2100', name: 'Refunds payable', weight: -1 },
      ],
    });
    expect(withRefunds.ledger.accounts.map((account) => account.code)).toEqual(['1100', '2150', '2100']);
    expect(withRefunds.ledger.agrees).toBe(true);
  });

  it('does not move the default balance on a refund, because the ledger never releases the credit', () => {
    const refund = refundEntry(
      {
        refund: {
          id: 'rf-1',
          number: 'RF/1',
          institutionId: INST,
          amount: kes(30_000),
          status: 'paid',
          paidAt: '2027-02-20T09:00:00.000Z',
        },
      },
      CHART,
      { id: 'e-rf-1' }
    );
    const statement = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-8',
      subjectName: 'Hal',
      currency: 'KES',
      entries: [invoice('inv-8', '2027-01-10', [{ amount: 90_000 }]), refund],
      period: {},
      asOf: '2027-02-28',
      agingItems: [],
    });
    // The refund is in the ledger but not in the default account set: it is not a movement.
    expect(statement.movements.map((movement) => movement.kind)).toEqual(['invoice']);
    expect(statement.closingBalance.amount_minor).toBe(90_000);
    expect(statement.ledger.agrees).toBe(true);
  });
});

describe('the statement as CSV', () => {
  it('carries the running account, the aging and the clearance', () => {
    const entries = [invoice('inv-6', '2027-01-10', [{ amount: 100_000, description: 'Tuition' }])];
    const statement = buildStatement({
      kind: 'learner',
      subjectId: 'lrn-6',
      subjectName: 'Fay',
      currency: 'KES',
      entries,
      period: {},
      asOf: '2027-01-31',
      agingItems: [
        { id: 'inv-6', documentId: 'inv-6', documentNumber: 'INV/inv-6', issueDate: '2027-01-10', dueDate: '2027-01-20', amount: kes(100_000) },
      ],
      clearance: {},
    });

    const csv = statementCsv(statement);
    expect(csv).toContain('Statement,learner');
    expect(csv).toContain('Closing balance,1000.00 KES');
    expect(csv).toContain('Agrees with the ledger,yes');
    expect(csv).toContain('2027-01-10,invoice,INV/inv-6');
    expect(csv).toContain('Current,0.00 KES,0');
    expect(csv).toContain('1-30 days,1000.00 KES,1');
    expect(csv).toContain('Clearance,in_arrears');
  });
});
