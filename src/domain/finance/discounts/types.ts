// ABOUTME: The vocabulary of the discount module: the discount rules and their basis, scope, period
// ABOUTME: and reason, the split-billing model of a bill across the family and its sponsors, the
// ABOUTME: budget a programme is tracked against, and the plan a billing run reads.

import type { RepositoryRow } from '@/data/repository';
import type { CurrencyCode, Money } from '@/domain/money';
import type {
  DISCOUNT_FUNDING_SOURCES,
  DISCOUNT_KINDS,
  FEE_FUNDING_SOURCES,
} from '@/domain/schema';

/** Who bears the cost of a discount (spec 05 §2.3): `school` forgoes revenue, anyone else pays. */
export type DiscountFundingSource = (typeof DISCOUNT_FUNDING_SOURCES)[number];

/** The canonical `discount_rule.kind`: a percentage, or a fixed amount. */
export type CanonicalDiscountKind = (typeof DISCOUNT_KINDS)[number];

/** Who funds a fee item (spec 05 §2.1): the family, a bursary, a sponsor, the government. */
export type FeeFundingSource = (typeof FEE_FUNDING_SOURCES)[number];

/**
 * What a discount is worth.
 *
 * `percent` scales the scoped amount through the money module's rational multiply with an explicit
 * rounding mode; `amount` is an absolute figure. Either may carry a `cap`, the ceiling the spec's
 * bursaries ask for ("a percentage or an amount, possibly capped").
 */
export type DiscountBasis =
  | {
      readonly kind: 'percent';
      /** A percentage of the scoped amount, above zero and at most 100. */
      readonly percent: number;
      /** The most the discount may be, whatever the percentage works out to. */
      readonly cap?: Money;
    }
  | {
      readonly kind: 'amount';
      /** The absolute amount of the discount. */
      readonly amount: Money;
      /** The most the discount may be, whatever the amount says. */
      readonly cap?: Money;
    };

/** How a rule's basis is reported once it has been applied. `cap` marks the cap doing the work. */
export type AppliedBasisKind = 'percent' | 'amount' | 'cap';

/**
 * Which fee items a discount applies to, and which of the item's own funding sources it may touch.
 *
 * A discount reduces what the **learner owes**. A fee item whose own `funding_source` is not
 * `parent` is funded by that source (capitation, a bursary, a sponsor) and the family owes nothing
 * on it, so a discount scoped to it discounts nothing. That is the composition with the fee item's
 * funding source, and it is the default here: only `parent`-funded items are discounted unless the
 * caller names another source.
 */
export interface DiscountScope {
  /** The fee items the discount names; absent or empty means every item in scope. */
  readonly feeItemIds?: readonly string[];
  /** The fee item codes the discount names, for a rule written against codes rather than ids. */
  readonly feeItemCodes?: readonly string[];
  /** The item funding sources the discount may touch. Defaults to `['parent']`. */
  readonly fundingSources?: readonly FeeFundingSource[];
}

/** The window a rule applies in. The canonical entity carries none, so the caller states it. */
export interface DiscountPeriod {
  /** The first day it applies, inclusive (ISO `YYYY-MM-DD`). */
  readonly startsOn?: string;
  /** The last day it applies, inclusive (ISO `YYYY-MM-DD`). */
  readonly endsOn?: string;
  /** The academic periods it applies to, when the caller scopes it by period rather than by day. */
  readonly periodIds?: readonly string[];
}

/** The kinds of discount rule the module names, so a bill can say why a line is reduced. */
export type DiscountRuleKind =
  | 'sibling'
  | 'staff_ward'
  | 'bursary'
  | 'scholarship'
  | 'early_settlement'
  | 'pay_in_full'
  | 'other';

/** One tier of a sibling policy: the children of a rank band it applies to. */
export interface SiblingTier {
  /** The first rank it covers, 1 being the eldest. */
  readonly fromRank: number;
  /** The last rank it covers, inclusive; absent means "and every higher rank". */
  readonly toRank?: number;
  readonly basis: DiscountBasis;
}

/**
 * The sibling rule (spec 05 §2.3: "sibling (e.g. 2nd child 5 %, 3rd+ 10 % on tuition only)").
 *
 * The spec gives its numbers as an example, so they are a policy the caller supplies rather than a
 * constant: `SPEC_SIBLING_POLICY` is the spec's own example, and a school states its own.
 */
export interface SiblingPolicy {
  readonly tiers: readonly SiblingTier[];
  /** How the household's children are ranked. `provided` takes the rank the caller states. */
  readonly rankBy: 'provided' | 'admission_date';
}

/** Which learners a rule reaches. A rule that reaches nobody applies to nobody. */
export interface DiscountApplicability {
  /** A sibling rule reads the learner's rank and the policy's tiers. */
  readonly siblingPolicy?: SiblingPolicy;
  /** A rule granted to a named learner, as an award (a bursary, a scholarship). */
  readonly awardRuleIds?: readonly string[];
}

