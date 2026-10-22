// ABOUTME: The allocation engine's types: the outstanding invoice lines a payment pays, the
// ABOUTME: strategies, the plan it returns and the trace a bursar reads back to a parent.

import type { CurrencyCode, Money } from '@/domain/money';

/** Which kind of document funded an allocation line: the incoming payment, or an existing credit. */
export type AllocationSourceKind = 'payment' | 'credit';

/** The money a plan is built from: an incoming payment, or a credit note the caller has posted. */
export interface AllocationSource {
  readonly id: string;
  readonly kind: AllocationSourceKind;
  /** The amount to allocate. Positive; a negative or zero amount plans nothing. */
  readonly amount: Money;
  readonly learnerId?: string | null;
  readonly receivedOn?: string;
}

/** A credit balance a plan may consume, as an invoice-payment would be consumed. */
export interface CreditBalance {
  readonly id: string;
  readonly kind: 'credit_note' | 'overpayment';
  /** The credit still available. Positive; a credit of zero is ignored. */
  readonly amount: Money;
  readonly learnerId?: string | null;
  readonly issuedOn?: string;
}

/**
 * One outstanding invoice line, with the balance still owing on it.
 *
 * This mirrors the vocabulary of `FinanceInvoiceLineRow` (`src/modules/finance/data/canonicalFinance.ts`):
 * an invoice line carries the invoice, learner, description, kind, fee item and balance. Allocation
 * targets the line, not the invoice, because the spec allocates by vote head (spec 05 §5.3).
 */
export interface OutstandingItem {
  /** The invoice line id. */
  readonly id: string;
  readonly invoiceId: string;
  readonly invoiceNumber?: string;
  readonly learnerId: string | null;
  /** The invoice issue date, ISO (`YYYY-MM-DD` or a full timestamp). */
  readonly issuedOn: string;
  readonly dueOn?: string | null;
  /** The invoice line kind (`fee`, `fine`, `opening_balance`, …). */
  readonly kind?: string;
  readonly feeItemId?: string | null;
  readonly description?: string;
  /** The line's position on its invoice; the stable tie-break within one invoice. */
  readonly sequence?: number;
  /** The balance still outstanding. Never negative. */
  readonly balance: Money;
}

/**
 * The fee items' declared allocation priority (spec 05 §2.1, `fee_item.priority`).
 *
 * P3-B01 lands the vote-head configuration in parallel, so the engine codes against this small
 * lookup rather than against that module: a lower number is allocated first, and `null` means the
 * fee item declares no priority, so it runs after every item that does.
 */
export interface VoteHeadPriorityLookup {
  priorityOf(feeItemId: string | null | undefined): number | null;
}

/** The four allocation policies of spec 05 §5.3. */
export type AllocationStrategyKind =
  | 'oldest_first'
  | 'vote_head_priority'
  | 'proportional'
  | 'manual';

/** The ordering rule a strategy used to place an item. */
export type OrderingRule =
  | 'invoice_date'
  | 'vote_head_priority'
  | 'proportional_share'
  | 'manual'
  | 'manual_remainder';

/** The key that decided an item's position when the previous item shared its primary key. */
export type OrderTieBreak =
  | 'invoice_date'
  | 'due_date'
  | 'line_order'
  | 'item_id'
  | 'vote_head_priority'
  | 'oldest_first'
  | 'largest_remainder';

/** What a manual plan does with the money it does not name explicitly. */
export type RemainderPolicy =
  | { readonly kind: 'leave_unallocated' }
  | { readonly kind: 'refuse' }
  | { readonly kind: 'to_item'; readonly itemId: string }
  | { readonly kind: 'spill'; readonly strategy: AllocationStrategyKind };

/** One explicit (item, amount) instruction of a manual plan. */
export interface ManualAllocation {
  readonly itemId: string;
  readonly amount: Money;
}

/** A manual plan: the named allocations, and the policy that governs the remainder. */
export interface ManualPlan {
  readonly allocations: readonly ManualAllocation[];
  readonly remainder: RemainderPolicy;
}

/** In what order the payment and any credits are consumed. Default: the payment first. */
export type CreditOrder = 'payment_first' | 'credit_first';

/** The knobs a caller passes to the engine. Every one of them is optional and has a stated default. */
export interface AllocationOptions {
  /** Default `oldest_first`. */
  readonly strategy?: AllocationStrategyKind;
  /** Required by `vote_head_priority`. */
  readonly voteHeadPriority?: VoteHeadPriorityLookup;
  /** Required by `manual`. */
  readonly manual?: ManualPlan;
  /** Default `payment_first`. */
  readonly creditOrder?: CreditOrder;
}

