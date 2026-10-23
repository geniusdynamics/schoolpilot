// ABOUTME: The seam between the canonical discount_rule and sponsorship rows and the discount
// ABOUTME: engine: decoding a stored row into a rule the engine reads, and encoding a rule back into
// ABOUTME: a row the repository writes. The canonical row stays the record; this is a view of it.

import type { CreateInput, RepositoryRow } from '@/data/repository';
import type { Id } from '@/domain/ids';
import { fromMajor, fromMinor, toDecimalString, type CurrencyCode, type Money } from '@/domain/money';
import { DISCOUNT_FUNDING_SOURCES, DISCOUNT_KINDS, FEE_FUNDING_SOURCES } from '@/domain/schema';

import { DiscountError } from './errors';
import { DEFAULT_PRECEDENCE } from './siblings';
import type {
  DiscountBasis,
  DiscountFundingSource,
  DiscountRule,
  DiscountRuleKind,
  DiscountScope,
  FeeFundingSource,
  SiblingPolicy,
  SiblingTier,
  SponsorshipAgreement,
} from './types';

/**
 * The keys the engine reads out of the canonical `discount_rule.conditions` object.
 *
 * The canonical entity carries a name, a kind, a value, the fee items and a funding source; it
 * carries **no period, no cap, no precedence and no sibling tiers**, and its `conditions` column is
 * a JSON object the schema already provides for exactly this. The fixture the repository's own
 * tests seed writes `{ sibling_rank: 2 }`, so the engine reads its extra facts from the same place
 * rather than adding columns the canonical registry would have to be widened for. Every key is
 * optional: a rule that names none is a plain percentage or fixed discount on its fee items.
 */
export const CONDITION_KEYS = {
  /** The engine's rule kind: `sibling`, `staff_ward`, `bursary`, `scholarship`, ... */
  kind: 'discount_kind',
  /** A cap on the discount, in minor units of the institution's currency. */
  capMinor: 'cap_minor',
  startsOn: 'starts_on',
  endsOn: 'ends_on',
  periodIds: 'period_ids',
  precedence: 'precedence',
  exclusive: 'exclusive',
  reason: 'reason',
  /** The sibling tiers, as `{ from_rank, to_rank?, percent? , amount_minor? }`. */
  siblingTiers: 'sibling_tiers',
  siblingRankBy: 'sibling_rank_by',
  /** The key the canonical fixture already uses; its presence makes a rule a sibling rule. */
  siblingRank: 'sibling_rank',
  staffWard: 'staff_ward',
  feeItemCodes: 'fee_item_codes',
  scopeFundingSources: 'scope_funding_sources',
} as const;

/** What decoding a canonical row needs: the currency its fixed amount is counted in. */
export interface CanonicalDiscountContext {
  readonly currency: CurrencyCode;
}

const RULE_KINDS: readonly DiscountRuleKind[] = [
  'sibling',
  'staff_ward',
  'bursary',
  'scholarship',
  'early_settlement',
  'pay_in_full',
  'other',
];

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const strings = value.filter((entry): entry is string => typeof entry === 'string');
  return strings.length === 0 ? null : strings;
}

function readKind(value: unknown): DiscountRuleKind | null {
  const text = readString(value);
  return text !== null && (RULE_KINDS as readonly string[]).includes(text) ? (text as DiscountRuleKind) : null;
}

/** The rule kind a canonical row is, read from its conditions, then inferred from its own keys. */
export function ruleKindOfRow(row: RepositoryRow<'discount_rule'>): DiscountRuleKind {
  const conditions = (row.conditions ?? {}) as Record<string, unknown>;
  const named = readKind(conditions[CONDITION_KEYS.kind]);
  if (named !== null) return named;
  if (conditions[CONDITION_KEYS.siblingRank] !== undefined || conditions[CONDITION_KEYS.siblingTiers] !== undefined) {
    return 'sibling';
  }
  if (readBoolean(conditions[CONDITION_KEYS.staffWard]) === true) return 'staff_ward';
  return 'other';
}

/** The basis a canonical row states, with the cap its conditions may carry. */
function basisOfRow(row: RepositoryRow<'discount_rule'>, currency: CurrencyCode): DiscountBasis {
  const conditions = (row.conditions ?? {}) as Record<string, unknown>;
  const capMinor = readNumber(conditions[CONDITION_KEYS.capMinor]);
  const cap: { cap?: Money } =
    capMinor === null || !Number.isSafeInteger(capMinor) ? {} : { cap: fromMinor(capMinor, currency) };

  if (row.kind === 'percent') {
    return { kind: 'percent', percent: row.value, ...cap };
  }
  if (row.kind === 'fixed') {
    try {
      return { kind: 'amount', amount: fromMajor(String(row.value), currency), ...cap };
    } catch {
      throw new DiscountError(
        'discount_amount_invalid',
        `the fixed discount "${row.name}" holds ${String(row.value)}, which is not a whole ${currency} minor unit`,
        row.id
      );
    }
  }
  throw new DiscountError('discount_basis_missing', `the discount rule "${row.name}" has an unknown kind`, row.id);
}