/**
 * One discount rule, as the engine reads it.
 *
 * This is a **decoded view** of the canonical `discount_rule` entity, not a second model: the
 * entity holds the name, the kind, the value, the fee items, the funding source and a `conditions`
 * JSON object, and `discountRuleFromRow` reads the basis, the scope, the period, the precedence and
 * the sibling policy out of it. The canonical row stays the record.
 */
export interface DiscountRule {
  readonly id: string;
  readonly name: string;
  readonly kind: DiscountRuleKind;
  readonly basis: DiscountBasis;
  readonly scope: DiscountScope;
  readonly period: DiscountPeriod;
  /** Why it applies, as the reason that reaches the bill's invoice line. */
  readonly reason: string;
  /** Who bears the cost. `school` is contra-revenue; anyone else becomes a sponsor share. */
  readonly fundingSource: DiscountFundingSource;
  /** The order the rules are applied in, lowest first. Ties break on the rule id. */
  readonly precedence: number;
  /** A rule that refuses to share a line with any other rule. */
  readonly exclusive?: boolean;
  readonly applicability?: DiscountApplicability;
}

/** What the engine knows about the learner a bill is planned for. */
export interface LearnerBillFacts {
  /** Whether a guardian of the learner is a member of staff (spec 05 §2.3, "staff child"). */
  readonly isStaffWard: boolean;
  /** The learner's rank among the household's children, 1 being the eldest. */
  readonly siblingRank?: number;
  /** The award rules the learner holds, by rule id (a bursary or a scholarship granted to them). */
  readonly awardRuleIds?: readonly string[];
}

/** One line of the bill a plan is built from: a fee item and what it costs. */
export interface BillLineInput {
  readonly feeItemId: string;
  readonly feeItemCode?: string;
  readonly feeItemName?: string;
  /** The fee item's own funding source (spec 05 §2.1). */
  readonly fundingSource: FeeFundingSource;
  /** The amount billed. Positive; a zero line is carried through with no discount. */
  readonly amount: Money;
  readonly description?: string;
}

/** A sponsor's agreement to pay a part of a learner's bill. */
export interface SponsorshipAgreement {
  readonly id: string;
  readonly sponsorName: string;
  readonly fundingSource: DiscountFundingSource;
  /** The fee items it covers; absent or empty means the whole bill. */
  readonly feeItemIds?: readonly string[];
  /** The share of the bill it covers, as a percentage of at most two decimals. */
  readonly sharePercent?: number;
  /** The fixed amount it covers, when it agreed an amount rather than a share. */
  readonly agreedAmount?: Money;
  readonly startsOn?: string;
  readonly endsOn?: string;
}

/** One discount the engine applied, and why. This is what reaches the invoice line. */
export interface AppliedDiscount {
  readonly ruleId: string;
  readonly name: string;
  readonly kind: DiscountRuleKind;
  /** The reason that reaches the bill (spec 05 §2.3: balances are always explainable). */
  readonly reason: string;
  readonly basis: AppliedBasisKind;
  readonly fundingSource: DiscountFundingSource;
  /** The fee item the discount landed on. */
  readonly feeItemId: string;
  /** The amount taken off, never more than the line's remaining amount. */
  readonly amount: Money;
  /** True when the cap, or the line's own remaining amount, limited the discount. */
  readonly capped: boolean;
}

/** One line of the planned bill. */
export interface PlannedLine {
  readonly feeItemId: string;
  readonly feeItemCode?: string;
  readonly feeItemName?: string;
  readonly description?: string;
  readonly fundingSource: FeeFundingSource;
  /** What the schedule billed. */
  readonly gross: Money;
  /** What the family owes for the line before discounts; zero for an externally funded item. */
  readonly learnerPayable: Money;
  /** What another source pays for the line, when its funding source is not `parent`. */
  readonly externallyFunded: Money;
  readonly discounts: readonly AppliedDiscount[];
  /** What the family owes after the school-funded discounts. */
  readonly net: Money;
}

/** How a payer's share was arrived at. */
export type SplitShareBasis = 'residual' | 'share' | 'agreed_amount';

/** One payer's part of the bill. */
export interface SplitShare {
  readonly payerId: string;
  readonly kind: 'family' | 'sponsor';
  readonly name: string;
  readonly fundingSource?: DiscountFundingSource;
  readonly amount: Money;
  readonly basis: SplitShareBasis;
  /** Where a sponsor share came from, when it came from a sponsorship or an award. */
  readonly source?: { readonly kind: 'sponsorship' | 'award'; readonly id: string };
}

/** The bill split across its payers. The parts always sum to the total. */
export interface BillSplit {
  readonly total: Money;
  readonly shares: readonly SplitShare[];
  /** The invariant, checked rather than assumed: the shares sum to the total exactly. */
  readonly exact: boolean;
}

/** A sponsor's part of a bill, with how it reaches the ledger. */
export interface SponsorShare extends SplitShare {
  readonly kind: 'sponsor';
  /** The document the school issues the sponsor, separate from the learner's invoice. */
  readonly invoice: 'sponsor_invoice';
  /**
   * How it posts: the sponsored part is the sponsor's receivable, and it clears when the sponsor's
   * money arrives. Nothing posts as revenue on the learner's behalf until then.
   */
  readonly posting: 'sponsor_receivable_on_invoice_cleared_on_receipt';
  /** The sponsorship or award the share came from. */
  readonly source: { readonly kind: 'sponsorship' | 'award'; readonly id: string };
}

