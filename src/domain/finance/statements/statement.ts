// ABOUTME: The pure statement builder: it places a subject's ledger movements in a running balance,
// ABOUTME: ages the outstanding items, reads the clearance and the household split, and states the
// ABOUTME: tie that proves the closing balance equals what the ledger reports.

import { compare } from '@/domain/money';

import { agingSummary } from './aging';
import { clearanceStatus } from './clearance';
import { ledgerBalanceOf, movementsFromEntries, statementAccounts } from './movements';
import { movementNet, runningBalance } from './runningBalance';
import type { Statement, StatementBuildInput, StatementKind, StatementLedgerTie } from './types';

/** What each kind of statement includes and excludes, as the screen states it. */
const KIND_NOTES: Readonly<Record<StatementKind, readonly string[]>> = {
  learner: [
    'Includes every invoice, payment allocation, credit note, refund and opening balance the ledger holds for this learner.',
    "Excludes a sponsor's share: the sponsored part is the sponsor's own invoice, not this learner's.",
    "A discount is not a movement of its own - the ledger nets it into the invoice's receivable line - so it is shown as a detail of that movement rather than counted twice.",
  ],
  household: [
    'Combines the learners of one household, so the family sees one running account across its children.',
    "The family-versus-sponsor split is shown beside the ledger balance, not netted into it: the family owes the residual and each sponsor owes its own share.",
  ],
  sponsor: [
    'Includes the sponsor invoices issued to this sponsor and the receipts allocated against them.',
    'Excludes the family residual: a learner invoice for the part the family funds is the family statement, not this one.',
  ],
};

/**
 * Builds a statement.
 *
 * The movements come from the ledger's own entries, so the closing balance is the ledger's balance
 * and not a second arithmetic over the invoice rows. Two invariants hold and are reported:
 *
 * 1. the sum of the movements equals closing minus opening, and
 * 2. the closing balance equals the ledger's weighted account balance for the same entries
 *    ({@link Statement.ledger}), which is the acceptance of the module.
 */
export function buildStatement(input: StatementBuildInput): Statement {
  const accounts = statementAccounts(input.accounts);
  const drafts = movementsFromEntries(input.entries, accounts);
  const running = runningBalance(drafts, input.period, input.currency);
  const ledgerBalance = ledgerBalanceOf(input.entries, input.currency, accounts);

  const aging = agingSummary(input.agingItems, input.asOf, input.currency, {
    ...(input.missingDueDate === undefined ? {} : { missingDueDate: input.missingDueDate }),
  });

  const clearance =
    input.clearance === undefined || input.clearance === null
      ? null
      : clearanceStatus(running.closingBalance, input.currency, input.clearance);

  const ledger: StatementLedgerTie = {
    statementBalance: running.closingBalance,
    ledgerBalance,
    agrees: compare(running.closingBalance, ledgerBalance) === 0,
    accounts,
  };

  // The running-balance arithmetic: the movements are exactly the difference the closing makes.
  const net = movementNet(running.movements, input.currency);
  const expected = running.closingBalance.amount_minor - running.openingBalance.amount_minor;
  const movementsAgree = net.amount_minor === expected;

  return {
    kind: input.kind,
    subjectId: input.subjectId,
    subjectName: input.subjectName,
    currency: input.currency,
    from: input.period.from ?? null,
    to: input.period.to ?? null,
    asOf: input.asOf,
    openingBalance: running.openingBalance,
    closingBalance: running.closingBalance,
    movements: running.movements,
    totals: running.totals,
    aging,
    clearance,
    split: input.split ?? null,
    ledger,
    movementsAgree,
    notes: [...KIND_NOTES[input.kind], ...(input.notes ?? [])],
  };
}
