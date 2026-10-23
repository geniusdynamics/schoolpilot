// ABOUTME: The accounting reports hub of spec 05 section 8: the trial balance, the income-and-
// ABOUTME: expenditure statement, the balance sheet, the cash and bank books, budget versus actual
// ABOUTME: and the period-close view. Every report is derived from the ledger's posted journal
// ABOUTME: entries; the page presents them and exports them, and never recomputes a balance itself.

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  ChartBarIcon,
  DocumentReportIcon,
  ScaleIcon,
} from '@/components/ui/icons';
import type { LedgerService } from '@/domain/finance/ledger';

import {
  BalanceSheetPanel,
  BookPanel,
  BudgetVsActualPanel,
  IncomeExpenditurePanel,
  PeriodClosePanel,
  TrialBalancePanel,
} from './reportPanels';
import { useAccountingReports } from './useAccountingReports';
import type { BudgetLine } from './accountingReports';

export interface AccountingReportsPageProps {
  /** A ledger the caller already holds. Takes precedence over `adapter`. */
  readonly ledger?: LedgerService | null;
  /** The storage the ledger is built over when no service is supplied. */
  readonly adapter?: SqliteAdapter | null;
  /** The institution whose books are reported. */
  readonly institutionId?: string;
  /** The stored budget figures the budget-versus-actual report compares against. */
  readonly budget?: readonly BudgetLine[];
}

/** The reason the reports are unavailable while the canonical data layer is not open. */
const NOT_CONNECTED_REASON =
  'The accounting reports read the double-entry ledger on the canonical database. The canonical ' +
  'data layer is not open, so the ledger has not been opened either: the app opens it at start-up, ' +
  'and a caller outside that path hands this page the ledger (or the SQLite adapter it is built ' +
  'over) as a prop.';

/**
 * The accounting reports hub.
 *
 * Every report is derived from the ledger in {@link useAccountingReports}; the page only chooses
 * the range and the tab. The range's end is also the date the trial balance and the balance sheet
 * are as of, so a period chosen here filters the statement and sets the position date.
 */
const AccountingReportsPage: React.FC<AccountingReportsPageProps> = (props) => {
  const { t } = useTranslation('finance');

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [periodId, setPeriodId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('trial-balance');

  const reports = useAccountingReports({
    ...(props.ledger !== undefined ? { ledger: props.ledger } : {}),
    ...(props.adapter !== undefined ? { adapter: props.adapter } : {}),
    ...(props.institutionId !== undefined ? { institutionId: props.institutionId } : {}),
    ...(props.budget !== undefined ? { budget: props.budget } : {}),
    from: from === '' ? null : from,
    to: to === '' ? null : to,
  });

  const onPeriodChange = useCallback(
    (id: string) => {
      setPeriodId(id);
      const period = reports.periods.find((candidate) => candidate.id === id);
      if (!period) return;
      setFrom(period.startDate);
      setTo(period.endDate);
    },
    [reports.periods]
  );

  const tabs = useMemo(
    () => [
      { id: 'trial-balance', label: t('trialBalance.title', 'Trial Balance'), icon: <ScaleIcon className="w-4 h-4" /> },
      {
        id: 'income-expenditure',
        label: t('incomeStatement.title', 'Income & Expenditure'),
        icon: <ChartBarIcon className="w-4 h-4" />,
      },
      {
        id: 'balance-sheet',
        label: t('balanceSheet.title', 'Balance Sheet'),
        icon: <BuildingLibraryIcon className="w-4 h-4" />,
      },
      { id: 'cash-book', label: t('cashBook.title', 'Cash Book'), icon: <BanknotesIcon className="w-4 h-4" /> },
      { id: 'bank-book', label: t('bankBook.title', 'Bank Book'), icon: <BuildingOffice2Icon className="w-4 h-4" /> },
      {
        id: 'budget-vs-actual',
        label: t('budgetVsActual.title', 'Budget vs Actual'),
        icon: <DocumentReportIcon className="w-4 h-4" />,
      },
      {
        id: 'period-close',
        label: t('periodClose.title', 'Period Close'),
        icon: <CalendarIcon className="w-4 h-4" />,
      },
    ],
    [t]
  );

  const periodOptions = useMemo(
    () => [
      { value: '', label: 'All periods' },
      ...reports.periods.map((period) => ({
        value: period.id,
        label: `${period.name} (${period.status})`,
      })),
    ],
    [reports.periods]
  );

  if (reports.status === 'unavailable') {
    return (
      <Card title="Accounting reports">
        <p role="status" className="font-medium text-surface-foreground">
          The ledger is not connected
        </p>
        <p className="mt-2 text-sm text-surface-muted-fg">{NOT_CONNECTED_REASON}</p>
      </Card>
    );
  }

  if (reports.status === 'error') {
    return (
      <Card title="Accounting reports">
        <p role="alert" className="font-medium text-red-600">
          The ledger could not be read.
        </p>
        <p className="mt-2 text-sm text-surface-muted-fg">{String(reports.error)}</p>
      </Card>
    );
  }

  if (reports.status === 'loading') {
    return (
      <Card title="Accounting reports">
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <Spinner />
          <span className="ml-2 text-sm text-surface-muted-fg">Reading the ledger…</span>
        </div>
      </Card>
    );
  }

  const panels: Record<string, React.ReactNode> = {
    'trial-balance': reports.trialBalance ? <TrialBalancePanel report={reports.trialBalance} /> : null,
    'income-expenditure': reports.incomeExpenditure ? (
      <IncomeExpenditurePanel report={reports.incomeExpenditure} />
    ) : null,
    'balance-sheet': reports.balanceSheet ? <BalanceSheetPanel report={reports.balanceSheet} /> : null,
    'cash-book': reports.cashBook ? (
      <BookPanel title="Cash book" report={reports.cashBook} />
    ) : null,
    'bank-book': reports.bankBook ? (
      <BookPanel title="Bank book" report={reports.bankBook} />
    ) : null,
    'budget-vs-actual': reports.budgetVsActual ? (
      <BudgetVsActualPanel report={reports.budgetVsActual} />
    ) : null,
    'period-close': reports.periodClose ? <PeriodClosePanel report={reports.periodClose} /> : null,
  };

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('accountingReports.title', 'Accounting Reports')}
        subtitle={t(
          'accountingReports.subtitle',
          'Trial balance, income and expenditure, balance sheet, cash and bank books, budget versus actual, period close'
        )}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="compact"
        colorScheme="indigo"
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-surface-foreground">From</span>
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              aria-label="From date"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-surface-foreground">To</span>
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-label="To date"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Period</span>
            <Select
              value={periodId}
              onChange={(event) => onPeriodChange(event.target.value)}
              options={periodOptions}
              aria-label="Period"
            />
          </div>
        </div>
        {panels[activeTab] ?? <p className="text-sm text-surface-muted-fg">Nothing to report.</p>}
      </PageHeaderWithTabs>
    </div>
  );
};

export default AccountingReportsPage;
