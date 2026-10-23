// ABOUTME: Fee collection summary: billed and collected per votehead for a period, from canonical
// ABOUTME: invoice lines and their payment allocations. Totals are exact minor units.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { CurrencyDollarIcon } from '@/components/ui/icons';

import { formatMoneyMinor, useCanonicalFinance } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import type { Id } from '@/domain/ids';

interface CollectionRow {
  readonly votehead: string;
  readonly expectedMinor: number;
  readonly paidMinor: number;
}

export const FeeCollectionSummaryPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const [periodId, setPeriodId] = useState<Id<'academic_period'> | null>(null);
  const [levelId, setLevelId] = useState<Id<'level'> | null>(null);

  const selectedPeriod = periodId ?? finance.periods[0]?.id ?? null;

  const learnerLevel = useMemo(() => {
    const map = new Map<string, string>();
    for (const learner of finance.learnerRows) map.set(learner.id, learner.levelId);
    return map;
  }, [finance.learnerRows]);

  const rows = useMemo<readonly CollectionRow[]>(() => {
    const totals = new Map<string, { expected: number; paid: number }>();
    for (const line of finance.invoiceLineRows) {
      if (selectedPeriod && line.periodId !== selectedPeriod) continue;
      if (line.invoiceStatus === 'void' || line.invoiceStatus === 'draft') continue;
      if (levelId && (!line.learnerId || learnerLevel.get(line.learnerId) !== levelId)) continue;
      const current = totals.get(line.description) ?? { expected: 0, paid: 0 };
      current.expected += line.amount.amount_minor;
      current.paid += line.paid.amount_minor;
      totals.set(line.description, current);
    }
    return [...totals.entries()]
      .map(([votehead, value]) => ({
        votehead,
        expectedMinor: value.expected,
        paidMinor: value.paid,
      }))
      .sort((left, right) => left.votehead.localeCompare(right.votehead));
  }, [finance.invoiceLineRows, selectedPeriod, levelId, learnerLevel]);

  const columns: DataGridColumn<CollectionRow>[] = [
    {
      key: 'votehead',
      header: 'Votehead',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'expectedMinor',
      header: 'Billed',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{formatMoneyMinor(Number(value))}</span>,
    },
    {
      key: 'paidMinor',
      header: 'Collected',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{formatMoneyMinor(Number(value))}</span>,
    },
    {
      key: 'paidMinor',
      header: 'Arrears',
      align: 'right',
      render: (_value, row) => (
        <span
          className={`font-mono ${
            row.expectedMinor > row.paidMinor ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {formatMoneyMinor(row.expectedMinor - row.paidMinor)}
        </span>
      ),
    },
  ];

  return (
    <Card
      title="Fee collection summary"
      info="Billed is every posted invoice line of the period; collected is the share of those lines the recorded payments have settled. Nothing is rounded on the way."
    >
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Period</span>
          <EntityPicker
            value={selectedPeriod}
            onChange={setPeriodId}
            lookup={finance.lookups.period}
            placeholder="Select a period"
            aria-label="Period"
            data-testid="collection-period-picker"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Level</span>
          <EntityPicker
            value={levelId}
            onChange={setLevelId}
            lookup={finance.lookups.level}
            placeholder="All levels"
            aria-label="Level"
            allowClear
            data-testid="collection-level-picker"
          />
        </div>
      </div>
      <DataGrid
        columns={columns}
        data={[...rows]}
        sortable
        filterable
        emptyState={{
          icon: <CurrencyDollarIcon className="w-12 h-12 text-surface-muted-fg" />,
          title: 'Nothing billed for this period',
          description: 'Run invoice generation for the period, then return to this summary.',
        }}
      />
    </Card>
  );
};

const FeeCollectionSummaryPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <FeeCollectionSummaryPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default FeeCollectionSummaryPage;
