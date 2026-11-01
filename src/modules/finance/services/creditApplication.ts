// ABOUTME: Plans how a learner's unallocated payments (their prepayment) settle outstanding invoices.
// ABOUTME: The plan is pure: it orders the invoices by the chosen policy and names each payment-to-
// ABOUTME: invoice amount, so the caller writes the allocations and nothing is recomputed twice.

import { allocate, fromMinor } from '@/domain/money';
import type { AllocationStrategyKind } from '@/domain/finance/allocation';

export interface CreditInvoice {
  readonly id: string;
  readonly issueDate: string;
  /** The invoice total, in minor units. */
  readonly totalMinor: number;
  /** What the invoice's existing allocations already cover, in minor units. */
  readonly paidMinor: number;
  /** The lowest fee-item priority on the invoice; null when no line names one. */
  readonly priority: number | null;
}

export interface CreditPayment {
  readonly id: string;
  readonly receivedAt: string;
  readonly amountMinor: number;
  readonly allocatedMinor: number;
}

export interface CreditAllocation {
  readonly paymentId: string;
  readonly invoiceId: string;
  readonly amountMinor: number;
}

export interface CreditPlan {
  readonly allocations: readonly CreditAllocation[];
  readonly appliedMinor: number;
  readonly unappliedMinor: number;
}

const balanceOf = (invoice: CreditInvoice): number => invoice.totalMinor - invoice.paidMinor;

const orderInvoices = (
  invoices: readonly CreditInvoice[],
  strategy: AllocationStrategyKind
): readonly CreditInvoice[] => {
  if (strategy === 'vote_head_priority') {
    return [...invoices].sort((left, right) => {
      const leftPriority = left.priority ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = right.priority ?? Number.MAX_SAFE_INTEGER;
      return (
        leftPriority - rightPriority ||
        left.issueDate.localeCompare(right.issueDate) ||
        left.id.localeCompare(right.id)
      );
    });
  }
  return [...invoices].sort(
    (left, right) => left.issueDate.localeCompare(right.issueDate) || left.id.localeCompare(right.id)
  );
};

/**
 * Plans the application of unallocated payments.
 *
 * `oldest_first` and `vote_head_priority` fill each invoice in order. `proportional` splits the
 * available money across every outstanding invoice in proportion to its balance, through the money
 * module's exact allocator, then attributes each part to the oldest payment with room. The plan
 * never allocates more than a payment has left or an invoice still owes.
 */
export function planCreditApplication(input: {
  readonly invoices: readonly CreditInvoice[];
  readonly payments: readonly CreditPayment[];
  readonly strategy?: AllocationStrategyKind;
}): CreditPlan {
  const strategy = input.strategy ?? 'vote_head_priority';
  const openInvoices = input.invoices.filter((invoice) => balanceOf(invoice) > 0);
  const payments = input.payments
    .map((payment) => ({ ...payment }))
    .filter((payment) => payment.amountMinor - payment.allocatedMinor > 0)
    .sort(
      (left, right) =>
        left.receivedAt.localeCompare(right.receivedAt) || left.id.localeCompare(right.id)
    );
  const availableMinor = payments.reduce(
    (sum, payment) => sum + (payment.amountMinor - payment.allocatedMinor),
    0
  );
  if (openInvoices.length === 0 || availableMinor <= 0) {
    return { allocations: [], appliedMinor: 0, unappliedMinor: availableMinor };
  }

  const targetMinor = Math.min(
    availableMinor,
    openInvoices.reduce((sum, invoice) => sum + balanceOf(invoice), 0)
  );
  const perInvoice = new Map<string, number>();
  const orderedInvoices =
    strategy === 'proportional' ? openInvoices : orderInvoices(openInvoices, strategy);

  if (strategy === 'proportional') {
    const parts = allocate(fromMinor(targetMinor, 'KES'), openInvoices.map(balanceOf));
    openInvoices.forEach((invoice, index) => {
      perInvoice.set(invoice.id, parts[index]?.amount_minor ?? 0);
    });
  } else {
    let left = targetMinor;
    for (const invoice of orderedInvoices) {
      if (left <= 0) break;
      const take = Math.min(left, balanceOf(invoice));
      perInvoice.set(invoice.id, take);
      left -= take;
    }
  }

  const allocations: CreditAllocation[] = [];
  let paymentIndex = 0;
  for (const invoice of orderedInvoices) {
    let left = perInvoice.get(invoice.id) ?? 0;
    while (left > 0) {
      while (
        paymentIndex < payments.length &&
        payments[paymentIndex].amountMinor - payments[paymentIndex].allocatedMinor <= 0
      ) {
        paymentIndex += 1;
      }
      if (paymentIndex >= payments.length) break;
      const payment = payments[paymentIndex];
      const room = payment.amountMinor - payment.allocatedMinor;
      const take = Math.min(left, room);
      allocations.push({ paymentId: payment.id, invoiceId: invoice.id, amountMinor: take });
      payment.allocatedMinor += take;
      left -= take;
    }
  }

  const appliedMinor = allocations.reduce((sum, allocation) => sum + allocation.amountMinor, 0);
  return { allocations, appliedMinor, unappliedMinor: availableMinor - appliedMinor };
}
