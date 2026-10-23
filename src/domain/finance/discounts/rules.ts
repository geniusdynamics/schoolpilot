// ABOUTME: The discount rules engine: a rule's basis, scope, period and precedence, the order two
// ABOUTME: rules apply in, the cap that stops a discount exceeding what it discounts, and the pure
// ABOUTME: application of every applicable rule to a learner's lines.

import { add, compare, isZero, multiplyRational, subtract, zero, type CurrencyCode, type Money, type RoundingMode } from '@/domain/money';

import { DiscountError } from './errors';
import type {
  AppliedBasisKind,
  AppliedDiscount,
  BillLineInput,
  DiscountBasis,
  DiscountPlanOptions,
  DiscountRule,
  FeeFundingSource,
  LearnerBillFacts,
  PlannedLine,
  SiblingPolicy,
  SiblingTier,
  StackingPolicy,
} from './types';

/** The fee item funding sources a discount touches when the caller names none: the family's own. */
export const DEFAULT_DISCOUNT_FUNDING_SOURCES: readonly FeeFundingSource[] = ['parent'];

/** The stacking policy an unstated option falls back to: every applicable rule, in precedence order. */
export const DEFAULT_STACKING: StackingPolicy = 'apply_all';

/** The rounding a percentage discount uses when the caller names none. */
export const DEFAULT_DISCOUNT_ROUNDING: RoundingMode = 'half_up';

/**
 * Reads a percentage as basis points, refusing one that is not a percentage of at most two decimals.
 *
 * A discount percentage is stored as a decimal number, and a decimal cannot be scaled exactly by a
 * float: `33.33 * 100` is `3333.0000000000005`. Reading it as basis points first keeps the money
 * arithmetic integral, the way the money module's allocator reads a decimal weight as text.
 */
export function percentBasisPoints(percent: number, subject: string): number {
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new DiscountError(
      'discount_percent_invalid',
      `${subject}: a percentage must be a number between 0 and 100; got ${String(percent)}`,
      subject
    );
  }
  const scaled = percent * 100;
  const rounded = Math.round(scaled);
  if (Math.abs(scaled - rounded) > 1e-6) {
    throw new DiscountError(
      'discount_percent_invalid',
      `${subject}: a percentage must have at most two decimals; got ${String(percent)}`,
      subject
    );
  }
  return rounded;
}

/** Asserts an amount is Money of the bill's currency, and positive unless zero is allowed. */
function assertAmount(value: unknown, currency: CurrencyCode, subject: string, allowZero = false): Money {
  if (
    value === null ||
    typeof value !== 'object' ||
    typeof (value as Money).amount_minor !== 'number' ||
    typeof (value as Money).currency !== 'string'
  ) {
    throw new DiscountError('discount_amount_invalid', `${subject}: an amount must be a Money value`, subject);
  }
  const amount = value as Money;
  if (!Number.isSafeInteger(amount.amount_minor)) {
    throw new DiscountError('discount_amount_invalid', `${subject}: an amount must be whole minor units`, subject);
  }
  if (amount.currency !== currency) {
    throw new DiscountError(
      'discount_amount_invalid',
      `${subject}: the amount is ${amount.currency}, but the bill is ${currency}`,
      subject
    );
  }
  if (!allowZero && amount.amount_minor <= 0) {
    throw new DiscountError('discount_amount_invalid', `${subject}: an amount must be positive`, subject);
  }
  return amount;
}

/** Validates one basis: a percentage at most 100, an absolute amount, and an optional cap. */
export function assertDiscountBasis(basis: DiscountBasis | undefined, currency: CurrencyCode, subject: string): DiscountBasis {
  if (basis === undefined || basis === null) {
    throw new DiscountError('discount_basis_missing', `${subject}: a discount rule needs a basis`, subject);
  }
  if (basis.kind === 'percent') {
    percentBasisPoints(basis.percent, subject);
    if (basis.cap !== undefined) assertAmount(basis.cap, currency, `${subject} cap`);
    return basis;
  }
  if (basis.kind === 'amount') {
    assertAmount(basis.amount, currency, `${subject} amount`);
    if (basis.cap !== undefined) assertAmount(basis.cap, currency, `${subject} cap`);
    return basis;
  }
  throw new DiscountError('discount_basis_missing', `${subject}: unknown discount basis`, subject);
}

