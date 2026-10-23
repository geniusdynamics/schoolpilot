// ABOUTME: The public API of the discount module: the rules engine, the sibling, staff-ward,
// ABOUTME: bursary and scholarship rules, the split-billing engine, the budgets, the canonical seam
// ABOUTME: and the service. A caller imports from here, never from a file inside the module.

export { DISCOUNT_ERROR_CODES, DiscountError, isDiscountError, type DiscountErrorCode } from './errors';

export {
  DEFAULT_DISCOUNT_FUNDING_SOURCES,
  DEFAULT_DISCOUNT_ROUNDING,
  DEFAULT_STACKING,
  applyDiscounts,
  assertDiscountBasis,
  assertDiscountRule,
  assertDiscountRules,
  assertSiblingPolicy,
  compareDiscountRules,
  computeDiscount,
  discountableLine,
  effectiveBasis,
  percentBasisPoints,
  ruleInPeriod,
  ruleReachesLearner,
  ruleScopesLine,
  siblingBasisForRank,
  siblingTierFor,
  type DiscountableLine,
  type DiscountApplication,
  type DiscountComputation,
} from './rules';

export {
  DEFAULT_PRECEDENCE,
  SPEC_SIBLING_POLICY,
  bursaryRule,
  cappedBursaryBasis,
  fixedBursaryBasis,
  fullScholarshipBasis,
  rankSiblingsByAdmission,
  scholarshipRule,
  siblingRule,
  siblingTierBasis,
  siblingTierOf,
  staffWardRule,
  validateSiblingPolicy,
  type HouseholdChild,
  type RankedChild,
  type RuleDraft,
} from './siblings';

export {
  DEFAULT_SPONSOR_RISK,
  planSplit,
  settleSponsors,
  sponsorSharesOf,
  sponsorshipPayer,
  type SponsorPayment,
  type SponsorSettlement,
  type SponsorSettlementResult,
  type SplitPayer,
} from './split';

export {
  BUDGET_SOURCE,
  DEFAULT_BUDGET_OVERSPEND,
  assertDiscountBudget,
  budgetStatus,
  budgetStatuses,
  withinEveryBudget,
} from './budget';

export { DEFAULT_FAMILY_PAYER, planLearnerBill, previewDiscount } from './billing';

export {
  CANONICAL_DISCOUNT_FUNDING_SOURCES,
  CANONICAL_DISCOUNT_KINDS,
  CONDITION_KEYS,
  discountRuleFromRow,
  discountRuleToRow,
  ruleKindOfRow,
  sponsorshipFromRow,
  sponsorshipToRow,
  type CanonicalDiscountContext,
  type CanonicalDiscountFundingSource,
} from './canonical';

export { DiscountService, type DiscountServiceOptions, type ServiceBillRequest } from './service';

export type {
  AppliedBasisKind,
  AppliedDiscount,
  BillLineInput,
  BillSplit,
  BudgetOverspendPolicy,
  BudgetStatus,
  CanonicalDiscountKind,
  DiscountApplicability,
  DiscountBasis,
  DiscountBudget,
  DiscountFundingSource,
  DiscountPeriod,
  DiscountPlanOptions,
  DiscountRule,
  DiscountRuleKind,
  DiscountScope,
  DiscountStore,
  FeeFundingSource,
  LearnerBillFacts,
  LearnerBillInput,
  LearnerBillPlan,
  PlannedLine,
  SiblingPolicy,
  SiblingTier,
  SplitShare,
  SplitShareBasis,
  SponsorRiskPolicy,
  SponsorShare,
  SponsorshipAgreement,
  StackingPolicy,
} from './types';
