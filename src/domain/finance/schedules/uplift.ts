// ABOUTME: The copy-with-uplift of a fee-schedule version: a percentage and/or a per-item absolute
// ABOUTME: change, applied through the frozen money module with one explicit rounding rule, so the
// ABOUTME: copied amounts are exact and testable.

import { Money, RoundingMode, add, multiplyRational } from '@/domain/money';

import { ScheduleError } from './errors';
import type { ResolvedLine, ScheduleCellInput, ScheduleLineInput, ScheduleUplift } from './types';

/**
 * The rounding rule a percentage uplift is applied with.
 *
 * A percentage of an amount is usually not a whole number of minor units, and the money module
 * refuses to round without a named rule. `half_up` is the rule a bursar expects of a fee increase:
 * the nearest minor unit, with an exact half rounded away from zero. `up` would systematically
 * over-charge the payer and `down` would systematically under-charge the school, so neither is a
 * policy anyone chose; `half_up` is the conventional commercial rounding and the money module's own
 * first mode. A school that wants a different rule names it per copy through `percentRounding`.
 */
export const UPLIFT_ROUNDING: RoundingMode = 'half_up';

/** The percentage scale: a percent is held as basis points so `7.5` is exactly 750. */
const PERCENT_SCALE = 10_000;

/** The basis points a percentage names, or a refusal when it is not a whole number of them. */
export function percentToBasisPoints(percent: number): number {
  if (!Number.isFinite(percent) || percent < 0) {
    throw new ScheduleError('uplift_invalid', `An uplift percentage must be a finite value at or above 0, not ${percent}.`);
  }
  const basisPoints = Math.round(percent * 100);
  if (Math.abs(percent * 100 - basisPoints) > 1e-9) {
    throw new ScheduleError(
      'uplift_invalid',
      `An uplift percentage carries at most two decimals; ${percent} does not.`
    );
  }
  return basisPoints;
}

/** The per-item absolute changes, validated against the currency of the lines they touch. */
function fixedDeltas(uplift: ScheduleUplift): Readonly<Record<string, Money>> {
  const fixed = uplift.fixed ?? {};
  for (const [feeItemId, delta] of Object.entries(fixed)) {
    if (delta === null || typeof delta !== 'object' || typeof delta.amount_minor !== 'number' || typeof delta.currency !== 'string') {
      throw new ScheduleError('uplift_invalid', `The fixed uplift for fee item ${feeItemId} is not a Money value.`);
    }
    if (!Number.isInteger(delta.amount_minor)) {
      throw new ScheduleError('uplift_invalid', `The fixed uplift for fee item ${feeItemId} is not a whole number of minor units.`);
    }
  }
  return fixed;
}

/** The uplifted amount of one line: the percentage first, then the absolute change. */
export function upliftAmount(amount: Money, feeItemId: string, uplift: ScheduleUplift): Money {
  const basisPoints = uplift.percent === undefined ? 0 : percentToBasisPoints(uplift.percent);
  const mode = uplift.percentRounding ?? UPLIFT_ROUNDING;
  const scaled =
    basisPoints === 0
      ? amount
      : multiplyRational(amount, PERCENT_SCALE + basisPoints, PERCENT_SCALE, mode);
  const delta = fixedDeltas(uplift)[feeItemId];
  if (delta === undefined) return scaled;
  if (delta.currency !== amount.currency) {
    throw new ScheduleError(
      'uplift_invalid',
      `The fixed uplift for fee item ${feeItemId} is in ${delta.currency}, but the line is in ${amount.currency}.`
    );
  }
  return add(scaled, delta);
}

/** Copies a stored line with the uplift applied, keeping every other field. */
export function upliftLine(line: ResolvedLine, uplift: ScheduleUplift): ResolvedLine {
  return { ...line, amount: upliftAmount(line.amount, line.feeItemId, uplift) };
}

/** Copies a line input with the uplift applied. */
export function upliftLineInput(line: ScheduleLineInput, uplift: ScheduleUplift): ScheduleLineInput {
  return { ...line, amount: upliftAmount(line.amount, line.feeItemId, uplift) };
}

/** Copies a version's cells with the uplift applied to every line. */
export function upliftCells(
  cells: readonly ScheduleCellInput[],
  uplift: ScheduleUplift
): readonly ScheduleCellInput[] {
  return cells.map((cell) => ({ ...cell, lines: cell.lines.map((line) => upliftLineInput(line, uplift)) }));
}