/** Validates a sibling policy: at least one tier, each with a valid basis, and no two overlapping. */
export function assertSiblingPolicy(policy: SiblingPolicy, currency: CurrencyCode, subject: string): SiblingPolicy {
  if (!policy || !Array.isArray(policy.tiers) || policy.tiers.length === 0) {
    throw new DiscountError('sibling_policy_invalid', `${subject}: a sibling policy needs at least one tier`, subject);
  }
  const tiers = [...policy.tiers].sort((left, right) => left.fromRank - right.fromRank);
  for (const tier of tiers) {
    if (!Number.isInteger(tier.fromRank) || tier.fromRank < 1) {
      throw new DiscountError('sibling_policy_invalid', `${subject}: a tier must start at rank 1 or above`, subject);
    }
    if (tier.toRank !== undefined && (!Number.isInteger(tier.toRank) || tier.toRank < tier.fromRank)) {
      throw new DiscountError(
        'sibling_policy_invalid',
        `${subject}: a tier's last rank must be at or after its first`,
        subject
      );
    }
    assertDiscountBasis(tier.basis, currency, `${subject} tier ${tier.fromRank}`);
  }
  for (let index = 1; index < tiers.length; index += 1) {
    const previous = tiers[index - 1];
    // An open-ended tier already reaches every higher rank, so a tier after it can only overlap.
    if (previous.toRank === undefined || tiers[index].fromRank <= previous.toRank) {
      throw new DiscountError(
        'sibling_policy_invalid',
        `${subject}: the tier from rank ${tiers[index].fromRank} overlaps the one before it`,
        subject
      );
    }
  }
  return { ...policy, tiers: [...policy.tiers] };
}

/** Validates a rule: a name, a basis, a whole precedence, and a sibling policy where one is named. */
export function assertDiscountRule(rule: DiscountRule, currency: CurrencyCode): DiscountRule {
  if (!rule || typeof rule !== 'object') {
    throw new DiscountError('discount_rule_invalid', 'a discount rule must be an object');
  }
  const subject = rule.id ? `discount rule ${rule.id}` : 'a discount rule';
  if (typeof rule.id !== 'string' || rule.id.trim() === '') {
    throw new DiscountError('discount_rule_invalid', `${subject}: a rule needs an id`, subject);
  }
  if (typeof rule.name !== 'string' || rule.name.trim() === '') {
    throw new DiscountError('discount_rule_invalid', `${subject}: a rule needs a name`, subject);
  }
  if (!Number.isInteger(rule.precedence)) {
    throw new DiscountError(
      'discount_precedence_invalid',
      `${subject}: the precedence must be a whole number; got ${String(rule.precedence)}`,
      subject
    );
  }
  assertDiscountBasis(rule.basis, currency, subject);
  if (rule.kind === 'sibling' && rule.applicability?.siblingPolicy) {
    assertSiblingPolicy(rule.applicability.siblingPolicy, currency, subject);
  }
  if (rule.scope?.fundingSources) {
    for (const source of rule.scope.fundingSources) {
      if (typeof source !== 'string') {
        throw new DiscountError('discount_rule_invalid', `${subject}: a scope funding source must be a string`, subject);
      }
    }
  }
  return rule;
}

/** Validates a list of rules, refusing a duplicate id. */
export function assertDiscountRules(rules: readonly DiscountRule[], currency: CurrencyCode): readonly DiscountRule[] {
  const seen = new Set<string>();
  for (const rule of rules) {
    assertDiscountRule(rule, currency);
    if (seen.has(rule.id)) {
      throw new DiscountError('discount_rule_invalid', `the discount rules name ${rule.id} twice`, rule.id);
    }
    seen.add(rule.id);
  }
  return rules;
}

/** The tier a sibling rank falls in, or null when no tier covers it. */
export function siblingTierFor(policy: SiblingPolicy, rank: number): SiblingTier | null {
  for (const tier of policy.tiers) {
    const above = tier.toRank === undefined || rank <= tier.toRank;
    if (rank >= tier.fromRank && above) return tier;
  }
  return null;
}

