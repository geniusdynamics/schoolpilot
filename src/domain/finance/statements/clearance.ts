// ABOUTME: A learner's clearance, as the statement sees it: whether the fees are settled, whether a
// ABOUTME: credit balance clears, and whether a sponsor's unpaid share blocks the certificate.

import { abs, isNegative, isPositive, isZero, zero, type CurrencyCode, type Money } from '@/domain/money';

import type { ClearanceRule, ClearanceStatus } from './types';

/**
 * Reads a learner's clearance from their balance.
 *
 * **The rule.** The balance is what the statement's running account arrives at: the receivable net
 * of the credit held and of any refund paid out. A learner is `cleared` when the balance is zero or
 * in credit - **a credit balance clears**, because the school holds their money rather than the
 * other way round. A learner with an amount owed is `on_plan` when a payment plan is in force and
 * `in_arrears` otherwise.
 *
 * **A sponsor's unpaid share.** Under the default `sponsor_liability` policy a sponsor that has not
 * paid does not move the learner's balance (the learner owes only the residual the family invoice
 * carries), so a sponsor shortfall does **not** block clearance. A school whose agreement makes the
 * family guarantee the sponsored part sets `sponsorBlocksClearance`, and the shortfall is reported
 * as a reason instead.
 *
 * This is the statement-side view of the exit-clearance question (spec 05 §6 and §7). The document
 * P3-C02 issues - the clearance certificate - reads this rather than recomputing a balance, so the
 * two cannot disagree.
 */
export function clearanceStatus(
  balance: Money,
  currency: CurrencyCode,
  rule: ClearanceRule = {}
): ClearanceStatus {
  const outstanding = isPositive(balance) ? balance : zero(currency);
  const credit = isNegative(balance) ? abs(balance) : zero(currency);
  const reasons: string[] = [];

  if (isZero(balance)) {
    reasons.push('The account is settled: nothing is owed and nothing is held.');
    return { state: 'cleared', cleared: true, outstanding, credit, reasons };
  }
  if (isNegative(balance)) {
    reasons.push(`The learner holds a credit of ${credit.amount_minor} ${credit.currency}, so nothing is owed.`);
    return { state: 'cleared', cleared: true, outstanding, credit, reasons };
  }

  const shortfall = rule.sponsorShortfall;
  const sponsorBlocks =
    rule.sponsorBlocksClearance === true && shortfall !== undefined && isPositive(shortfall);
  if (sponsorBlocks) {
    reasons.push(
      `A sponsor's share of ${shortfall.amount_minor} ${shortfall.currency} is unpaid, and the agreement makes the family answer for it.`
    );
  } else if (shortfall !== undefined && isPositive(shortfall)) {
    reasons.push(
      `A sponsor's share of ${shortfall.amount_minor} ${shortfall.currency} is unpaid; under the sponsor-liability policy it does not block the learner.`
    );
  }

  if (rule.onPlan === true) {
    reasons.push('A payment plan is in force.');
    return { state: 'on_plan', cleared: false, outstanding, credit, reasons };
  }

  reasons.push('An amount is outstanding with no plan in force.');
  return { state: 'in_arrears', cleared: false, outstanding, credit, reasons };
}
