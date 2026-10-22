// ABOUTME: The mark entry grid: learners down, the scheme's assessment slots across, a spreadsheet
// ABOUTME: keyboard model, paste of a range, and the engine's status for every cell.

import React, { useCallback, useMemo, useRef } from 'react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { nextCell, type CellPosition } from './navigation';
import type { CellEntry, CellStatus, GridRow, SchemeColumn, WorkflowState } from './types';
import type { MarkStatus } from '@/domain/assessment/engine';

const MARK_STATUS_OPTIONS: readonly MarkStatus[] = [
  'present',
  'absent',
  'exempt',
  'incomplete',
  'malpractice',
];

const BADGE_VARIANT: Readonly<Record<CellStatus['tone'], 'secondary' | 'success' | 'warning' | 'danger' | 'info'>> = {
  neutral: 'secondary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
};

export interface MarkEntryGridProps {
  readonly columns: readonly SchemeColumn[];
  readonly rows: readonly GridRow[];
  readonly page: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
  readonly entryOf: (rowIndex: number, columnIndex: number) => CellEntry;
  readonly statusOf: (rowIndex: number, columnIndex: number) => CellStatus;
  readonly originalOf: (rowIndex: number, columnIndex: number) => string | null;
  readonly editableColumns: ReadonlySet<string>;
  readonly columnStates: Readonly<Record<string, WorkflowState>>;
  readonly canWrite: boolean;
  readonly onScore: (rowIndex: number, columnIndex: number, raw: string) => void;
  readonly onStatus: (rowIndex: number, columnIndex: number, status: MarkStatus) => void;
  readonly onPaste: (anchorRow: number, anchorColumn: number, text: string) => void;
  readonly emptyMessage: string;
}

/**
 * The grid itself.
 *
 * Large groups stay usable through pagination rather than virtualisation: the repository has no
 * virtual-list dependency, and a page of 40 rows keeps the DOM small while Tab and the arrows move
 * within what is on screen. The header and the learner column stay put while the marks scroll.
 */
