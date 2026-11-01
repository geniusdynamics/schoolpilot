// ABOUTME: The fee status report's arithmetic: billed, collected and outstanding per class and vote
// ABOUTME: head, with the distinct learners behind each row. It is pure so the page and its test read
// ABOUTME: the same figures, and no amount passes through a float.

import type { FinanceInvoiceLineRow, FinanceLearnerRow } from '../data/canonicalFinance';

export interface FeeStatusFilters {
  /** Only lines of this academic period; empty means every period. */
  readonly periodId: string;
  /** Only learners placed in this class group; empty means every class. */
  readonly className: string;
  /** Only this fee item; empty means every vote head. */
  readonly feeItemId: string;
  /** Keep only rows whose collected amount is below the billed amount. */
  readonly arrearsOnly: boolean;
}

export interface FeeStatusRow {
  readonly id: string;
  readonly className: string;
  readonly feeItem: string;
  readonly learners: number;
  readonly billedMinor: number;
  readonly paidMinor: number;
  readonly balanceMinor: number;
  /** Collected as a percentage of billed, to one decimal place. */
  readonly collectionPercent: number;
}

export interface FeeStatusTotals {
  readonly learners: number;
  readonly billedMinor: number;
  readonly paidMinor: number;
  readonly balanceMinor: number;
  readonly collectionPercent: number;
}

export interface FeeStatusReport {
  readonly rows: readonly FeeStatusRow[];
  readonly totals: FeeStatusTotals;
}

export const EMPTY_FEE_STATUS_FILTERS: FeeStatusFilters = {
  periodId: '',
  className: '',
  feeItemId: '',
  arrearsOnly: false,
};

const percentOf = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

/** The label a report shows for a fee item: its code and name, or the line's own description. */
export function feeItemLabel(
  line: FinanceInvoiceLineRow,
  feeItems: ReadonlyMap<string, { readonly code: string; readonly name: string }>
): string {
  const id = line.row.fee_item_id ?? '';
  const item = id ? feeItems.get(id) : undefined;
  if (item) return `${item.code} ${item.name}`.trim();
  return line.description || 'Unassigned';
}

/**
 * Groups posted invoice lines by class and vote head.
 *
 * A line's `paid` is the share of the payments already allocated to it, so billed minus paid is the
 * outstanding share. `learners` counts the distinct learners behind the lines, not the lines: a
 * learner with two tuition lines is one learner on the report.
 */
export function buildFeeStatusReport(input: {
  readonly lines: readonly FinanceInvoiceLineRow[];
  readonly learners: readonly FinanceLearnerRow[];
  readonly feeItems: readonly { readonly id: string; readonly code: string; readonly name: string }[];
  readonly filters: FeeStatusFilters;
}): FeeStatusReport {
  const learnerClass = new Map(input.learners.map((learner) => [learner.id, learner.className]));
  const feeItems = new Map(input.feeItems.map((item) => [item.id, item]));
  const groups = new Map<
    string,
    {
      className: string;
      feeItem: string;
      learners: Set<string>;
      billedMinor: number;
      paidMinor: number;
    }
  >();

  for (const line of input.lines) {
    if (line.invoiceStatus === 'draft' || line.invoiceStatus === 'void') continue;
    if (input.filters.periodId && line.periodId !== input.filters.periodId) continue;
    const className = line.learnerId ? (learnerClass.get(line.learnerId) ?? 'Unassigned') : 'Unassigned';
    if (input.filters.className && className !== input.filters.className) continue;
    const itemId = line.row.fee_item_id ?? '';
    if (input.filters.feeItemId && itemId !== input.filters.feeItemId) continue;

    const feeItem = feeItemLabel(line, feeItems);
    const key = `${className}\u0000${feeItem}`;
    const group = groups.get(key) ?? {
      className,
      feeItem,
      learners: new Set<string>(),
      billedMinor: 0,
      paidMinor: 0,
    };
    if (line.learnerId) group.learners.add(line.learnerId);
    group.billedMinor += line.amount.amount_minor;
    group.paidMinor += line.paid.amount_minor;
    groups.set(key, group);
  }

  const rows: FeeStatusRow[] = [...groups.values()]
    .map((group) => {
      const balanceMinor = group.billedMinor - group.paidMinor;
      return {
        id: `${group.className}\u0000${group.feeItem}`,
        className: group.className,
        feeItem: group.feeItem,
        learners: group.learners.size,
        billedMinor: group.billedMinor,
        paidMinor: group.paidMinor,
        balanceMinor,
        collectionPercent: percentOf(group.paidMinor, group.billedMinor),
      };
    })
    .filter((row) => !input.filters.arrearsOnly || row.balanceMinor > 0)
    .sort(
      (left, right) =>
        left.className.localeCompare(right.className) || left.feeItem.localeCompare(right.feeItem)
    );

  const learnerIds = new Set<string>();
  let billedMinor = 0;
  let paidMinor = 0;
  for (const group of groups.values()) {
    if (input.filters.arrearsOnly && group.billedMinor - group.paidMinor <= 0) continue;
    for (const learnerId of group.learners) learnerIds.add(learnerId);
    billedMinor += group.billedMinor;
    paidMinor += group.paidMinor;
  }

  return {
    rows,
    totals: {
      learners: learnerIds.size,
      billedMinor,
      paidMinor,
      balanceMinor: billedMinor - paidMinor,
      collectionPercent: percentOf(paidMinor, billedMinor),
    },
  };
}