/** The sibling tiers a canonical row carries, or the spec's example when it names none. */
function siblingPolicyOfRow(row: RepositoryRow<'discount_rule'>, currency: CurrencyCode): SiblingPolicy {
  const conditions = (row.conditions ?? {}) as Record<string, unknown>;
  const rankBy = readString(conditions[CONDITION_KEYS.siblingRankBy]);
  const rankByValue: SiblingPolicy['rankBy'] = rankBy === 'admission_date' ? 'admission_date' : 'provided';
  const raw = conditions[CONDITION_KEYS.siblingTiers];
  if (!Array.isArray(raw) || raw.length === 0) {
    return { tiers: [], rankBy: rankByValue };
  }
  const tiers: SiblingTier[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue;
    const tier = entry as Record<string, unknown>;
    const fromRank = readNumber(tier.from_rank);
    if (fromRank === null || !Number.isInteger(fromRank)) continue;
    const toRank = readNumber(tier.to_rank);
    const percent = readNumber(tier.percent);
    const amountMinor = readNumber(tier.amount_minor);
    const basis: DiscountBasis | null =
      percent !== null
        ? { kind: 'percent', percent }
        : amountMinor !== null && Number.isSafeInteger(amountMinor)
          ? { kind: 'amount', amount: fromMinor(amountMinor, currency) }
          : null;
    if (basis === null) continue;
    tiers.push({
      fromRank,
      ...(toRank === null || !Number.isInteger(toRank) ? {} : { toRank }),
      basis,
    });
  }
  return { tiers, rankBy: rankByValue };
}

/** The reason a rule reaches the bill with, from its conditions or a sentence built from its kind. */
function reasonOfRow(row: RepositoryRow<'discount_rule'>, kind: DiscountRuleKind): string {
  const conditions = (row.conditions ?? {}) as Record<string, unknown>;
  const named = readString(conditions[CONDITION_KEYS.reason]);
  if (named !== null) return named;
  switch (kind) {
    case 'sibling':
      return `${row.name}: a sibling discount`;
    case 'staff_ward':
      return `${row.name}: a member of staff's child`;
    case 'bursary':
      return `${row.name}: a bursary awarded to this learner`;
    case 'scholarship':
      return `${row.name}: a scholarship awarded to this learner`;
    default:
      return row.name;
  }
}

/** The scope a canonical row states: its fee items, the codes its conditions name, its sources. */
function scopeOfRow(row: RepositoryRow<'discount_rule'>): DiscountScope {
  const conditions = (row.conditions ?? {}) as Record<string, unknown>;
  const codes = readStringArray(conditions[CONDITION_KEYS.feeItemCodes]);
  const sources = readStringArray(conditions[CONDITION_KEYS.scopeFundingSources])?.filter(
    (source): source is FeeFundingSource => (FEE_FUNDING_SOURCES as readonly string[]).includes(source)
  );
  return {
    ...(row.fee_item_ids.length === 0 ? {} : { feeItemIds: [...row.fee_item_ids] }),
    ...(codes === null ? {} : { feeItemCodes: codes }),
    ...(sources === undefined || sources.length === 0 ? {} : { fundingSources: sources }),
  };
}

/**
 * Reads a canonical `discount_rule` row as the rule the engine applies.
 *
 * The canonical row is the record; this is a view of it. A rule whose `conditions` name no kind is
 * a plain discount on the fee items the row lists, and a row carrying `sibling_rank` or
 * `sibling_tiers` is the sibling rule the repository's own fixture already writes.
 */
export function discountRuleFromRow(
  row: RepositoryRow<'discount_rule'>,
  context: CanonicalDiscountContext
): DiscountRule {
  const conditions = (row.conditions ?? {}) as Record<string, unknown>;
  const kind = ruleKindOfRow(row);
  const precedence = readNumber(conditions[CONDITION_KEYS.precedence]);
  const exclusive = readBoolean(conditions[CONDITION_KEYS.exclusive]);
  const startsOn = readString(conditions[CONDITION_KEYS.startsOn]);
  const endsOn = readString(conditions[CONDITION_KEYS.endsOn]);
  const periodIds = readStringArray(conditions[CONDITION_KEYS.periodIds]);
  const policy = kind === 'sibling' ? siblingPolicyOfRow(row, context.currency) : null;

  return {
    id: row.id,
    name: row.name,
    kind,
    basis: basisOfRow(row, context.currency),
    scope: scopeOfRow(row),
    period: {
      ...(startsOn === null ? {} : { startsOn }),
      ...(endsOn === null ? {} : { endsOn }),
      ...(periodIds === null ? {} : { periodIds }),
    },
    reason: reasonOfRow(row, kind),
    fundingSource: row.funding_source,
    precedence: precedence === null ? DEFAULT_PRECEDENCE[kind] : precedence,
    ...(exclusive === null ? {} : { exclusive }),
    ...(policy === null || policy.tiers.length === 0 ? {} : { applicability: { siblingPolicy: policy } }),
  };
}

