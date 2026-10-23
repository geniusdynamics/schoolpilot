// ABOUTME: A statement as CSV: the same rows the screen shows, in the same order, so an export
// ABOUTME: never carries a figure the statement does not.

import { toDecimalString, type Money } from '@/domain/money';

import type { Statement } from './types';

/** Escapes a CSV field: quotes, a delimiter, a newline, or a leading/trailing space. */
function field(value: string): string {
  if (/[",\r\n]/.test(value) || value.trim() !== value) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** The exact major-unit text of an amount, never through a float. */
function amountText(amount: Money): string {
  return `${toDecimalString(amount)} ${amount.currency}`;
}

/**
 * Renders a statement as CSV.
 *
 * The columns are the running account: the day, the movement kind, the document, the description,
 * the signed amount and the balance after it, then the aging summary and the clearance underneath.
 * A file and a screen built from one statement cannot disagree.
 */
export function statementCsv(statement: Statement): string {
  const rows: string[][] = [];
  rows.push(['Statement', statement.kind]);
  rows.push(['Subject', statement.subjectName]);
  rows.push(['Currency', statement.currency]);
  rows.push(['From', statement.from ?? '']);
  rows.push(['To', statement.to ?? '']);
  rows.push(['Opening balance', amountText(statement.openingBalance)]);
  rows.push(['Closing balance', amountText(statement.closingBalance)]);
  rows.push(['Agrees with the ledger', statement.ledger.agrees ? 'yes' : 'no']);
  rows.push([]);
  rows.push(['Date', 'Kind', 'Document', 'Description', 'Amount', 'Balance']);
  for (const movement of statement.movements) {
    rows.push([
      movement.date,
      movement.kind,
      movement.source.number ?? movement.source.id,
      movement.description,
      amountText(movement.amount),
      amountText(movement.balanceAfter),
    ]);
  }
  rows.push([]);
  rows.push(['Aging', 'Amount', 'Count']);
  for (const bucket of statement.aging.buckets) {
    rows.push([bucket.label, amountText(bucket.amount), String(bucket.count)]);
  }
  rows.push(['Total', amountText(statement.aging.total), '']);
  if (statement.clearance) {
    rows.push([]);
    rows.push(['Clearance', statement.clearance.state]);
    rows.push(['Outstanding', amountText(statement.clearance.outstanding)]);
    rows.push(['Credit', amountText(statement.clearance.credit)]);
  }
  if (statement.split) {
    rows.push([]);
    rows.push(['Learner', 'Family share', 'Sponsor', 'Sponsor share']);
    for (const member of statement.split.members) {
      if (member.sponsorShares.length === 0) {
        rows.push([member.learnerName, amountText(member.familyShare), '', '']);
        continue;
      }
      for (const sponsor of member.sponsorShares) {
        rows.push([member.learnerName, amountText(member.familyShare), sponsor.name, amountText(sponsor.amount)]);
      }
    }
    rows.push(['Family total', amountText(statement.split.familyTotal), '', '']);
    rows.push(['Sponsor total', '', '', amountText(statement.split.sponsorTotal)]);
  }
  return rows.map((row) => row.map(field).join(',')).join('\n');
}
