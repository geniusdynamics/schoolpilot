// ABOUTME: Cash analysis report: payments in a date range, their channel split, receipt number and
// ABOUTME: status. It answers the old cash-analysis question without rebuilding the ledger by hand.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DownloadIcon, PrinterIcon } from '@/components/ui/icons';
import { printReport } from '@/components/reports/print';
import { CHANNEL_LABELS, PAYMENT_CHANNEL_VALUES } from '@/domain/finance/payments';

import { formatMoneyMinor, useCanonicalFinance } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { buildCashAnalysis, EMPTY_CASH_ANALYSIS_FILTERS, type CashAnalysisRow } from './cashAnalysis';

const moneyCell = (minor: number): string => formatMoneyMinor(minor);

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const firstOfMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

export const CashAnalysisPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [channel, setChannel] = useState('');

  const report = useMemo(
    () =>
      buildCashAnalysis({
        payments: finance.paymentRows,
        filters: { ...EMPTY_CASH_ANALYSIS_FILTERS, from, to, channel },
      }),
    [finance.paymentRows, from, to, channel]
  );

  const columns: DataGridColumn<CashAnalysisRow>[] = [
    { key: 'date', header: 'Date', sortable: true, filterable: true },
    { key: 'receipt', header: 'Receipt', sortable: true, filterable: true },
    { key: 'learner', header: 'Learner', sortable: true, filterable: true },
    { key: 'channelLabel', header: 'Channel', sortable: true, filterable: true },
    { key: 'reference', header: 'Reference', sortable: true, filterable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className={value === 'reversed' ? 'text-red-600 dark:text-red-400' : ''}>{value}</span>
      ),
    },
    {
      key: 'amountMinor',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{moneyCell(Number(value))}</span>,
    },
  ];

  const exportCsv = () => {
    const header = ['Date', 'Receipt', 'Learner', 'Channel', 'Reference', 'Status', 'Amount'];
    const lines = report.rows.map((row) =>
      [
        row.date,
        row.receipt,
        row.learner,
        row.channelLabel,
        row.reference,
        row.status,
        (row.amountMinor / 100).toFixed(2),
      ]
        .map(csvCell)
        .join(',')
    );
    const total = ['Total', '', '', '', '', '', (report.totalMinor / 100).toFixed(2)]
      .map(csvCell)
      .join(',');
    const blob = new Blob([[header.map(csvCell).join(','), ...lines, total].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cash-analysis.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card
        title="Cash analysis"
        subtitle="Payments received in the range, split by the channel the money came through."
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
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">From</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">To</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Channel</span>
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All channels</option>
              {PAYMENT_CHANNEL_VALUES.map((value) => (
                <option key={value} value={value}>
                  {CHANNEL_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <p className="text-sm text-surface-muted-fg">
              {report.rows.length} receipt(s), <span className="font-mono">{moneyCell(report.totalMinor)}</span>
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {report.totals.map((total) => (
            <div
              key={total.channel}
              className="rounded-lg border border-surface-border bg-surface-card p-3"
            >
              <p className="text-sm text-surface-muted-fg">{total.label}</p>
              <p className="font-mono text-xl">{moneyCell(total.amountMinor)}</p>
              <p className="text-xs text-surface-muted-fg">{total.count} receipt(s)</p>
            </div>
          ))}
        </div>

        <DataGrid
          columns={columns}
          data={[...report.rows]}
          sortable
          filterable
          emptyState={{
            title: 'No payments in this range',
            description: 'Widen the dates or choose another channel.',
          }}
        />
      </Card>
    </div>
  );
};

const CashAnalysisPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <CashAnalysisPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default CashAnalysisPage;
