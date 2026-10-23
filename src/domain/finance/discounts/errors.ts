// ABOUTME: The discount module's error type and its codes: every refusal the discount, split and
// ABOUTME: budget engine makes carries one of these, so a caller can tell a malformed rule from a
// ABOUTME: split that does not sum to its bill.

export const DISCOUNT_ERROR_CODES = [
  /** A rule names a percentage that is negative, above 100, or not a finite number. */
  'discount_percent_invalid',
  /** A rule names an amount that is not a positive Money of the bill's currency. */
  'discount_amount_invalid',
  /** A rule names a cap that is not a positive Money of the bill's currency. */
  'discount_cap_invalid',
  /** A rule names no basis at all. */
  'discount_basis_missing',
  /** A rule is malformed: a missing name, a duplicate id, a bad precedence. */
  'discount_rule_invalid',
  /** The precedence of a rule is not a whole number. */
  'discount_precedence_invalid',
  /** A sibling rule names a tier that overlaps another, or no tiers at all. */
  'sibling_policy_invalid',
  /** A learner with no sibling rank is presented to a sibling rule. */
  'sibling_rank_missing',
  /** The stacking policy refuses a second discount on one line. */
  'discount_stack_refused',
  /** A split names no family payer, or more than one. */
  'split_family_invalid',
  /** A sponsor's agreed share is not a percentage of at most two decimals. */
  'split_share_invalid',
  /** A sponsor's agreed amount is not a positive Money of the bill's currency. */
  'split_amount_invalid',
  /** The sponsors' agreed shares together exceed the bill. */
  'split_share_exceeds_bill',
  /** A sponsor's agreed amount exceeds what the family's residual can absorb. */
  'split_sponsor_exceeds_bill',
  /** The split's parts do not sum to the bill. This is an invariant, not a policy. */
  'split_does_not_sum',
  /** A budget is not Money of the bill's currency, or its committed figure is negative. */
  'budget_invalid',
  /** The overspend policy is `refuse` and the proposed discounts would exceed the budget. */
  'budget_exceeded',
  /** A sponsorship names neither a share nor an agreed amount, or both. */
  'sponsorship_invalid',
  /** The store could not be read: a row the engine needs is missing. */
  'not_found',
] as const;

export type DiscountErrorCode = (typeof DISCOUNT_ERROR_CODES)[number];

/** The discount module's refusal. Distinct from `MoneyError`, which the money module raises. */
export class DiscountError extends Error {
  readonly code: DiscountErrorCode;
  /** What the refusal is about, when the caller has one: a rule, a line, a payer. */
  readonly subject: string | undefined;

  constructor(code: DiscountErrorCode, message: string, subject?: string) {
    super(message);
    this.name = 'DiscountError';
    this.code = code;
    this.subject = subject;
  }
}

/** True when `error` is a `DiscountError` with one of the given codes (any code when none is given). */
export function isDiscountError(error: unknown, code?: DiscountErrorCode): error is DiscountError {
  return error instanceof DiscountError && (code === undefined || error.code === code);
}
