// ABOUTME: The sibling, staff-ward, bursary and scholarship rules of spec 05 §2.3: the configurable
// ABOUTME: sibling policy and the ranking of a household's children, and the small builders that
// ABOUTME: make each kind of rule out of the same DiscountRule shape.

import { fromMinor, type CurrencyCode, type Money } from '@/domain/money';

import { assertDiscountBasis, assertSiblingPolicy, siblingBasisForRank, siblingTierFor } from './rules';
import type {
  DiscountBasis,
  DiscountRule,
  DiscountRuleKind,
  DiscountScope,
  SiblingPolicy,
  SiblingTier,
} from './types';

/**
 * The sibling rule of spec 05 §2.3: "2nd child 5 %, 3rd+ 10 % on tuition only".
 *
 * The spec writes its numbers as an example ("e.g."), so this is a **default**, not a constant of
 * the engine: a school states its own tiers and the engine reads them. The scope is tuition, which
 * the caller names by fee item code so the rule reads against a school's own vote heads.
 */
export const SPEC_SIBLING_POLICY: SiblingPolicy = {
  tiers: [
    { fromRank: 2, toRank: 2, basis: { kind: 'percent', percent: 5 } },
    { fromRank: 3, basis: { kind: 'percent', percent: 10 } },
  ],
  rankBy: 'provided',
};

/** A household's child, as the ranking needs it. */
export interface HouseholdChild {
  readonly learnerId: string;
  /** The day the child was admitted, ISO. The ranking's first key. */
  readonly admittedOn: string;
}

/** One child's rank: 1 is the eldest by the ranking rule. */
export interface RankedChild {
  readonly learnerId: string;
  readonly rank: number;
}

/**
 * Ranks a household's children by admission date, ties broken by learner id.
 *
 * The ranking is total and deterministic: the same household always ranks the same way, so the
 * sibling discount a family gets does not move when a query returns its rows in another order. A
 * school that ranks by date of birth or by hand states the rank itself (`rankBy: 'provided'`).
 */
export function rankSiblingsByAdmission(children: readonly HouseholdChild[]): readonly RankedChild[] {
  const ordered = [...children].sort((left, right) => {
    if (left.admittedOn !== right.admittedOn) return left.admittedOn < right.admittedOn ? -1 : 1;
    return left.learnerId < right.learnerId ? -1 : left.learnerId > right.learnerId ? 1 : 0;
  });
  return ordered.map((child, index) => ({ learnerId: child.learnerId, rank: index + 1 }));
}

/** The tier a rank falls in, or null when no tier covers it. */
export function siblingTierOf(policy: SiblingPolicy, rank: number): SiblingTier | null {
  return siblingTierFor(policy, rank);
}

/** The basis a sibling rank earns, or null when the policy discounts that rank not at all. */
export function siblingTierBasis(policy: SiblingPolicy, rank: number): DiscountBasis | null {
  return siblingBasisForRank(policy, rank);
}

/** What every rule builder needs; the rest of the shape has a stated default. */
export interface RuleDraft {
  readonly id: string;
  readonly name: string;
  readonly basis: DiscountBasis;
  readonly scope?: DiscountScope;
  readonly reason?: string;
  readonly precedence?: number;
  readonly fundingSource?: DiscountRule['fundingSource'];
  readonly period?: DiscountRule['period'];
  readonly exclusive?: boolean;
}

/** The precedence a kind of rule is applied at when the caller names none, lowest first. */
export const DEFAULT_PRECEDENCE: Readonly<Record<DiscountRuleKind, number>> = {
  scholarship: 10,
  bursary: 20,
  staff_ward: 30,
  sibling: 40,
  early_settlement: 50,
  pay_in_full: 60,
  other: 70,
};

/** The reason a rule reaches the bill with when the caller writes none. */
function reasonOf(draft: RuleDraft, fallback: string): string {
  const reason = draft.reason?.trim();
  return reason === undefined || reason === '' ? fallback : reason;
}

/** A rule scoped to a set of fee item codes. */
function scoped(scope: DiscountScope | undefined, fallbackCodes: readonly string[] | undefined): DiscountScope {
  if (scope !== undefined) return scope;
  return fallbackCodes === undefined || fallbackCodes.length === 0
    ? {}
    : { feeItemCodes: [...fallbackCodes] };
}

