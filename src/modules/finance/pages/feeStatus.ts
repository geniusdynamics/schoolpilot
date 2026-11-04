// ABOUTME: The fee status report's arithmetic: billed, collected and outstanding per class-group and
// ABOUTME: vote head, with the distinct learners behind each row. It is pure so the page and its test
// ABOUTME: read the same figures, and no amount passes through a float.

import type { FinanceInvoiceLineRow, FinanceLearnerRow } from '../data/canonicalFinance';

export interface FeeStatusFilters {
  /** Only lines of this academic period; empty means every period. */
  readonly periodId: string;
  /** Only learners placed at this level (grade); empty means every grade. */
  readonly levelId: string;
  /** Only learners placed in this class group (stream); empty means every stream. */
  readonly classGroupId: string;
  /** Only this fee item; empty means every vote head. */
  readonly feeItemId: string;
  /** Keep only rows whose collected amount is below the billed amount. */
  readonly arrearsOnly: boolean;
}

export interface FeeStatusRow {
  /** The class-group id and the vote-head identity, so the row survives a rename. */
  readonly id: string;
  readonly classGroupId: string;
  /** The grade (level) name, e.g. "Grade 7". */
  readonly classLabel: string;
  /** The stream (class group) name, e.g. "East". */
  readonly streamName: string;
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
  levelId: '',
  classGroupId: '',
  feeItemId: '',
  arrearsOnly: false,
};

const UNASSIGNED = 'Unassigned';

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
 * Groups posted invoice lines by class-group and vote head.
 *
 * A line's `paid` is the share of the payments already allocated to it, so billed minus paid is the
 * outstanding share. `learners` counts the distinct learners behind the lines, not the lines: a
 * learner with two tuition lines is one learner on the report.
 *
 * The class-group id is the group identity, never the display text: two grades both name a stream
 * "East", and grouping by that name merged two different classes into one row.
 */
export function buildFeeStatusReport(input: {
  readonly lines: readonly FinanceInvoiceLineRow[];
  readonly learners: readonly FinanceLearnerRow[];
  readonly feeItems: readonly { readonly id: string; readonly code: string; readonly name: string }[];
  readonly filters: FeeStatusFilters;
}): FeeStatusReport {
  const learnerById = new Map(input.learners.map((learner) => [learner.id, learner]));
  const feeItems = new Map(input.feeItems.map((item) => [item.id, item]));
  const groups = new Map<
    string,
    {
      classGroupId: string;
      classLabel: string;
      streamName: string;
      feeItem: string;
      learners: Set<string>;
      billedMinor: number;
      paidMinor: number;
    }
  >();

  for (const line of input.lines) {
    if (line.invoiceStatus === 'draft' || line.invoiceStatus === 'void') continue;
    if (input.filters.periodId && line.periodId !== input.filters.periodId) continue;
    const learner = line.learnerId ? learnerById.get(line.learnerId) : undefined;
    if (input.filters.levelId && learner?.levelId !== input.filters.levelId) continue;
    if (input.filters.classGroupId && learner?.classGroupId !== input.filters.classGroupId) continue;
    const itemId = line.row.fee_item_id ?? '';
    if (input.filters.feeItemId && itemId !== input.filters.feeItemId) continue;

    const classGroupId = learner?.classGroupId ?? '';
    const classLabel = learner?.classLabel || (classGroupId ? '' : UNASSIGNED);
    const streamName = learner?.streamName ?? '';
    const feeItem = feeItemLabel(line, feeItems);
    // A line with no fee item is identified by its own description, so two unassigned lines of
    // different vote heads do not merge into one row.
    const itemKey = itemId || `description:${line.description}`;
    const key = `${classGroupId || 'unassigned'}\u0000${itemKey}`;
    const group = groups.get(key) ?? {
      classGroupId,
      classLabel,
      streamName,
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

  const rows: FeeStatusRow[] = [...groups.entries()]
    .map(([key, group]) => {
      const balanceMinor = group.billedMinor - group.paidMinor;
      return {
        id: key,
        classGroupId: group.classGroupId,
        classLabel: group.classLabel,
        streamName: group.streamName,
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
        left.classLabel.localeCompare(right.classLabel) ||
        left.streamName.localeCompare(right.streamName) ||
        left.feeItem.localeCompare(right.feeItem)
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
