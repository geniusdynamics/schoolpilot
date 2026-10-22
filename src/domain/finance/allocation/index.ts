// ABOUTME: The public API of the allocation engine: plan a payment (or credit) across a learner's
// ABOUTME: outstanding invoice lines under one of four policies, split a household payment across
// ABOUTME: siblings, and reduce lines by a plan. A caller imports from here, never from a file inside.

export { AllocationError, ALLOCATION_ERROR_CODES, type AllocationErrorCode } from './errors';

export { applyAllocationPlan, DEFAULT_CREDIT_ORDER, DEFAULT_STRATEGY, planAllocation } from './plan';

export { DEFAULT_HOUSEHOLD_SPLIT, planHouseholdAllocation } from './household';

export {
  allocateByStrategy,
  allocateByVoteHeadPriority,
  allocateManually,
  allocateOldestFirst,
  allocateProportionally,
  minMoney,
  strategyFunction,
  totalBalance,
  type StrategyFunction,
} from './strategies';

export { compareOldestFirst, orderByVoteHeadPriority, orderOldestFirst, type OrderedItem } from './order';

export type {
  AllocationInput,
  AllocationLine,
  AllocationOptions,
  AllocationPlan,
  AllocationReason,
  AllocationSource,
  AllocationSourceKind,
  AllocationStrategyKind,
  AllocationTraceCode,
  AllocationTraceEntry,
  AppliedCredit,
  CreditBalance,
  CreditOrder,
  HouseholdAllocationInput,
  HouseholdAllocationPlan,
  HouseholdMember,
  HouseholdSplitRule,
  ItemAllocation,
  ItemBalance,
  ManualAllocation,
  ManualPlan,
  MemberShare,
  OrderingRule,
  OrderTieBreak,
  OutstandingItem,
  RemainderPolicy,
  VoteHeadPriorityLookup,
} from './types';
