// ABOUTME: The distribution policies a counter or bulk payment may choose, shared by the cashier and
// ABOUTME: the class payment screen so the two cannot drift apart.

import type { AllocationStrategyKind } from '@/domain/finance/allocation';

export interface PaymentStrategyOption {
  readonly value: AllocationStrategyKind;
  readonly label: string;
}

export const PAYMENT_STRATEGY_OPTIONS: readonly PaymentStrategyOption[] = [
  { value: 'vote_head_priority', label: 'Vote-head priority' },
  { value: 'oldest_first', label: 'Oldest invoice first' },
  { value: 'proportional', label: 'Proportional (weighted)' },
];
