// ABOUTME: The panels of the accounting reports: one per book of spec 05 section 8. Each panel
// ABOUTME: states the tie that proves its figures agree with the journal, then draws the shared
// ABOUTME: report table. The panels hold no arithmetic; every figure comes from the ledger reports.

import React from 'react';

import Card from '@/components/ui/Card';
import { formatMoney } from '@/domain/money';

import type {
  BalanceSheetReport,
  BookReport,
  BudgetVsActualReport,
  IncomeExpenditureReport,
  PeriodCloseReport,
  TrialBalanceReport,
} from './accountingReports';
import { ExportCsvButton, ReportTableView } from './ReportTableView';

/** A figure card the report panels share. */
const Figure: React.FC<{
  readonly label: string;
  readonly value: string;
  readonly tone?: 'default' | 'positive' | 'negative';
}> = ({ label, value, tone = 'default' }) => (
  <div className="rounded-lg border border-surface-border bg-surface-card p-4">
    <p className="text-sm font-medium text-surface-muted-fg">{label}</p>
    <p
      className={`mt-2 text-xl font-bold ${
        tone === 'positive'
          ? 'text-green-600'
          : tone === 'negative'
            ? 'text-red-600'
            : 'text-surface-foreground'
      }`}
    >
      {value}
    </p>
  </div>
);

/**
 * The badge that states whether a report ties to the journal.
 *
 * The acceptance of this task is that every report ties, so the badge is rendered from the
 * report's own tie flags rather than from the figures on screen.
 */
export const TieBadge: React.FC<{ readonly ties: boolean; readonly testId: string }> = ({
  ties,
  testId,
}) => (
  <span
    data-testid={testId}
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
      ties ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}
  >
    {ties ? 'Ties to the journal' : 'Does not tie to the journal'}
  </span>
);

const PanelHeader: React.FC<{
  readonly children: React.ReactNode;
  readonly table: TrialBalanceReport['table'];
  readonly filename: string;
}> = ({ children, table, filename }) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap items-center gap-3">{children}</div>
    <ExportCsvButton table={table} filename={filename} />
  </div>
);

export const TrialBalancePanel: React.FC<{ readonly report: TrialBalanceReport }> = ({ report }) => {
  const { ties } = report;
  const allTies = ties.balanced && ties.debitsEqualJournal && ties.creditsEqualJournal && ties.netsToZero;
  return (
    <Card title="Trial balance">
      <PanelHeader table={report.table} filename="trial-balance">
        <TieBadge ties={allTies} testId="tie-trial-balance" />
        <span className="text-sm text-surface-muted-fg">
          {report.balance.rows.length} account(s), as of the range end
        </span>
      </PanelHeader>
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Figure label="Total debits" value={formatMoney(report.balance.totalDebit)} />
        <Figure label="Total credits" value={formatMoney(report.balance.totalCredit)} />
        <Figure
          label="Balanced"
          value={report.balance.balanced ? 'Yes' : 'No'}
          tone={report.balance.balanced ? 'positive' : 'negative'}
        />
        <Figure label="Net" value={formatMoney(report.net)} />
      </div>
      <ReportTableView table={report.table} caption="Trial balance" testId="table-trial-balance" />
    </Card>
  );
};

export const IncomeExpenditurePanel: React.FC<{ readonly report: IncomeExpenditureReport }> = ({
  report,
}) => (
  <Card title="Income and expenditure">
    <PanelHeader table={report.table} filename="income-and-expenditure">
      <TieBadge ties={report.ties.netEqualsAccountMovement} testId="tie-income-expenditure" />
      <span className="text-sm text-surface-muted-fg">For the period</span>
    </PanelHeader>
    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
      <Figure label="Total revenue" value={formatMoney(report.totalRevenue)} tone="positive" />
      <Figure label="Total expenses" value={formatMoney(report.totalExpenses)} tone="negative" />
      <Figure
        label="Net income / (expenditure)"
        value={formatMoney(report.net)}
        tone={report.net.amount_minor >= 0 ? 'positive' : 'negative'}
      />
    </div>
    <ReportTableView
      table={report.table}
      caption="Income and expenditure"
      testId="table-income-expenditure"
    />
  </Card>
);