/**
 * A sibling rule: the policy's tiers decide what a rank earns.
 *
 * `feeItemCodes` defaults to `['TUITION']`, the scope the spec's example names; a school whose
 * tuition vote head is coded differently names its own.
 */
export function siblingRule(
  draft: RuleDraft & { readonly policy?: SiblingPolicy; readonly feeItemCodes?: readonly string[] }
): DiscountRule {
  const policy = draft.policy ?? SPEC_SIBLING_POLICY;
  return {
    id: draft.id,
    name: draft.name,
    kind: 'sibling',
    basis: draft.basis,
    scope: scoped(draft.scope, draft.feeItemCodes ?? ['TUITION']),
    period: draft.period ?? {},
    reason: reasonOf(draft, `${draft.name}: a sibling discount on tuition`),
    fundingSource: draft.fundingSource ?? 'school',
    precedence: draft.precedence ?? DEFAULT_PRECEDENCE.sibling,
    ...(draft.exclusive === undefined ? {} : { exclusive: draft.exclusive }),
    applicability: { siblingPolicy: policy },
  };
}

/** A staff-ward rule: it reaches a learner with a guardian on the staff. */
export function staffWardRule(
  draft: RuleDraft & { readonly feeItemCodes?: readonly string[] }
): DiscountRule {
  return {
    id: draft.id,
    name: draft.name,
    kind: 'staff_ward',
    basis: draft.basis,
    scope: scoped(draft.scope, draft.feeItemCodes),
    period: draft.period ?? {},
    reason: reasonOf(draft, `${draft.name}: a member of staff's child`),
    fundingSource: draft.fundingSource ?? 'school',
    precedence: draft.precedence ?? DEFAULT_PRECEDENCE.staff_ward,
    ...(draft.exclusive === undefined ? {} : { exclusive: draft.exclusive }),
  };
}

/** A bursary rule: it reaches the learners holding the award, and may be capped. */
export function bursaryRule(
  draft: RuleDraft & { readonly feeItemCodes?: readonly string[] }
): DiscountRule {
  return {
    id: draft.id,
    name: draft.name,
    kind: 'bursary',
    basis: draft.basis,
    scope: scoped(draft.scope, draft.feeItemCodes),
    period: draft.period ?? {},
    reason: reasonOf(draft, `${draft.name}: a bursary awarded to this learner`),
    fundingSource: draft.fundingSource ?? 'school',
    precedence: draft.precedence ?? DEFAULT_PRECEDENCE.bursary,
    ...(draft.exclusive === undefined ? {} : { exclusive: draft.exclusive }),
  };
}

/** A scholarship rule: a full or partial award, reached the way a bursary is. */
export function scholarshipRule(
  draft: RuleDraft & { readonly feeItemCodes?: readonly string[] }
): DiscountRule {
  return {
    id: draft.id,
    name: draft.name,
    kind: 'scholarship',
    basis: draft.basis,
    scope: scoped(draft.scope, draft.feeItemCodes),
    period: draft.period ?? {},
    reason: reasonOf(draft, `${draft.name}: a scholarship awarded to this learner`),
    fundingSource: draft.fundingSource ?? 'school',
    precedence: draft.precedence ?? DEFAULT_PRECEDENCE.scholarship,
    ...(draft.exclusive === undefined ? {} : { exclusive: draft.exclusive }),
  };
}

/** A full scholarship, as a basis: every shilling of the items it scopes. */
export function fullScholarshipBasis(): DiscountBasis {
  return { kind: 'percent', percent: 100 };
}

/** A capped bursary, as a basis: a percentage of the items, up to a ceiling. */
export function cappedBursaryBasis(percent: number, capMinor: number, currency: CurrencyCode): DiscountBasis {
  const basis: DiscountBasis = { kind: 'percent', percent, cap: fromMinor(capMinor, currency) };
  assertDiscountBasis(basis, currency, 'a capped bursary');
  return basis;
}

/** A fixed bursary, as a basis: an absolute amount of the items it scopes. */
export function fixedBursaryBasis(amount: Money): DiscountBasis {
  return { kind: 'amount', amount };
}

/** Validates a policy and returns it, so a caller can check its own tiers before it bills. */
export function validateSiblingPolicy(policy: SiblingPolicy, currency: CurrencyCode, subject: string): SiblingPolicy {
  return assertSiblingPolicy(policy, currency, subject);
}