/** Why an amount went where it did. Every allocation line carries one. */
export interface AllocationReason {
  readonly strategy: AllocationStrategyKind;
  readonly ordering: OrderingRule;
  /** The tie-break that placed this item, or null for the first item of the run. */
  readonly tieBreak: OrderTieBreak | null;
  /** True when the item's balance, not the money left, capped this amount. */
  readonly capped: boolean;
  /** True when this amount clears the item's whole balance. */
  readonly fullyCovered: boolean;
  /** For a proportional line: this item's weight (its balance, in minor units). */
  readonly weightMinor?: number;
  /** For a proportional line: the sum of all weights, in minor units. */
  readonly weightSumMinor?: number;
}

/** What a strategy decided to give one item, before it is attributed to a source. */
export interface ItemAllocation {
  readonly itemId: string;
  readonly amount: Money;
  readonly reason: AllocationReason;
}

/** One step of a plan: an amount of one source applied to one invoice line. */
export interface AllocationLine {
  readonly itemId: string;
  readonly invoiceId: string;
  readonly invoiceNumber?: string;
  readonly learnerId: string | null;
  readonly amount: Money;
  readonly sourceKind: AllocationSourceKind;
  readonly sourceId: string;
  readonly reason: AllocationReason;
}

/** A credit and how much of it the plan consumed. */
export interface AppliedCredit {
  readonly id: string;
  readonly kind: CreditBalance['kind'];
  readonly available: Money;
  readonly applied: Money;
}

/** An invoice line's balance after the plan. */
export interface ItemBalance {
  readonly itemId: string;
  readonly invoiceId: string;
  readonly balance: Money;
}

/** The codes of a trace entry, for a caller that wants to filter rather than read. */
export type AllocationTraceCode =
  | 'strategy'
  | 'order'
  | 'allocation'
  | 'credit'
  | 'remainder'
  | 'manual';

/** One decision the engine made, in the order it made it. */
export interface AllocationTraceEntry {
  readonly code: AllocationTraceCode;
  readonly message: string;
  readonly itemId?: string;
  readonly sourceId?: string;
  readonly amount?: Money;
}

/** The engine's input: one source, the learner's outstanding lines, and any credits to consume. */
export interface AllocationInput {
  readonly source: AllocationSource;
  readonly items: readonly OutstandingItem[];
  readonly credits?: readonly CreditBalance[];
  readonly options?: AllocationOptions;
}

/**
 * A plan: how much of the source goes to which invoice line, with its trace.
 *
 * The plan mutates nothing. Applying it is the caller's job — the ledger owns posting (P3-A02) —
 * and `applyAllocationPlan` is the pure reduction a caller may use to reach the new balances.
 */
export interface AllocationPlan {
  readonly strategy: AllocationStrategyKind;
  readonly currency: CurrencyCode;
  readonly source: AllocationSource;
  /** The allocation steps, in the order the money was placed. */
  readonly allocations: readonly AllocationLine[];
  /** The credits the plan consumed, in consumption order. */
  readonly credits: readonly AppliedCredit[];
  /** The credits the plan left alone. */
  readonly unusedCredits: readonly AppliedCredit[];
  /** The total placed, funded by the payment and the credits together. */
  readonly allocated: Money;
  readonly allocatedFromPayment: Money;
  readonly allocatedFromCredits: Money;
  /** The payment's leftover, which becomes learner credit (spec 05 §5.3). */
  readonly unallocated: Money;
  /** Each item's balance after the plan, in the input's order. */
  readonly remaining: readonly ItemBalance[];
  readonly trace: readonly AllocationTraceEntry[];
}

/** How a household payment is divided across the siblings. */
export type HouseholdSplitRule =
  | { readonly kind: 'proportional' }
  | { readonly kind: 'equal' }
  | { readonly kind: 'manual'; readonly shares: Readonly<Record<string, number>> };

/** One sibling's outstanding lines, and the credits that belong to that sibling. */
export interface HouseholdMember {
  readonly learnerId: string;
  readonly items: readonly OutstandingItem[];
  readonly credits?: readonly CreditBalance[];
}

/** One sibling's share of the household payment. */
export interface MemberShare {
  readonly learnerId: string;
  readonly amount: Money;
}

/** The engine's household input: one payment, several siblings, one split rule. */
export interface HouseholdAllocationInput {
  readonly source: AllocationSource;
  readonly members: readonly HouseholdMember[];
  /** The per-learner allocation policy. Default `oldest_first`. */
  readonly options?: AllocationOptions;
  /** How the payment divides across the siblings. Default proportional to each sibling's debt. */
  readonly split?: HouseholdSplitRule;
}

/** A household plan: the split across siblings, and one allocation plan per sibling. */
export interface HouseholdAllocationPlan {
  readonly source: AllocationSource;
  readonly split: HouseholdSplitRule['kind'];
  /** Each sibling's share; the shares sum to the payment exactly. */
  readonly shares: readonly MemberShare[];
  /** One plan per sibling, in the input's order. */
  readonly plans: readonly AllocationPlan[];
  readonly allocated: Money;
  readonly unallocated: Money;
  readonly trace: readonly AllocationTraceEntry[];
}