export const BalanceSheetPanel: React.FC<{ readonly report: BalanceSheetReport }> = ({ report }) => (
  <Card title="Balance sheet">
    <PanelHeader table={report.table} filename="balance-sheet">
      <TieBadge ties={report.ties.balances} testId="tie-balance-sheet" />
      <span className="text-sm text-surface-muted-fg">As of the range end</span>
    </PanelHeader>
    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      <Figure label="Total assets" value={formatMoney(report.totalAssets)} />
      <Figure label="Total liabilities" value={formatMoney(report.totalLiabilities)} />
      <Figure label="Total equity" value={formatMoney(report.totalEquity)} />
      <Figure label="Result for the period" value={formatMoney(report.retainedEarnings)} />
    </div>
    {report.unclassified.length > 0 && (
      <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        {report.unclassified.length} account(s) carry a code the chart does not classify; they are
        shown in the report and included in the balance, not dropped.
      </p>
    )}
    <ReportTableView table={report.table} caption="Balance sheet" testId="table-balance-sheet" />
  </Card>
);

export const BookPanel: React.FC<{ readonly title: string; readonly report: BookReport }> = ({
  title,
  report,
}) => (
  <Card title={title}>
    <PanelHeader table={report.table} filename={title.toLowerCase().replace(/\s+/g, '-')}>
      <TieBadge ties={report.ties.closingEqualsLedgerBalance} testId="tie-book" />
      <span className="text-sm text-surface-muted-fg">
        Account {report.accountCode} — {report.accountName}
      </span>
    </PanelHeader>
    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      <Figure label="Opening balance" value={formatMoney(report.opening)} />
      <Figure label="Receipts" value={formatMoney(report.totalReceipts)} tone="positive" />
      <Figure label="Payments" value={formatMoney(report.totalPayments)} tone="negative" />
      <Figure label="Closing balance" value={formatMoney(report.closing)} />
    </div>
    <ReportTableView table={report.table} caption={title} testId="table-book" />
  </Card>
);

export const BudgetVsActualPanel: React.FC<{ readonly report: BudgetVsActualReport }> = ({
  report,
}) => (
  <Card title="Budget versus actual">
    <PanelHeader table={report.table} filename="budget-vs-actual">
      <TieBadge
        ties={report.ties.actualsEqualLedger && report.ties.totalActualEqualsLedger}
        testId="tie-budget-vs-actual"
      />
      <span className="text-sm text-surface-muted-fg">{report.budgetSource}</span>
    </PanelHeader>
    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
      <Figure label="Total budget" value={formatMoney(report.totalBudget)} />
      <Figure label="Total actual" value={formatMoney(report.totalActual)} />
      <Figure
        label="Total variance"
        value={formatMoney(report.totalVariance)}
        tone={report.totalVariance.amount_minor >= 0 ? 'positive' : 'negative'}
      />
    </div>
    <ReportTableView
      table={report.table}
      caption="Budget versus actual"
      testId="table-budget-vs-actual"
    />
  </Card>
);

export const PeriodClosePanel: React.FC<{ readonly report: PeriodCloseReport }> = ({ report }) => (
  <Card title="Period close">
    <PanelHeader table={report.table} filename="period-close">
      <TieBadge ties={report.ties.noClosedPeriodEditable} testId="tie-period-close" />
      <span className="text-sm text-surface-muted-fg">
        The ledger owns the close; a closed period is never presented as editable.
      </span>
    </PanelHeader>
    {report.periods.length === 0 ? (
      <p className="text-sm text-surface-muted-fg">
        No period has been defined for this institution. The ledger closes a period with
        <code className="mx-1 rounded bg-surface-muted px-1">closePeriod</code>.
      </p>
    ) : (
      <ul className="space-y-3">
        {report.periods.map((period) => (
          <li
            key={period.id}
            data-testid={`period-${period.id}`}
            className="rounded-lg border border-surface-border p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{period.name}</span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                  period.status === 'closed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {period.status === 'closed' ? 'Closed' : 'Open'}
              </span>
            </div>
            <p className="mt-1 text-sm text-surface-muted-fg">
              {period.startDate} to {period.endDate}
            </p>
            {period.status === 'closed' ? (
              <p className="mt-1 text-sm text-surface-muted-fg" data-testid={`period-state-${period.id}`}>
                Closed{period.closedAt ? ` at ${period.closedAt}` : ''}
                {period.closedBy ? ` by ${period.closedBy}` : ''}
                {period.closeReason ? ` — ${period.closeReason}` : ''}. Nothing may be posted into it.
              </p>
            ) : (
              <p className="mt-1 text-sm text-surface-muted-fg" data-testid={`period-state-${period.id}`}>
                Open
                {period.reopenedAt ? `, reopened at ${period.reopenedAt}` : ''}
                {period.reopenedBy ? ` by ${period.reopenedBy}` : ''}
                {period.reopenReason ? ` — ${period.reopenReason}` : ''}.
              </p>
            )}
          </li>
        ))}
      </ul>
    )}
    <div className="mt-4">
      <ReportTableView table={report.table} caption="Period close" testId="table-period-close" />
    </div>
  </Card>
);
