// ABOUTME: The allocation engine's error type and its codes: every refusal the engine makes is an
// ABOUTME: AllocationError carrying one of these codes, so a caller can tell a bad instruction from
// ABOUTME: an over-allocation.

export const ALLOCATION_ERROR_CODES = [
  /** The named strategy is not one of the four policies. */
  'unknown_strategy',
  /** `vote_head_priority` was asked for without a priority lookup. */
  'missing_priority_lookup',
  /** `manual` was asked for without a manual plan. */
  'missing_manual_plan',
  /** A manual instruction named an item that is not outstanding. */
  'unknown_item',
  /** A manual plan named the same item twice. */
  'duplicate_item',
  /** A manual amount is zero or negative. */
  'non_positive_amount',
  /** A manual amount exceeds the item's balance. */
  'manual_exceeds_item',
  /** The manual instructions together exceed the money available. */
  'manual_exceeds_payment',
  /** The remainder policy is `refuse` and money is left over. */
  'manual_remainder',
  /** The remainder policy is `to_item` and the named item cannot take it. */
  'manual_remainder_item',
  /** An amount, balance or credit is in another currency than the source. */
  'currency_mismatch',
  /** An outstanding item's balance is negative. */
  'negative_balance',
  /** The payment (or source) amount is negative. */
  'negative_amount',
  /** A household names the same learner twice. */
  'duplicate_member',
  /** A household share weight is negative or not a finite number. */
  'invalid_share',
  /** Applying a plan would push an item's balance below zero. */
  'plan_exceeds_balance',
] as const;

export type AllocationErrorCode = (typeof ALLOCATION_ERROR_CODES)[number];

/** The engine's refusal. Distinct from `MoneyError`, which the money module raises. */
export class AllocationError extends Error {
  readonly code: AllocationErrorCode;

  constructor(code: AllocationErrorCode, message: string) {
    super(message);
    this.name = 'AllocationError';
    this.code = code;
  }
}
