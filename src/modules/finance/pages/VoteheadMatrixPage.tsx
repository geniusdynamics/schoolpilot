// ABOUTME: Class vote-head matrix report: one row per learner, one outstanding column per vote head,
// ABOUTME: and a total. It rebuilds the old student vote-head balances grid on canonical invoice lines.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DownloadIcon, PrinterIcon } from '@/components/ui/icons';
import { printReport } from '@/components/reports/print';

import { formatMoneyMinor, useCanonicalFinance } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { buildVoteheadMatrix } from './voteheadMatrix';

const moneyCell = (minor: number): string => formatMoneyMinor(minor);

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

type MatrixGridRow = Record<string, unknown>;

export const VoteheadMatrixPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const currentPeriod = finance.periods.find((period) => period.status === 'current') ?? finance.periods[0];
  const [periodChoice, setPeriodChoice] = useState<string | null>(null);
  const [className, setClassName] = useState('');

  const periodFilter =
    periodChoice === null ? (currentPeriod?.id ?? '') : periodChoice === 'all' ? '' : periodChoice;
  const classOptions = useMemo(
    () =>
      [...new Set(finance.learnerRows.map((learner) => learner.className).filter(Boolean))].sort(),
    [finance.learnerRows]
  );

  const report = useMemo(
    () =>
      buildVoteheadMatrix({
        lines: finance.invoiceLineRows,
        learners: finance.learnerRows,
        feeItems: finance.feeItems,
        filters: { periodId: periodFilter, className },
      }),
    [finance.invoiceLineRows, finance.learnerRows, finance.feeItems, periodFilter, className]
  );

  const gridRows = useMemo<MatrixGridRow[]>(
    () =>
      report.rows.map((row) => ({
        ...row,
        ...row.values,
      })),
    [report.rows]
  );

  const columns = useMemo<DataGridColumn<MatrixGridRow>[]>(() => {
    const fixed: DataGridColumn<MatrixGridRow>[] = [
      { key: 'admissionNumber', header: 'Adm no', sortable: true, filterable: true },
      {
        key: 'name',
        header: 'Learner',
        sortable: true,
        filterable: true,
        render: (value) => <span className="font-medium">{String(value)}</span>,
      },
      { key: 'className', header: 'Class', sortable: true, filterable: true },
    ];
    const voteHeads: DataGridColumn<MatrixGridRow>[] = report.columns.map((column) => ({
      key: `v:${column.id}`,
      header: column.label,
      align: 'right',
      sortable: true,
      render: (value) => (
        <span className={`font-mono ${Number(value) > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
          {moneyCell(Number(value))}
        </span>
      ),
    }));
    return [
      ...fixed,
      ...voteHeads,
      {
        key: 'totalBalanceMinor',
        header: 'Total balance',
        align: 'right',
        sortable: true,
        render: (value) => (
          <span className="font-mono font-semibold text-red-600 dark:text-red-400">
            {moneyCell(Number(value))}
          </span>
        ),
      },
    ];
  }, [report.columns]);

  const exportCsv = () => {
    const header = [
      'Adm no',
      'Learner',
      'Class',
      ...report.columns.map((column) => column.label),
      'Total balance',
    ];
    const lines = report.rows.map((row) =>
      [
        row.admissionNumber,
        row.name,
        row.className,
        ...report.columns.map((column) => ((row.values[`v:${column.id}`] ?? 0) / 100).toFixed(2)),
        (row.totalBalanceMinor / 100).toFixed(2),
      ]
        .map(csvCell)
        .join(',')
    );
    const totals = [
      'Total',
      '',
      '',
      ...report.columns.map(() => ''),
      (report.totals.balanceMinor / 100).toFixed(2),
    ]
      .map(csvCell)
      .join(',');
    const blob = new Blob([[header.map(csvCell).join(','), ...lines, totals].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'votehead-matrix.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card title="Learners">
          <p className="font-mono text-2xl">{report.rows.length}</p>
        </Card>
        <Card title="Billed">
          <p className="font-mono text-2xl">{moneyCell(report.totals.billedMinor)}</p>
        </Card>
        <Card title="Collected">
          <p className="font-mono text-2xl text-green-600">{moneyCell(report.totals.paidMinor)}</p>
        </Card>
        <Card title="Outstanding">
          <p className="font-mono text-2xl text-red-600">{moneyCell(report.totals.balanceMinor)}</p>
        </Card>
      </div>

      <Card
        title="Vote-head matrix"
        info="Each cell is what that learner still owes on that vote head. A zero means nothing is outstanding, not that nothing was billed; use the Fee Status tab for billed and collected per class."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={report.rows.length === 0}>
              <DownloadIcon className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void printReport()}
              disabled={report.rows.length === 0}
            >
              <PrinterIcon className="h-4 w-4" />
              Print
            </Button>
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Period</span>
            <select
              value={periodChoice ?? currentPeriod?.id ?? ''}
              onChange={(event) => setPeriodChoice(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="all">All periods</option>
              {finance.periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Class</span>
            <select
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All classes</option>
              {classOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <DataGrid
          columns={columns}
          data={gridRows}
          sortable
          filterable
          emptyState={{
            title: 'No billed lines match the filters',
            description: 'Choose another period or class, or run the billing run for this period.',
          }}
        />
      </Card>
    </div>
  );
};

const VoteheadMatrixPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <VoteheadMatrixPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default VoteheadMatrixPage;