/** What happens when a sponsor underpays or does not pay. */
export type SponsorRiskPolicy = 'sponsor_liability' | 'family_liability';

/** How the engine treats a second discount on one line. */
export type StackingPolicy = 'apply_all' | 'highest_only' | 'refuse';

/** The options a plan is built with. */
export interface DiscountPlanOptions {
  /** How two rules on one line interact. Defaults to `apply_all` in precedence order. */
  readonly stacking?: StackingPolicy;
  /** Who carries a sponsor's shortfall. Defaults to `sponsor_liability`. */
  readonly sponsorRisk?: SponsorRiskPolicy;
  /** How a percentage is rounded to a whole minor unit. Defaults to `half_up`. */
  readonly rounding?: 'half_up' | 'half_down' | 'half_even' | 'up' | 'down';
  /** The overspend policy of a budget. Defaults to `warn`: allowed, and the overspend recorded. */
  readonly budgetOverspend?: BudgetOverspendPolicy;
}

/** What a discount programme is tracked against. */
export interface DiscountBudget {
  readonly programmeId: string;
  readonly name: string;
  /** The period the budget is for, when the caller scopes it. */
  readonly periodId?: string;
  readonly fundingSource: DiscountFundingSource;
  /** The stored budget figure the caller supplies. The platform models no budget entity. */
  readonly amount: Money;
  /** What is already committed against it in the period, supplied by the caller. */
  readonly committed: Money;
}

/** Whether a bill that would exceed a budget is refused, warned about, or allowed. */
export type BudgetOverspendPolicy = 'allow' | 'warn' | 'refuse';

/** A budget, and where the bill leaves it. */
export interface BudgetStatus {
  readonly programmeId: string;
  readonly name: string;
  readonly currency: CurrencyCode;
  readonly budget: Money;
  readonly committedBefore: Money;
  /** What this bill would add. */
  readonly proposed: Money;
  readonly committedAfter: Money;
  readonly remaining: Money;
  /** The amount over the budget; zero when within it. */
  readonly overspend: Money;
  readonly withinBudget: boolean;
  readonly policy: BudgetOverspendPolicy;
  /** Where the budget figure came from, so the screen can say it. */
  readonly source: string;
}

/** The plan a billing run reads for one learner and one period. */
export interface LearnerBillPlan {
  readonly learnerId: string;
  readonly institutionId: string;
  readonly currency: CurrencyCode;
  readonly period: { readonly periodId?: string; readonly on: string };
  readonly lines: readonly PlannedLine[];
  /** The bill as the schedule priced it. */
  readonly grossBill: Money;
  /** What another funding source pays for the lines it funds. */
  readonly externallyFunded: Money;
  /** The school-funded discounts: the contra-revenue the school forgoes. */
  readonly schoolDiscountTotal: Money;
  /** The externally funded awards: the part a third party bears. */
  readonly awardTotal: Money;
  /** The base of the split: the learner-payable amount after the school-funded discounts. */
  readonly learnerBill: Money;
  readonly split: BillSplit;
  readonly familyShare: Money;
  readonly sponsorShares: readonly SponsorShare[];
  /** Who carries a sponsor's shortfall, as the plan's options state it. */
  readonly sponsorRisk: SponsorRiskPolicy;
  readonly budgets: readonly BudgetStatus[];
  /** Every decision, in the order it was made, as a bursar reads it back to a parent. */
  readonly trace: readonly string[];
}

/** The input the pure planning seam takes: a learner, a period, and what applies to them. */
export interface LearnerBillInput {
  readonly learnerId: string;
  readonly institutionId: string;
  readonly currency: CurrencyCode;
  readonly period: { readonly periodId?: string; readonly on: string };
  readonly lines: readonly BillLineInput[];
  readonly rules: readonly DiscountRule[];
  readonly sponsorships?: readonly SponsorshipAgreement[];
  readonly facts: LearnerBillFacts;
  readonly budgets?: readonly DiscountBudget[];
  /** The family payer the residual falls to. */
  readonly family?: { readonly payerId?: string; readonly name?: string };
  readonly options?: DiscountPlanOptions;
}

/** The write surface the discount service needs. The canonical repository satisfies it. */
export interface DiscountStore {
  get<E extends import('@/domain/schema').EntityName>(
    entity: E,
    id: import('@/domain/ids').Id<E>,
    options?: { readonly includeDeleted?: boolean }
  ): Promise<RepositoryRow<E> | null>;
  list<E extends import('@/domain/schema').EntityName>(
    entity: E,
    query?: import('@/data/repository').ListQuery
  ): Promise<import('@/data/repository').Page<RepositoryRow<E>>>;
  create<E extends import('@/domain/schema').EntityName>(
    entity: E,
    input: import('@/data/repository').CreateInput<E>,
    options?: import('@/data/repository').WriteOptions
  ): Promise<RepositoryRow<E>>;
}
