// ABOUTME: Places a subject's movements in date order and walks a running balance over them:
// ABOUTME: the opening balance before the period, the balance after each movement, the closing
// ABOUTME: balance, and what each movement kind summed to.

import { add, isNegative, isPositive, zero, type CurrencyCode, type Money } from '@/domain/money';

import type {
  MovementDraft,
  StatementKindTotal,
  StatementMovement,
  StatementMovementKind,
  StatementPeriod,
} from './types';

/** A statement's running account: the opening, the movements with their balance, and the closing. */
export interface RunningBalance {
  readonly openingBalance: Money;
  readonly closingBalance: Money;
  readonly movements: readonly StatementMovement[];
  readonly totals: readonly StatementKindTotal[];
}

/**
 * Orders movements by day, then originals before their reversals and corrections, then by the
 * movement's own id.
 *
 * The day is the primary key. Within one day an entry that reverses or corrects another reads
 * *after* the originals, so a reversal on the day it reverses does not appear to precede the entry
 * it mirrors; the id is the final tie-break, so the same input always reads the same way.
 */
export function orderMovements(movements: readonly MovementDraft[]): readonly MovementDraft[] {
  const rank = (movement: MovementDraft): number =>
    movement.reversesEntryId !== null || movement.correctsEntryId !== null ? 1 : 0;
  return [...movements].sort((left, right) => {
    if (left.date !== right.date) return left.date < right.date ? -1 : 1;
    const leftRank = rank(left);
    const rightRank = rank(right);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}

/**
 * Walks a running balance over the movements.
 *
 * The opening balance is everything dated before the period's first day; a movement dated inside
 * the period carries the balance after it; the closing balance is the opening plus the period's
 * movements. The two invariants the module asserts hold by construction here and are asserted
 * again by the caller: the sum of the movements equals closing minus opening, and the closing
 * balance equals what the ledger reports.
 */
export function runningBalance(
  movements: readonly MovementDraft[],
  period: StatementPeriod,
  currency: CurrencyCode
): RunningBalance {
  const ordered = orderMovements(movements);
  const from = period.from ?? null;
  const to = period.to ?? null;

  let openingBalance = zero(currency);
  const inPeriod: MovementDraft[] = [];
  for (const movement of ordered) {
    if (from !== null && movement.date < from) {
      openingBalance = add(openingBalance, movement.amount);
      continue;
    }
    if (to !== null && movement.date > to) continue;
    inPeriod.push(movement);
  }

  const placed: StatementMovement[] = [];
  const totalsByKind = new Map<StatementMovementKind, { amount: Money; count: number }>();
  let running = openingBalance;
  for (const movement of inPeriod) {
    running = add(running, movement.amount);
    placed.push({ ...movement, balanceAfter: running });
    const bucket = totalsByKind.get(movement.kind) ?? { amount: zero(currency), count: 0 };
    bucket.amount = add(bucket.amount, movement.amount);
    bucket.count += 1;
    totalsByKind.set(movement.kind, bucket);
  }

  const totals: StatementKindTotal[] = [...totalsByKind.entries()]
    .map(([kind, value]) => ({ kind, amount: value.amount, count: value.count }))
    .sort((left, right) => (left.kind < right.kind ? -1 : left.kind > right.kind ? 1 : 0));

  return { openingBalance, closingBalance: running, movements: placed, totals };
}

/** The signed sum of the movements a statement shows in its period. */
export function movementNet(movements: readonly StatementMovement[], currency: CurrencyCode): Money {
  let total = zero(currency);
  for (const movement of movements) total = add(total, movement.amount);
  return total;
}

/** Whether a balance is in credit: what the subject is owed rather than owes. */
export function isInCredit(balance: Money): boolean {
  return isNegative(balance);
}

/** Whether a balance is an amount owed. */
export function isOwed(balance: Money): boolean {
  return isPositive(balance);
}
