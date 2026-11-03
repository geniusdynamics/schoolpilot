// ABOUTME: The read-only ledger accounts tab of the Expenses hub: the chart the ledger posts to,
// ABOUTME: its class, and which accounts are the cash book and the bank book. Nothing here writes.

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import {
  DEFAULT_LEDGER_ACCOUNT_MAPPING,
  type LedgerAccountMapping,
} from '@/domain/finance/ledger';

import { ledgerAccountRows, type LedgerAccountRow } from './ledgerAccounts';

const KIND_LABELS: Readonly<Record<LedgerAccountRow['kind'], string>> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
};

export interface LedgerAccountsContentProps {
  /** The chart to show. Defaults to the chart the ledger ships and posts against. */
  readonly mapping?: LedgerAccountMapping;
}

export const LedgerAccountsContent: React.FC<LedgerAccountsContentProps> = ({
  mapping = DEFAULT_LEDGER_ACCOUNT_MAPPING,
}) => {
  const { t } = useTranslation('finance');
  const rows = useMemo(() => ledgerAccountRows(mapping), [mapping]);

  const columns: DataGridColumn<LedgerAccountRow>[] = [
    {
      key: 'code',
      header: t('ledgerAccounts.code', 'Code'),
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-mono">{String(value)}</span>,
    },
    {
      key: 'name',
      header: t('ledgerAccounts.name', 'Account'),
      sortable: true,
      filterable: true,
    },
    {
      key: 'kind',
      header: t('ledgerAccounts.class', 'Class'),
      sortable: true,
      filterable: true,
      render: (value) => KIND_LABELS[value as LedgerAccountRow['kind']] ?? String(value),
    },
    {
      key: 'cashOrBank',
      header: t('ledgerAccounts.cashOrBank', 'Cash or bank'),
      sortable: true,
      render: (value) => (value === '—' ? <span className="text-surface-muted-fg">—</span> : String(value)),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-surface-muted-fg">
        {t(
          'ledgerAccounts.readOnly',
          'Adding or renaming an account is not available yet: the ledger’s chart of accounts is defined in the code this build ships.'
        )}
      </p>
      <Card
        title={t('ledgerAccounts.title', 'Ledger accounts')}
        info={t(
          'ledgerAccounts.subtitle',
          'The accounts the ledger posts to, with their class and whether they are the cash book or the bank book.'
        )}
        bodyClassName="p-0"
      >
        <DataGrid
          columns={columns}
          data={[...rows]}
          sortable
          filterable
          emptyState={{
            title: t('ledgerAccounts.emptyTitle', 'The ledger’s chart holds no accounts'),
            description: t(
              'ledgerAccounts.emptyDescription',
              'An account has to be defined in the ledger’s chart before money can post to it.'
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default LedgerAccountsContent;
