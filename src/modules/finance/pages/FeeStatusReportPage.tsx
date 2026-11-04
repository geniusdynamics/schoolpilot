// ABOUTME: Fee status report: billed, collected and outstanding per class-group and vote head, with the
// ABOUTME: distinct learners behind each row. It reads posted canonical invoice lines and their payment
// ABOUTME: allocations; Year, Class, Stream and Period come from the shared scope bar, by id.

import React, { useMemo, useState } from 'react';

import { AcademicScopeFilterBar, useAcademicScope } from '@/academic-scope';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DownloadIcon, PrinterIcon } from '@/components/ui/icons';
import { printReport } from '@/components/reports/print';

import { formatMoneyMinor, useCanonicalFinance } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { buildFeeStatusReport, type FeeStatusRow } from './feeStatus';

const moneyCell = (minor: number): string => formatMoneyMinor(minor);

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const FeeStatusReportPageContent: React.FC = () => {
  const scope = useAcademicScope({ period: 'required' });
  const finance = useCanonicalFinance({ academicYearId: scope.scope.effective.yearId });
  const [feeItemId, setFeeItemId] = useState('');
  const [arrearsOnly, setArrearsOnly] = useState(false);

  const feeItemOptions = useMemo(
    () =>
      [...finance.feeItems]
        .map((item) => ({ id: item.id, label: `${item.code} ${item.name}`.trim() }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [finance.feeItems]
  );

  const report = useMemo(
    () =>
      buildFeeStatusReport({
        lines: finance.invoiceLineRows,
        learners: finance.learnerRows,
        feeItems: finance.feeItems,
        filters: {
          periodId: scope.scope.effective.periodId,
          levelId: scope.scope.effective.levelId,
          classGroupId: scope.scope.effective.classGroupId,
          feeItemId,
          arrearsOnly,
        },
      }),
    [
      finance.invoiceLineRows,
      finance.learnerRows,
      finance.feeItems,
      scope.scope.effective.periodId,
      scope.scope.effective.levelId,
      scope.scope.effective.classGroupId,
      feeItemId,
      arrearsOnly,
    ]
  );

  const columns: DataGridColumn<FeeStatusRow>[] = [
    { key: 'classLabel', header: 'Class', sortable: true, filterable: true },
    { key: 'streamName', header: 'Stream', sortable: true, filterable: true },
    {
      key: 'feeItem',
      header: 'Vote head',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'learners',
      header: 'Learners',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'billedMinor',
      header: 'Billed',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{moneyCell(Number(value))}</span>,
    },
    {
      key: 'paidMinor',
      header: 'Collected',
      align: 'right',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-green-700 dark:text-green-400">{moneyCell(Number(value))}</span>
      ),
    },
    {
      key: 'balanceMinor',
      header: 'Outstanding',
      align: 'right',
      sortable: true,
      render: (value) => (
        <span
          className={`font-mono ${
            Number(value) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'
          }`}
        >
          {moneyCell(Number(value))}
        </span>
      ),
    },
    {
      key: 'collectionPercent',
      header: 'Collected %',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{Number(value).toFixed(1)}%</span>,
    },
  ];

  const exportCsv = () => {
    const header = [
      'Class',
      'Stream',
      'Vote head',
      'Learners',
      'Billed',
      'Collected',
      'Outstanding',
      'Collected %',
    ];
    const lines = report.rows.map((row) =>
      [
        row.classLabel,
        row.streamName,
        row.feeItem,
        row.learners,
        (row.billedMinor / 100).toFixed(2),
        (row.paidMinor / 100).toFixed(2),
        (row.balanceMinor / 100).toFixed(2),
        row.collectionPercent.toFixed(1),
      ]
        .map(csvCell)
        .join(',')
    );
    const total = [
      'Total',
      '',
      '',
      report.totals.learners,
      (report.totals.billedMinor / 100).toFixed(2),
      (report.totals.paidMinor / 100).toFixed(2),
      (report.totals.balanceMinor / 100).toFixed(2),
      report.totals.collectionPercent.toFixed(1),
    ]
      .map(csvCell)
      .join(',');
    const blob = new Blob([[header.map(csvCell).join(','), ...lines, total].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fee-status.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card title="Learners">
          <p className="font-mono text-2xl">{report.totals.learners}</p>
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
        title="Fee status by class and vote head"
        info="Billed is every posted invoice line in the chosen year and period; collected is the share of those lines already settled by payment allocations. Outstanding is the rest, and a learner with two lines under one vote head is counted once."
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
        <AcademicScopeFilterBar scope={scope} period="required" className="mb-4">
          <Select
            label="Vote head"
            aria-label="Vote head"
            value={feeItemId}
            onValueChange={(value) => setFeeItemId(Array.isArray(value) ? '' : value)}
            options={[
              { value: '', label: 'All vote heads' },
              ...feeItemOptions.map((item) => ({ value: item.id, label: item.label })),
            ]}
          />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={arrearsOnly}
              onChange={(event) => setArrearsOnly(event.target.checked)}
              className="h-4 w-4 rounded border-surface-border"
            />
            <span className="font-medium text-surface-foreground">Only outstanding rows</span>
          </label>
        </AcademicScopeFilterBar>

        <DataGrid
          columns={columns}
          data={[...report.rows]}
          sortable
          filterable
          emptyState={{
            title: 'No billed lines match the filters',
            description: 'Choose another year, class or period, or run the billing run for this period.',
          }}
        />
      </Card>
    </div>
  );
};

const FeeStatusReportPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <FeeStatusReportPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default FeeStatusReportPage;
