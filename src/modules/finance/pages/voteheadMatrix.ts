// ABOUTME: The class vote-head matrix: one row per learner, one balance column per vote head, and the
// ABOUTME: learner's total. It is the modern form of the old student vote-head balances grid.

import type { FinanceInvoiceLineRow, FinanceLearnerRow } from '../data/canonicalFinance';

export interface VoteheadMatrixFilters {
  readonly periodId: string;
  /** Only learners placed at this level (grade); empty means every grade. */
  readonly levelId: string;
  /** Only learners placed in this class group (stream); empty means every stream. */
  readonly classGroupId: string;
}

export interface VoteheadMatrixColumn {
  readonly id: string;
  readonly label: string;
}

export interface VoteheadMatrixRow {
  readonly id: string;
  readonly admissionNumber: string;
  readonly name: string;
  /** The full label, grade and stream, e.g. "Grade 7 · East". */
  readonly className: string;
  /** The grade (level) name, e.g. "Grade 7". */
  readonly classLabel: string;
  /** The stream (class group) name, e.g. "East". */
  readonly streamName: string;
  readonly classGroupId: string;
  readonly totalBilledMinor: number;
  readonly totalPaidMinor: number;
  readonly totalBalanceMinor: number;
  /** Balance by vote-head id, under the key `v:<feeItemId>`. */
  readonly values: Readonly<Record<string, number>>;
}

export interface VoteheadMatrixReport {
  readonly columns: readonly VoteheadMatrixColumn[];
  readonly rows: readonly VoteheadMatrixRow[];
  readonly totals: {
    readonly billedMinor: number;
    readonly paidMinor: number;
    readonly balanceMinor: number;
  };
}

export const EMPTY_VOTEHEAD_MATRIX_FILTERS: VoteheadMatrixFilters = {
  periodId: '',
  levelId: '',
  classGroupId: '',
};

const UNASSIGNED = 'unassigned';

interface Bucket {
  readonly id: string;
  readonly label: string;
  billedMinor: number;
  paidMinor: number;
}

/**
 * Builds the matrix from posted invoice lines.
 *
 * A vote head's column appears when at least one filtered line names it. The cell is the outstanding
 * balance (billed minus paid) for that learner and vote head; a zero means nothing is left, not that
 * nothing was billed. The row total is over the same cells.
 *
 * Learners are narrowed by level and class-group id, never by the display text: two grades' "East"
 * are two different classes.
 */
export function buildVoteheadMatrix(input: {
  readonly lines: readonly FinanceInvoiceLineRow[];
  readonly learners: readonly FinanceLearnerRow[];
  readonly feeItems: readonly { readonly id: string; readonly code: string; readonly name: string }[];
  readonly filters: VoteheadMatrixFilters;
}): VoteheadMatrixReport {
  const learnerById = new Map(input.learners.map((learner) => [learner.id, learner]));
  const feeItems = new Map(input.feeItems.map((item) => [item.id, item]));
  const columns = new Map<string, Bucket>();
  const rows = new Map<
    string,
    {
      learner: FinanceLearnerRow;
      billedMinor: number;
      paidMinor: number;
      values: Map<string, { billedMinor: number; paidMinor: number }>;
    }
  >();

  for (const line of input.lines) {
    if (line.invoiceStatus === 'draft' || line.invoiceStatus === 'void') continue;
    if (input.filters.periodId && line.periodId !== input.filters.periodId) continue;
    if (!line.learnerId) continue;
    const learner = learnerById.get(line.learnerId);
    if (!learner) continue;
    if (input.filters.levelId && learner.levelId !== input.filters.levelId) continue;
    if (input.filters.classGroupId && learner.classGroupId !== input.filters.classGroupId) continue;

    const itemId = line.row.fee_item_id ?? UNASSIGNED;
    const item = feeItems.get(itemId);
    const label = item ? `${item.code} ${item.name}`.trim() : line.description || 'Unassigned';
    const column = columns.get(itemId) ?? { id: itemId, label, billedMinor: 0, paidMinor: 0 };
    column.billedMinor += line.amount.amount_minor;
    column.paidMinor += line.paid.amount_minor;
    columns.set(itemId, column);

    const entry = rows.get(learner.id) ?? {
      learner,
      billedMinor: 0,
      paidMinor: 0,
      values: new Map<string, { billedMinor: number; paidMinor: number }>(),
    };
    const cell = entry.values.get(itemId) ?? { billedMinor: 0, paidMinor: 0 };
    cell.billedMinor += line.amount.amount_minor;
    cell.paidMinor += line.paid.amount_minor;
    entry.values.set(itemId, cell);
    entry.billedMinor += line.amount.amount_minor;
    entry.paidMinor += line.paid.amount_minor;
    rows.set(learner.id, entry);
  }

  const columnList = [...columns.values()].sort((left, right) => left.label.localeCompare(right.label));
  const rowList: VoteheadMatrixRow[] = [...rows.values()]
    .map((entry) => {
      const values: Record<string, number> = {};
      let balance = 0;
      for (const column of columnList) {
        const cell = entry.values.get(column.id);
        const value = cell ? cell.billedMinor - cell.paidMinor : 0;
        values[`v:${column.id}`] = value;
        balance += value;
      }
      return {
        id: entry.learner.id,
        admissionNumber: entry.learner.admissionNumber,
        name: entry.learner.name,
        className: entry.learner.className,
        classLabel: entry.learner.classLabel,
        streamName: entry.learner.streamName,
        classGroupId: entry.learner.classGroupId,
        totalBilledMinor: entry.billedMinor,
        totalPaidMinor: entry.paidMinor,
        totalBalanceMinor: balance,
        values,
      };
    })
    .sort(
      (left, right) =>
        left.classLabel.localeCompare(right.classLabel) ||
        left.streamName.localeCompare(right.streamName) ||
        left.name.localeCompare(right.name)
    );

  return {
    columns: columnList.map((column) => ({ id: column.id, label: column.label })),
    rows: rowList,
    totals: {
      billedMinor: rowList.reduce((sum, row) => sum + row.totalBilledMinor, 0),
      paidMinor: rowList.reduce((sum, row) => sum + row.totalPaidMinor, 0),
      balanceMinor: rowList.reduce((sum, row) => sum + row.totalBalanceMinor, 0),
    },
  };
}