/** The basis a sibling rank earns, or null when the policy discounts that rank not at all. */
export function siblingBasisForRank(policy: SiblingPolicy, rank: number): DiscountBasis | null {
  const tier = siblingTierFor(policy, rank);
  return tier === null ? null : tier.basis;
}

/**
 * The basis a rule applies to a learner with.
 *
 * A sibling rule's worth is its policy's tier for the learner's rank, not the rule's own headline
 * basis: the spec's "2nd child 5 %, 3rd+ 10 %" is one rule whose value depends on the rank. Every
 * other kind applies the basis the rule states.
 */
export function effectiveBasis(rule: DiscountRule, facts: LearnerBillFacts): DiscountBasis | null {
  if (rule.kind === 'sibling' && rule.applicability?.siblingPolicy && facts.siblingRank !== undefined) {
    return siblingBasisForRank(rule.applicability.siblingPolicy, facts.siblingRank);
  }
  return rule.basis;
}

/**
 * Whether a rule reaches a learner at all.
 *
 * A sibling rule needs a rank its policy covers, a staff-ward rule a staff guardian, and a bursary
 * or a scholarship the award the learner holds. Every other kind reaches every learner the period
 * and scope allow.
 */
export function ruleReachesLearner(rule: DiscountRule, facts: LearnerBillFacts): boolean {
  switch (rule.kind) {
    case 'sibling': {
      if (facts.siblingRank === undefined) return false;
      const policy = rule.applicability?.siblingPolicy;
      if (policy === undefined) return true;
      return siblingTierFor(policy, facts.siblingRank) !== null;
    }
    case 'staff_ward':
      return facts.isStaffWard === true;
    case 'bursary':
    case 'scholarship':
      return (facts.awardRuleIds ?? []).includes(rule.id);
    default:
      return true;
  }
}

/** Whether a rule applies on a day and in a period. An unstated bound is open. */
export function ruleInPeriod(
  rule: DiscountRule,
  period: { readonly periodId?: string; readonly on: string }
): boolean {
  const { startsOn, endsOn, periodIds } = rule.period ?? {};
  if (startsOn !== undefined && period.on < startsOn) return false;
  if (endsOn !== undefined && period.on > endsOn) return false;
  if (periodIds !== undefined && periodIds.length > 0) {
    if (period.periodId === undefined || !periodIds.includes(period.periodId)) return false;
  }
  return true;
}

/** Whether a rule's scope covers a line: its fee items, and the item's own funding source. */
export function ruleScopesLine(
  rule: DiscountRule,
  line: Pick<BillLineInput, 'feeItemId' | 'feeItemCode' | 'fundingSource'>
): boolean {
  const scope = rule.scope ?? {};
  const sources = scope.fundingSources ?? DEFAULT_DISCOUNT_FUNDING_SOURCES;
  if (!sources.includes(line.fundingSource)) return false;
  const ids = scope.feeItemIds ?? [];
  const codes = scope.feeItemCodes ?? [];
  if (ids.length === 0 && codes.length === 0) return true;
  if (ids.includes(line.feeItemId)) return true;
  if (line.feeItemCode !== undefined && codes.includes(line.feeItemCode)) return true;
  return false;
}

/** What a basis works out to on an amount, before the cap and the line's own remaining are applied. */
export interface DiscountComputation {
  readonly amount: Money;
  readonly basis: AppliedBasisKind;
  /** True when the basis' own cap limited the discount. */
  readonly capped: boolean;
}

/** The amount a basis works out to on a base amount, applying the basis' own cap. */
export function computeDiscount(
  basis: DiscountBasis,
  base: Money,
  currency: CurrencyCode,
  rounding: RoundingMode = DEFAULT_DISCOUNT_ROUNDING
): DiscountComputation {
  let raw: Money;
  let kind: AppliedBasisKind;
  if (basis.kind === 'percent') {
    const points = percentBasisPoints(basis.percent, 'a percentage discount');
    raw = multiplyRational(base, points, 10000, rounding);
    kind = 'percent';
  } else {
    raw = assertAmount(basis.amount, currency, 'a fixed discount');
    kind = 'amount';
  }
  if (basis.cap !== undefined) {
    const cap = assertAmount(basis.cap, currency, 'a discount cap');
    if (compare(raw, cap) > 0) {
      return { amount: cap, basis: 'cap', capped: true };
    }
  }
  return { amount: raw, basis: kind, capped: false };
}

