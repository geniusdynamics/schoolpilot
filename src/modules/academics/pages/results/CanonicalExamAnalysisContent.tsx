// ABOUTME: Canonical exam analysis: one class's subject means, pass rates, grade distribution and
// ABOUTME: merit order, computed by the assessment engine rather than rebuilt from legacy result tables.

import React, { useEffect, useMemo, useState } from 'react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DownloadIcon, PrinterIcon } from '@/components/ui/icons';
import { printReport } from '@/components/reports';
import { useCanonicalSessionActor } from '@/data/useCanonicalSessionActor';
import type { Id } from '@/domain/ids';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { useCanonicalAcademics } from '../../data/useCanonicalAcademics';
import { defaultAggregation } from './aggregation';
import { buildExamAnalysis, type MeritRow, type SubjectPerformance } from './analysis';
import { displayNumber } from './format';
import { useResults } from './useResults';

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const CanonicalExamAnalysisInner: React.FC = () => {
  const session = useCanonicalSessionActor();
  const canonical = useCanonicalAcademics();
  const [periodId, setPeriodId] = useState<Id<'academic_period'> | null>(null);
  const [classGroupId, setClassGroupId] = useState<Id<'class_group'> | null>(null);

  const aggregation = useMemo(() => defaultAggregation(), []);
  const results = useResults({
    actorId: session.actorId,
    role: session.role,
    periodId,
    classGroupId,
    aggregation,
  });

  useEffect(() => {
    if (periodId !== null) return;
    const current =
      canonical.academicPeriods.find((row) => row.status === 'current') ??
      canonical.academicPeriods[0];
    if (current) setPeriodId(current.id as Id<'academic_period'>);
  }, [periodId, canonical.academicPeriods]);

  useEffect(() => {
    if (classGroupId !== null) return;
    const first = canonical.classGroups.find((row) => results.reachableClassIds.has(row.id));
    if (first) setClassGroupId(first.id as Id<'class_group'>);
  }, [classGroupId, canonical.classGroups, results.reachableClassIds]);

  const analysis = useMemo(
    () => buildExamAnalysis(results.rows, results.areas),
    [results.rows, results.areas]
  );

  const subjectColumns: DataGridColumn<SubjectPerformance>[] = [
    { key: 'name', header: 'Subject', sortable: true, filterable: true },
    { key: 'sat', header: 'Sat', align: 'right', sortable: true },
    {
      key: 'mean',
      header: 'Mean %',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{displayNumber(String(value))}</span>,
    },
    {
      key: 'highest',
      header: 'Highest',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{displayNumber(String(value))}</span>,
    },
    {
      key: 'lowest',
      header: 'Lowest',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{displayNumber(String(value))}</span>,
    },
    {
      key: 'passRate',
      header: 'Pass rate',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{Number(value).toFixed(1)}%</span>,
    },
  ];

  const meritColumns: DataGridColumn<MeritRow>[] = [
    { key: 'rank', header: 'Rank', align: 'right', sortable: true },
    {
      key: 'learnerName',
      header: 'Learner',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    { key: 'admissionNumber', header: 'Adm no', sortable: true, filterable: true },
    {
      key: 'value',
      header: 'Aggregate',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{displayNumber(String(value))}</span>,
    },
    { key: 'grade', header: 'Grade', sortable: true },
  ];

  const exportCsv = () => {
    const subjectHeader = ['Subject', 'Sat', 'Mean %', 'Highest', 'Lowest', 'Pass rate'];
    const subjectRows = analysis.subjects.map((subject) =>
      [
        subject.name,
        subject.sat,
        subject.mean,
        subject.highest,
        subject.lowest,
        subject.passRate,
      ]
        .map(csvCell)
        .join(',')
    );
    const meritHeader = ['Rank', 'Learner', 'Adm no', 'Aggregate', 'Grade'];
    const meritRows = analysis.merit.map((row) =>
      [row.rank, row.learnerName, row.admissionNumber ?? '', row.value, row.grade ?? '']
        .map(csvCell)
        .join(',')
    );
    const blob = new Blob(
      [[subjectHeader.map(csvCell).join(','), ...subjectRows, '', meritHeader.map(csvCell).join(','), ...meritRows].join('\n')],
      { type: 'text/csv;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exam-analysis.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const reachableClassGroups = canonical.classGroups.filter((row) =>
    results.reachableClassIds.has(row.id)
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card title="Learners">
          <p className="font-mono text-2xl">{results.rows.length}</p>
        </Card>
        <Card title="Complete">
          <p className="font-mono text-2xl">{analysis.completeLearners}</p>
        </Card>
        <Card title="Mean aggregate">
          <p className="font-mono text-2xl">{displayNumber(String(analysis.meanAggregate))}</p>
        </Card>
        <Card title="Subjects">
          <p className="font-mono text-2xl">{analysis.subjects.length}</p>
        </Card>
      </div>

      <Card
        title="Exam performance"
        info="Subject means and the merit order come from the assessment engine's completed results. An incomplete result is counted in the learner total, never as a zero."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={analysis.subjects.length === 0}>
              <DownloadIcon className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void printReport()} disabled={analysis.subjects.length === 0}>
              <PrinterIcon className="h-4 w-4" />
              Print
            </Button>
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Period</span>
            <select
              value={periodId ?? ''}
              onChange={(event) => {
                setPeriodId((event.target.value || null) as Id<'academic_period'> | null);
                setClassGroupId(null);
              }}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">Select a period</option>
              {canonical.academicPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Class / stream</span>
            <select
              value={classGroupId ?? ''}
              onChange={(event) =>
                setClassGroupId((event.target.value || null) as Id<'class_group'> | null)
              }
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">Select a class</option>
              {reachableClassGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {results.state === 'loading' ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : results.state === 'no-scope' || results.state === 'outside-scope' ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {results.scope.reason}
          </p>
        ) : results.state === 'no-learners' || results.state === 'no-areas' || !results.hasMarks ? (
          <p className="py-8 text-center text-surface-muted-fg">
            {results.state === 'no-areas'
              ? 'No learning areas are set up for this class.'
              : results.state === 'no-learners'
                ? 'No active learner is in this class.'
                : 'No marks have been entered for this class and period yet.'}
          </p>
        ) : (
          <div className="space-y-6">
            <DataGrid
              columns={subjectColumns}
              data={[...analysis.subjects]}
              sortable
              filterable
              emptyState={{ title: 'No subject results', description: 'Enter marks first.' }}
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-surface-foreground">Grade distribution</span>
              {Object.entries(analysis.gradeTotals)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([grade, count]) => (
                  <Badge key={grade} variant="info" size="sm">
                    {grade}: {count}
                  </Badge>
                ))}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-surface-foreground">Merit order</h3>
              <DataGrid
                columns={meritColumns}
                data={[...analysis.merit]}
                sortable
                filterable
                emptyState={{ title: 'No complete result', description: 'A complete aggregate is needed to rank a learner.' }}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export const CanonicalExamAnalysisContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <CanonicalExamAnalysisInner />
  </CanonicalRepositoryProvider>
);
