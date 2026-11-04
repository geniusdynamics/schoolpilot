// ABOUTME: Student votehead statement on canonical finance rows: the shared scope bar chooses a year
// ABOUTME: and period, the learner picker chooses a learner, and every figure stays in minor units.

import React, { useCallback, useMemo, useState } from 'react';

import { AcademicScopeFilterBar } from '@/academic-scope/AcademicScopeFilterBar';
import { useAcademicScope } from '@/academic-scope/useAcademicScope';
import { printReport } from '@/components/reports/print';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DownloadIcon, PrinterIcon } from '@/components/ui/icons';
import { useCanonicalRepository } from '@/data/canonicalRepository';
import { useEntityQuery, useLookup } from '@/data/query';
import type { Id } from '@/domain/ids';

import {
  formatMoneyMinor,
  useCanonicalFinance,
} from '@/modules/finance/data/canonicalFinance';
import { CanonicalRepositoryProvider } from '@/modules/finance/data/canonicalRepository';

import {
  buildCanonicalStudentStatement,
  type CanonicalStatementRow,
  type CanonicalStudentStatement,
} from '../utils/canonicalStudentStatement';

type StatementGridRow = CanonicalStatementRow & { id: string };

interface GeneratedStatement {
  readonly statement: CanonicalStudentStatement;
  readonly learnerId: string;
  readonly periodId: string;
  readonly yearId: string;
}

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** Whole minor units as a plain decimal string, without a float step. */
const decimalMinor = (amountMinor: number): string => {
  const negative = amountMinor < 0;
  const absolute = Math.abs(amountMinor);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
};