/** A line of the engine's working set: the bill line plus the learner-payable split. */
export interface DiscountableLine {
  readonly feeItemId: string;
  readonly feeItemCode?: string;
  readonly feeItemName?: string;
  readonly description?: string;
  readonly fundingSource: FeeFundingSource;
  readonly gross: Money;
  /** What the family owes before discounts; zero when another source funds the item. */
  readonly learnerPayable: Money;
  /** What another source funds; zero when the family owes the item. */
  readonly externallyFunded: Money;
}

/** Splits a billed line into what the family owes and what another source funds. */
export function discountableLine(line: BillLineInput, currency: CurrencyCode): DiscountableLine {
  const gross = assertAmount(line.amount, currency, `the line ${line.feeItemId}`, true);
  const familyOwes = line.fundingSource === 'parent';
  return {
    feeItemId: line.feeItemId,
    ...(line.feeItemCode === undefined ? {} : { feeItemCode: line.feeItemCode }),
    ...(line.feeItemName === undefined ? {} : { feeItemName: line.feeItemName }),
    ...(line.description === undefined ? {} : { description: line.description }),
    fundingSource: line.fundingSource,
    gross,
    learnerPayable: familyOwes ? gross : zero(currency),
    externallyFunded: familyOwes ? zero(currency) : gross,
  };
}

/** The result of applying every applicable rule to a learner's lines. */
export interface DiscountApplication {
  readonly lines: readonly PlannedLine[];
  readonly applied: readonly AppliedDiscount[];
  readonly schoolDiscountTotal: Money;
  readonly awardTotal: Money;
  readonly trace: readonly string[];
}