/** Reads a canonical `sponsorship` row as the agreement the split engine reads. */
export function sponsorshipFromRow(row: RepositoryRow<'sponsorship'>): SponsorshipAgreement {
  return {
    id: row.id,
    sponsorName: row.sponsor_name,
    fundingSource: row.funding_source,
    ...(row.fee_item_ids.length === 0 ? {} : { feeItemIds: [...row.fee_item_ids] }),
    ...(row.coverage_percent === undefined ? {} : { sharePercent: row.coverage_percent }),
    ...(row.starts_on === undefined ? {} : { startsOn: row.starts_on }),
    ...(row.ends_on === undefined ? {} : { endsOn: row.ends_on }),
  };
}

/** The canonical `discount_rule` row a rule is written as. */
export function discountRuleToRow(
  rule: DiscountRule,
  institutionId: Id<'institution'>
): CreateInput<'discount_rule'> {
  const kind = rule.basis.kind === 'percent' ? 'percent' : 'fixed';
  // The canonical column is a plain number in major units (the schema predates the money module),
  // so a fixed amount is written as its exact decimal text, never as a computed float.
  const value =
    rule.basis.kind === 'percent' ? rule.basis.percent : Number(toDecimalString(rule.basis.amount));
  const conditions: NonNullable<CreateInput<'discount_rule'>['conditions']> = {
    [CONDITION_KEYS.kind]: rule.kind,
    [CONDITION_KEYS.precedence]: rule.precedence,
    [CONDITION_KEYS.reason]: rule.reason,
  };
  if (rule.basis.cap !== undefined) {
    conditions[CONDITION_KEYS.capMinor] = rule.basis.cap.amount_minor;
  }
  if (rule.period.startsOn !== undefined) conditions[CONDITION_KEYS.startsOn] = rule.period.startsOn;
  if (rule.period.endsOn !== undefined) conditions[CONDITION_KEYS.endsOn] = rule.period.endsOn;
  if (rule.period.periodIds !== undefined) conditions[CONDITION_KEYS.periodIds] = [...rule.period.periodIds];
  if (rule.exclusive === true) conditions[CONDITION_KEYS.exclusive] = true;
  if (rule.scope.feeItemCodes !== undefined) conditions[CONDITION_KEYS.feeItemCodes] = [...rule.scope.feeItemCodes];
  if (rule.scope.fundingSources !== undefined) {
    conditions[CONDITION_KEYS.scopeFundingSources] = [...rule.scope.fundingSources];
  }
  const policy = rule.applicability?.siblingPolicy;
  if (policy !== undefined) {
    conditions[CONDITION_KEYS.siblingRankBy] = policy.rankBy;
    conditions[CONDITION_KEYS.siblingTiers] = policy.tiers.map((tier) => ({
      from_rank: tier.fromRank,
      ...(tier.toRank === undefined ? {} : { to_rank: tier.toRank }),
      ...(tier.basis.kind === 'percent'
        ? { percent: tier.basis.percent }
        : { amount_minor: tier.basis.amount.amount_minor }),
    }));
  }
  return {
    institution_id: institutionId,
    name: rule.name,
    kind,
    value,
    fee_item_ids: [...(rule.scope.feeItemIds ?? [])],
    conditions,
    funding_source: rule.fundingSource,
  };
}

/** The canonical `sponsorship` row an agreement is written as. */
export function sponsorshipToRow(
  agreement: SponsorshipAgreement,
  institutionId: Id<'institution'>,
  name: string
): CreateInput<'sponsorship'> {
  return {
    institution_id: institutionId,
    name,
    sponsor_name: agreement.sponsorName,
    funding_source: agreement.fundingSource,
    fee_item_ids: [...(agreement.feeItemIds ?? [])],
    ...(agreement.sharePercent === undefined ? {} : { coverage_percent: agreement.sharePercent }),
    ...(agreement.startsOn === undefined ? {} : { starts_on: agreement.startsOn }),
    ...(agreement.endsOn === undefined ? {} : { ends_on: agreement.endsOn }),
  };
}

/** The funding sources a canonical rule may name, for a caller that validates one. */
export const CANONICAL_DISCOUNT_FUNDING_SOURCES = DISCOUNT_FUNDING_SOURCES;
/** The kinds a canonical rule may carry. */
export const CANONICAL_DISCOUNT_KINDS = DISCOUNT_KINDS;
/** The funding source of a canonical discount rule. */
export type CanonicalDiscountFundingSource = DiscountFundingSource;
