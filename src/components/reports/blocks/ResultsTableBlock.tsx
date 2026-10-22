// ABOUTME: The results table block: one row per learning area, configurable columns, and the total as a
// ABOUTME: row in `tbody` — never a `tfoot`, which repeats on every printed page.

import type { ReactNode } from 'react';
import type { ReportBlockModel } from '@/domain/reports/types';
import { Ltr, ReportColgroup, ReportHeadRow } from './shared';
import { reportCellClass } from './tableClasses';

export type ResultsTableBlockModel = Extract<ReportBlockModel, { kind: 'results_table' }>;

export function ResultsTableBlock({ block }: { block: ResultsTableBlockModel }): ReactNode {
  const { columns, rows, totals } = block.payload;
  return (
    <table className="report-table" data-table="results">
      <ReportColgroup columns={columns} />
      <ReportHeadRow columns={columns} />
      <tbody>
        {rows.map((row) => (
          <tr key={row.code} className="report-row" data-row={row.code}>
            {columns.map((column) => {
              const value = column.kind === 'name' ? row.name : (row.cells[column.kind] ?? '');
              return (
                <td key={column.kind} className={reportCellClass(column.align)}>
                  <Ltr>{value}</Ltr>
                </td>
              );
            })}
          </tr>
        ))}
        {totals ? (
          <tr className="report-table__total report-row" data-row="total">
            {columns.map((column) => {
              const value = column.kind === 'name' ? totals.name : (totals.cells[column.kind] ?? '');
              return (
                <td key={column.kind} className={reportCellClass(column.align)}>
                  <Ltr>{value}</Ltr>
                </td>
              );
            })}
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
