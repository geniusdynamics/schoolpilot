// ABOUTME: The one renderer the accounting reports share: it draws a ReportTable as a plain table
// ABOUTME: and exports the very same table as CSV, so the screen and the file carry the same figures.

import React, { useCallback } from 'react';

import Button from '@/components/ui/Button';
import { DownloadIcon } from '@/components/ui/icons';

import { reportTableToCsv, type ReportTable } from './accountingReports';

export interface ReportTableViewProps {
  readonly table: ReportTable;
  /** A caption read by assistive technology; the visible heading is the tab's. */
  readonly caption?: string;
  readonly testId?: string;
}

/** Draws a report table: the columns, then a row per record. */
export const ReportTableView: React.FC<ReportTableViewProps> = ({ table, caption, testId }) => (
  <div className="overflow-x-auto" data-testid={testId}>
    <table className="min-w-full text-sm">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <thead>
        <tr className="border-b border-surface-border">
          {table.columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`py-2 font-medium text-surface-muted-fg ${
                column.align === 'right' ? 'text-right' : 'text-left'
              }`}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.length === 0 ? (
          <tr>
            <td className="py-4 text-surface-muted-fg" colSpan={table.columns.length}>
              Nothing to report.
            </td>
          </tr>
        ) : (
          table.rows.map((row, index) => (
            <tr key={index} className="border-b border-surface-border last:border-0">
              {table.columns.map((column) => (
                <td
                  key={column.key}
                  className={`py-1.5 ${column.align === 'right' ? 'text-right font-mono' : 'text-left'}`}
                >
                  {row[column.key] ?? ''}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export interface ExportCsvButtonProps {
  readonly table: ReportTable;
  /** The file name without the extension. */
  readonly filename: string;
  readonly testId?: string;
}

/**
 * Downloads a report as CSV.
 *
 * The CSV is built from the same `ReportTable` the screen renders, so an export can never carry a
 * figure the screen does not show.
 */
export const ExportCsvButton: React.FC<ExportCsvButtonProps> = ({ table, filename, testId }) => {
  const onExport = useCallback(() => {
    const csv = reportTableToCsv(table);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [table, filename]);

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onExport}
      leftIcon={<DownloadIcon className="w-4 h-4" />}
      data-testid={testId}
    >
      Export CSV
    </Button>
  );
};
