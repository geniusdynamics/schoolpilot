// ABOUTME: The identity of a billing run: the digest a re-run is recognised by, derived from the
// ABOUTME: period, the schedule versions in force, the cohort of learners and the run's one-off inputs.

import type { AdHocChargeInput, OpeningBalanceInput, SchedulePin } from './types';

/**
 * The run identity.
 *
 * A run is identified by exactly four things, so two runs are the same run only when all four
 * agree:
 *
 * 1. **the period** it bills;
 * 2. **the schedule versions in force** it prices from, as `feeScheduleId@version`, sorted;
 * 3. **the cohort**: the ids of the learners the run considered, sorted, digested. The cohort is
 *    the resolved set, not the filter that produced it, so admitting five learners and re-running
 *    is a different run — which is what lets the second run bill only the five, as spec 05 §4.3
 *    asks;
 * 4. **the one-off inputs**: the ad-hoc charges and the opening balances, sorted and digested, so
 *    a run that carries a new fine is a different run rather than a replay that drops it.
 *
 * The digest is a 64-bit FNV-1a hash rendered as hex. It is stable, order-independent for the parts
 * that are sorted, and needs no dependency.
 */
export function billingRunKey(parts: {
  readonly periodId: string;
  readonly schedulePins: readonly SchedulePin[];
  readonly cohortLearnerIds: readonly string[];
  readonly adhocCharges: readonly AdHocChargeInput[];
  readonly openingBalances: readonly OpeningBalanceInput[];
}): string {
  const pins = parts.schedulePins
    .map((pin) => `${pin.feeScheduleId}@${pin.version}`)
    .slice()
    .sort()
    .join(',');
  const cohort = digest([...parts.cohortLearnerIds].sort().join(','));
  const charges = digest(
    parts.adhocCharges
      .map(
        (charge) =>
          `${charge.learnerId}|${charge.feeItemId}|${charge.kind}|${charge.amount.amount_minor}|${charge.amount.currency}|${charge.description}`
      )
      .slice()
      .sort()
      .join('\n')
  );
  const openings = digest(
    parts.openingBalances
      .map(
        (opening) =>
          `${opening.learnerId}|${opening.side}|${opening.amount.amount_minor}|${opening.amount.currency}|${opening.asOfDate}`
      )
      .slice()
      .sort()
      .join('\n')
  );
  return `billing-run:${parts.periodId}:${pins}:${cohort}:${charges}:${openings}`;
}

/** The digest of a text, as 16 hex digits. */
export function digest(text: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}