export const MarkEntryGrid: React.FC<MarkEntryGridProps> = ({
  columns,
  rows,
  page,
  pageSize,
  onPageChange,
  entryOf,
  statusOf,
  originalOf,
  editableColumns,
  columnStates,
  canWrite,
  onScore,
  onStatus,
  onPaste,
  emptyMessage,
}) => {
  const inputs = useRef(new Map<string, HTMLInputElement | null>());
  const pageOffset = page * pageSize;
  const visible = useMemo(() => rows.slice(pageOffset, pageOffset + pageSize), [rows, pageOffset, pageSize]);

  const focusCell = useCallback((target: CellPosition) => {
    inputs.current.get(`${target.row}:${target.column}`)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, localRow: number, columnIndex: number) => {
      const target = nextCell(
        event.key,
        event.shiftKey,
        { row: localRow, column: columnIndex },
        { rowCount: visible.length, columnCount: columns.length }
      );
      if (target === null) return;
      event.preventDefault();
      focusCell(target);
    },
    [visible.length, columns.length, focusCell]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>, absoluteRow: number, columnIndex: number) => {
      const text = event.clipboardData?.getData('text/plain') ?? '';
      const multiCell = /[\t\n\r]/.test(text);
      if (!multiCell) return;
      event.preventDefault();
      onPaste(absoluteRow, columnIndex, text);
    },
    [onPaste]
  );

  if (columns.length === 0) {
    return <p className="py-6 text-center text-surface-muted-fg">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="min-w-full border-collapse text-left text-sm" data-testid="mark-entry-grid">
          <caption className="sr-only">
            {`Marks for this teaching group across ${columns.length} assessment ${
              columns.length === 1 ? 'slot' : 'slots'
            }. Use the arrow keys, Tab or Enter to move between cells, and paste a range from a spreadsheet.`}
          </caption>
          <thead className="sticky top-0 z-10 bg-surface-muted">
            <tr>
              <th scope="col" className="sticky left-0 z-20 min-w-[14rem] bg-surface-muted px-3 py-2 font-medium">
                Learner
              </th>
              {columns.map((column) => {
                const state = columnStates[column.key] ?? 'open';
                return (
                  <th key={column.key} scope="col" className="min-w-[9rem] px-3 py-2 align-bottom font-medium">
                    <span className="block">{column.label}</span>
                    <span className="block text-xs font-normal text-surface-muted-fg">
                      {column.max === null ? 'no maximum' : `out of ${column.max}`} · {column.slot} ·{' '}
                      {state}
                    </span>
                    {!editableColumns.has(column.key) ? (
                      <span className="mt-1 block text-xs font-normal text-surface-muted-fg" aria-live="polite">
                        {state === 'published' || state === 'locked'
                          ? 'Read-only: a change needs a reason.'
                          : 'Read-only.'}
                      </span>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, localRow) => {
              const absoluteRow = pageOffset + localRow;
              return (
                <tr key={row.enrolmentId} className="border-t border-surface-border align-top">
                  <th scope="row" className="sticky left-0 z-10 bg-surface-card px-3 py-2 font-normal">
                    <span className="block font-medium text-surface-foreground">{row.learnerName}</span>
                    <span className="block text-xs text-surface-muted-fg">
                      {row.admissionNumber ?? 'no admission number'}
                    </span>
                  </th>
                  {columns.map((column, columnIndex) => {
                    const entry = entryOf(absoluteRow, columnIndex);
                    const status = statusOf(absoluteRow, columnIndex);
                    const original = originalOf(absoluteRow, columnIndex);
                    const editable = canWrite && editableColumns.has(column.key);
                    const showReason =
                      status.code !== 'valid' &&
                      status.code !== 'locked' &&
                      status.code !== 'moderated' &&
                      status.reason !== null;
                    const describedBy = showReason ? `cell-${absoluteRow}-${columnIndex}-reason` : undefined;
                    return (
                      <td key={column.key} className="px-3 py-2">
                        <div className="flex items-start gap-1">
                          <input
                            ref={(node) => {
                              inputs.current.set(`${localRow}:${columnIndex}`, node);
                            }}
                            className={`h-8 w-20 rounded-md border px-2 text-sm text-surface-foreground outline-none focus:ring-4 focus:ring-primary-500/15 ${
                              status.code === 'valid'
                                ? 'border-surface-input bg-surface-card'
                                : status.code === 'out_of_range' || status.code === 'invalid'
                                  ? 'border-red-400 bg-red-50 dark:bg-red-500/10'
                                  : 'border-amber-400 bg-amber-50 dark:bg-amber-500/10'
                            } ${editable ? '' : 'cursor-not-allowed opacity-80'}`}
                            aria-label={`${column.label} for ${row.learnerName}`}
                            aria-invalid={status.code === 'out_of_range' || status.code === 'invalid'}
                            aria-readonly={!editable}
                            aria-describedby={describedBy}
                            data-cell={`${absoluteRow}:${columnIndex}`}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={entry.score}
                            readOnly={!editable}
                            onChange={(event) => onScore(absoluteRow, columnIndex, event.target.value)}
                            onKeyDown={(event) => handleKeyDown(event, localRow, columnIndex)}
                            onPaste={(event) => handlePaste(event, absoluteRow, columnIndex)}
                          />
                          <select
                            className="h-8 rounded-md border border-surface-border bg-surface-card px-1 text-xs text-surface-foreground"
                            aria-label={`Status for ${column.label} for ${row.learnerName}`}
                            value={entry.status}
                            disabled={!editable}
                            onChange={(event) =>
                              onStatus(absoluteRow, columnIndex, event.target.value as MarkStatus)
                            }
                          >
                            {MARK_STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        {status.code !== 'valid' ? (
                          <span className="mt-1 block">
                            <Badge variant={BADGE_VARIANT[status.tone]} size="sm">
                              {status.label}
                            </Badge>
                          </span>
                        ) : null}

                        {showReason && status.reason !== null ? (
                          <span
                            id={`cell-${absoluteRow}-${columnIndex}-reason`}
                            className="mt-1 block text-xs text-red-700 dark:text-red-400"
                          >
                            {status.reason}
                          </span>
                        ) : null}

                        {original !== null ? (
                          <span className="mt-1 block text-xs text-surface-muted-fg">
                            Moderated: was {original === '' ? 'empty' : original}, now{' '}
                            {entry.score === '' ? 'empty' : entry.score}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-surface-muted-fg">
        <span>
          {rows.length === 0
            ? 'No learners in this group on this date.'
            : `Showing ${pageOffset + 1}-${Math.min(pageOffset + pageSize, rows.length)} of ${rows.length} learners`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 0}
          >
            Previous page
          </Button>
          <span>
            Page {page + 1} of {Math.max(1, Math.ceil(rows.length / pageSize))}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={pageOffset + pageSize >= rows.length}
          >
            Next page
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MarkEntryGrid;