/** Orders rules: the lowest precedence first, ties broken by id so the order is total. */
export function compareDiscountRules(left: DiscountRule, right: DiscountRule): number {
  if (left.precedence !== right.precedence) return left.precedence - right.precedence;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

/**
 * Applies every applicable rule to a learner's lines.
 *
 * The order is the rules' precedence, lowest first, ties broken by id. Each rule takes its basis of
 * the line's **remaining** amount, so two rules never discount the same shilling twice, and a
 * discount is capped at what is left: it can never exceed the amount it discounts. The stacking
 * policy says what a second rule on one line does - apply, take only the largest, or refuse - and
 * a rule marked `exclusive` refuses to share its line with any other, whatever the policy.
 *
 * A line whose fee item is funded by another source has nothing for the family to owe, so no
 * discount lands on it; that is how a discount composes with the fee item's own funding source.
 */
export function applyDiscounts(input: {
  readonly lines: readonly DiscountableLine[];
  readonly rules: readonly DiscountRule[];
  readonly facts: LearnerBillFacts;
  readonly period: { readonly periodId?: string; readonly on: string };
  readonly currency: CurrencyCode;
  readonly options?: DiscountPlanOptions;
}): DiscountApplication {
  const { currency } = input;
  const options = input.options ?? {};
  const stacking = options.stacking ?? DEFAULT_STACKING;
  const rounding = options.rounding ?? DEFAULT_DISCOUNT_ROUNDING;
  const rules = assertDiscountRules(input.rules, currency);

  const applicable = rules
    .filter((rule) => ruleReachesLearner(rule, input.facts))
    .filter((rule) => ruleInPeriod(rule, input.period))
    .sort(compareDiscountRules);

  const trace: string[] = [];
  const applied: AppliedDiscount[] = [];
  const lines: PlannedLine[] = [];

  for (const line of input.lines) {
    const scoped = applicable.filter((rule) => ruleScopesLine(rule, line));
    const discounts: AppliedDiscount[] = [];
    let remaining = line.learnerPayable;

    if (line.learnerPayable.amount_minor <= 0 && line.externallyFunded.amount_minor > 0) {
      trace.push(
        `${line.feeItemId} is funded by ${line.fundingSource}; nothing for the family to owe, so no discount lands on it`
      );
    }

    if (scoped.length > 0 && line.learnerPayable.amount_minor > 0) {
      const exclusives = scoped.filter((rule) => rule.exclusive === true);
      if (exclusives.length > 0 && scoped.length > 1) {
        throw new DiscountError(
          'discount_stack_refused',
          `${exclusives[0].name} is exclusive but ${scoped.length - 1} other rule(s) also reach ${line.feeItemId}`,
          exclusives[0].id
        );
      }
      if (stacking === 'refuse' && scoped.length > 1) {
        throw new DiscountError(
          'discount_stack_refused',
          `${scoped.length} discount rules reach ${line.feeItemId} and the stacking policy refuses a second: ` +
            scoped.map((rule) => rule.name).join(', '),
          scoped[1].id
        );
      }

      // `highest_only` weighs each rule against the whole line and keeps the largest; the other
      // policies apply in precedence order, each on what the ones before it left.
      const chosen =
        stacking === 'highest_only'
          ? highestOf(scoped, line.learnerPayable, currency, rounding, input.facts)
          : scoped;

      for (const rule of chosen) {
        const basis = effectiveBasis(rule, input.facts);
        if (basis === null) continue;
        const computation = computeDiscount(basis, remaining, currency, rounding);
        const cappedByRemaining = compare(computation.amount, remaining) > 0;
        const amount = cappedByRemaining ? remaining : computation.amount;
        const capped = computation.capped || cappedByRemaining;
        if (isZero(amount)) continue;
        const discount: AppliedDiscount = {
          ruleId: rule.id,
          name: rule.name,
          kind: rule.kind,
          reason: rule.reason,
          basis: computation.basis,
          fundingSource: rule.fundingSource,
          feeItemId: line.feeItemId,
          amount,
          capped,
        };
        discounts.push(discount);
        applied.push(discount);
        remaining = subtract(remaining, amount);
        trace.push(
          `${rule.name} takes ${amount.amount_minor} ${currency} off ${line.feeItemId}` +
            (capped ? ' (capped at what is left)' : '') +
            `; the reason on the bill is "${rule.reason}"`
        );
      }
    }

    lines.push({
      feeItemId: line.feeItemId,
      ...(line.feeItemCode === undefined ? {} : { feeItemCode: line.feeItemCode }),
      ...(line.feeItemName === undefined ? {} : { feeItemName: line.feeItemName }),
      ...(line.description === undefined ? {} : { description: line.description }),
      fundingSource: line.fundingSource,
      gross: line.gross,
      learnerPayable: line.learnerPayable,
      externallyFunded: line.externallyFunded,
      discounts,
      net: remaining,
    });
  }

  const schoolDiscountTotal = applied
    .filter((discount) => discount.fundingSource === 'school')
    .reduce((total, discount) => add(total, discount.amount), zero(currency));
  const awardTotal = subtract(
    applied.reduce((total, discount) => add(total, discount.amount), zero(currency)),
    schoolDiscountTotal
  );

  return { lines, applied, schoolDiscountTotal, awardTotal, trace };
}

/** Picks which candidates apply to one line under `highest_only`: the largest, ties by precedence. */
function highestOf(
  scoped: readonly DiscountRule[],
  base: Money,
  currency: CurrencyCode,
  rounding: RoundingMode,
  facts: LearnerBillFacts
): DiscountRule[] {
  let winner: { readonly rule: DiscountRule; readonly amount: Money } | null = null;
  for (const rule of scoped) {
    const basis = effectiveBasis(rule, facts);
    if (basis === null) continue;
    const amount = computeDiscount(basis, base, currency, rounding).amount;
    if (winner === null) {
      winner = { rule, amount };
      continue;
    }
    const order = compare(amount, winner.amount);
    if (order > 0 || (order === 0 && compareDiscountRules(rule, winner.rule) < 0)) {
      winner = { rule, amount };
    }
  }
  return winner === null ? [] : [winner.rule];
}