const learnerLabel = (row: {
  readonly preferred_name?: string | null;
  readonly given_name: string;
  readonly family_name: string;
  readonly admission_number: string;
}): string => {
  const name = `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim();
  return row.admission_number ? `${name} (${row.admission_number})` : name;
};

export const StudentVoteheadStatementPageContent: React.FC = () => {
  const repository = useCanonicalRepository();
  const finance = useCanonicalFinance();
  const scope = useAcademicScope({ period: 'required' });
  const enrolmentsQuery = useEntityQuery(repository, 'enrolment', {}, { allPages: true });
  const learnerLookup = useLookup(repository, 'learner', { label: learnerLabel });

  const [selectedLearnerId, setSelectedLearnerId] = useState<Id<'learner'> | null>(null);
  const [generated, setGenerated] = useState<GeneratedStatement | null>(null);

  const year = scope.scope.year;
  const yearId = year?.id ?? '';
  const period =
    scope.scope.periodsOfYear.find((row) => row.id === scope.scope.effective.periodId) ?? null;
  const enrolments = useMemo(() => enrolmentsQuery.data?.items ?? [], [enrolmentsQuery.data]);

  // The selected learner is shown as the picker labels them; the year, class and stream come from
  // that learner's enrolment in the chosen year, not from a current-class shortcut on the learner.
  const learner = selectedLearnerId ? learnerLookup.resolve(selectedLearnerId) : undefined;
  const learnerName = learner
    ? `${learner.preferred_name ?? learner.given_name} ${learner.family_name}`.trim()
    : '';
  const admissionNumber = learner?.admission_number ?? '';

  const enrolment = useMemo(() => {
    if (!selectedLearnerId || !yearId) return undefined;
    const ofYear = enrolments.filter(
      (row) => row.learner_id === selectedLearnerId && row.academic_year_id === yearId
    );
    return (
      ofYear.find((row) => row.status === 'active' || row.status === 'repeating') ?? ofYear[0]
    );
  }, [enrolments, selectedLearnerId, yearId]);

  const classGroup = enrolment
    ? finance.classGroups.find((row) => row.id === enrolment.class_group_id)
    : undefined;
  const level = finance.levels.find((row) => row.id === (classGroup?.level_id ?? enrolment?.level_id));
  const className = level?.name ?? '';
  const streamName = classGroup?.name ?? '';

  const loading =
    !finance.ready ||
    scope.status === 'loading' ||
    enrolmentsQuery.status === 'loading' ||
    learnerLookup.status === 'loading';
  const loadError =
    finance.status === 'error' ||
    scope.status === 'error' ||
    enrolmentsQuery.status === 'error' ||
    learnerLookup.status === 'error';

  const statement =
    generated &&
    generated.learnerId === selectedLearnerId &&
    generated.periodId === period?.id &&
    generated.yearId === yearId
      ? generated.statement
      : null;

  const gridRows = useMemo<StatementGridRow[]>(
    () =>
      (statement?.rows ?? []).map((row, index) => ({
        ...row,
        id: `${row.date}-${row.reference}-${index}`,
      })),
    [statement]
  );

  const handleGenerate = useCallback(() => {
    if (!selectedLearnerId || !period) return;
    const next = buildCanonicalStudentStatement({
      learnerId: selectedLearnerId,
      periodId: period.id,
      periodStartDate: period.start_date,
      periodEndDate: period.end_date,
      invoices: finance.invoices,
      invoiceLines: finance.invoiceLines,
      payments: finance.payments,
      allocations: finance.allocations,
      creditNotes: finance.creditNotes,
    });
    setGenerated({
      statement: next,
      learnerId: selectedLearnerId,
      periodId: period.id,
      yearId,
    });
  }, [
    selectedLearnerId,
    period,
    yearId,
    finance.invoices,
    finance.invoiceLines,
    finance.payments,
    finance.allocations,
    finance.creditNotes,
  ]);

  const exportCsv = () => {
    if (!statement) return;
    const header = ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'];
    const lines = statement.rows.map((row) =>
      [
        row.date,
        row.description,
        row.reference,
        decimalMinor(row.debitMinor),
        decimalMinor(row.creditMinor),
        decimalMinor(row.balanceMinor),
      ]
        .map(csvCell)
        .join(',')
    );
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student-votehead-statement.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns: DataGridColumn<StatementGridRow>[] = [
    { key: 'date', header: 'Date', width: '7rem' },
    { key: 'description', header: 'Description' },
    {
      key: 'reference',
      header: 'Reference',
      render: (value) => <span className="font-mono">{String(value || '-')}</span>,
    },
    {
      key: 'debitMinor',
      header: 'Debit',
      align: 'right',
      render: (value) => (
        <span className="font-mono">
          {Number(value) === 0 ? '-' : formatMoneyMinor(Number(value))}
        </span>
      ),
    },
    {
      key: 'creditMinor',
      header: 'Credit',
      align: 'right',
      render: (value) => (
        <span className="font-mono text-green-700 dark:text-green-400">
          {Number(value) === 0 ? '-' : formatMoneyMinor(Number(value))}
        </span>
      ),
    },
    {
      key: 'balanceMinor',
      header: 'Balance',
      align: 'right',
      render: (value) => (
        <span className="font-mono font-medium">{formatMoneyMinor(Number(value))}</span>
      ),
    },
  ];

  return (
    <Card
      title="Student votehead statement"
      info="Charges from the selected period against payments allocated in it, with the balance carried in from earlier periods."
      actions={
        statement && statement.rows.length > 0 ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              <DownloadIcon className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void printReport()}>
              <PrinterIcon className="h-4 w-4" />
              Print
            </Button>
          </div>
        ) : undefined
      }
    >
      <AcademicScopeFilterBar scope={scope} period="required" className="mb-4">
        <EntityPicker
          label="Learner"
          aria-label="Learner"
          value={selectedLearnerId}
          onChange={setSelectedLearnerId}
          lookup={learnerLookup}
          placeholder="Choose a learner"
          disabled={loading}
          allowClear
          data-testid="learner-picker"
        />
        <div className="flex items-end">
          <Button
            onClick={handleGenerate}
            disabled={loading || loadError || !selectedLearnerId || !period}
            className="h-10 w-full"
            data-testid="generate-statement"
          >
            Generate statement
          </Button>
        </div>
      </AcademicScopeFilterBar>

      {loadError ? (
        <p role="alert" className="py-6 text-center text-sm text-red-600 dark:text-red-400">
          The statement could not be loaded. Check the finance data and try again.
        </p>
      ) : loading ? (
        <p role="status" className="py-6 text-center text-sm text-surface-muted-fg">
          Loading finance data…
        </p>
      ) : !year || !period ? (
        <p className="py-6 text-center text-sm text-surface-muted-fg">
          Choose a year with a period to build a statement.
        </p>
      ) : statement ? (
        <>
          <section
            data-testid="statement-header"
            className="mb-4 rounded-md bg-surface-muted p-3"
            aria-label="Statement details"
          >
            <p className="font-semibold">
              Student: {learnerName}
              {admissionNumber ? ` · ${admissionNumber}` : ''}
            </p>
            <p className="text-sm">
              Year: {year.name} · Class: {className || '—'} · Stream: {streamName || '—'}
            </p>
            <p className="text-sm">
              Period: {period.name} · {year.name}
            </p>
            <p className="text-sm" data-testid="statement-opening">
              Opening balance: {formatMoneyMinor(statement.openingBalanceMinor)}
            </p>
          </section>

          {statement.rows.length === 0 ? (
            <p data-testid="statement-empty" className="py-6 text-center text-sm text-surface-muted-fg">
              No transactions in this period. The opening balance is the closing balance.
            </p>
          ) : (
            <DataGrid
              columns={columns}
              data={gridRows}
              sortable={false}
              filterable={false}
              emptyState="No transactions in this period."
            />
          )}

          <div data-testid="statement-closing" className="mt-4 text-right text-lg font-bold">
            Closing balance: {formatMoneyMinor(statement.closingBalanceMinor)}
          </div>
        </>
      ) : (
        <p data-testid="statement-prompt" className="py-6 text-center text-sm text-surface-muted-fg">
          Choose a learner and a period, then generate the statement.
        </p>
      )}
    </Card>
  );
};

const StudentVoteheadStatementPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <StudentVoteheadStatementPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default StudentVoteheadStatementPage;
