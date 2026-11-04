// ABOUTME: The subject analysis screen: per-learning-area averages, recorded-mark counts and the
// ABOUTME: pass rate only when a grading scale band declares one, all from canonical marks.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChartPieIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { DashboardMetric } from '@/components/ModuleDashboardShell';

import type { SubjectPerformance, TrendDirection } from '../../data/analyticsTypes';
import { AnalyticsEmptyCard, AnalyticsScopeCard } from './AnalyticsScopeCard';
import { useReportAnalyticsScope } from './useReportAnalyticsScope';

const percent = (value: number | null): string => (value === null ? 'Not recorded' : `${value}%`);
const score = (value: number | null): string => (value === null ? '—' : `${value}%`);

const AnalyticsSubjectPage: React.FC = () => {
  const { t } = useTranslation('analytics');
  const { scopeState, analytics, hasYear, loading, error } = useReportAnalyticsScope('optional');
  const subjects = analytics.subjectPassRates;

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const stats = useMemo(() => {
    const scored = subjects.filter((subject) => subject.averageScore !== null);
    const rated = subjects.filter((subject) => subject.passRate !== null);
    return {
      totalSubjects: subjects.length,
      avgPassRate:
        rated.length === 0
          ? null
          : Math.round(rated.reduce((sum, subject) => sum + (subject.passRate ?? 0), 0) / rated.length),
      avgScore:
        scored.length === 0
          ? null
          : Math.round(scored.reduce((sum, subject) => sum + (subject.averageScore ?? 0), 0) / scored.length),
      lowPassSubjects: rated.filter((subject) => (subject.passRate ?? 0) < 50),
    };
  }, [subjects]);

  const metrics: DashboardMetric[] = [
    {
      key: 'total-subjects',
      label: 'Total subjects',
      value: stats.totalSubjects,
      icon: <BookOpenIcon className="h-6 w-6 text-primary-700" />,
    },
    {
      key: 'avg-pass-rate',
      label: t('subject.passRate'),
      value: percent(stats.avgPassRate),
      description: stats.avgPassRate === null ? 'No grading scale band marks a pass' : undefined,
      icon: <CheckCircleIcon className="h-6 w-6 text-emerald-700" />,
    },
    {
      key: 'avg-score',
      label: t('subject.averageScore'),
      value: percent(stats.avgScore),
      icon: <ChartBarIcon className="h-6 w-6 text-violet-700" />,
    },
    {
      key: 'at-risk',
      label: 'At risk subjects',
      value: stats.avgPassRate === null ? 'Not recorded' : stats.lowPassSubjects.length,
      description:
        stats.avgPassRate === null
          ? 'Needs a pass band on the grading scale'
          : stats.lowPassSubjects.length > 0
            ? 'Pass rate below 50%'
            : 'All subjects healthy',
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-rose-700" />,
    },
  ];

  const trendIcon = (trend: TrendDirection | null) => {
    if (trend === 'up') return <ArrowUpIcon className="h-4 w-4 text-emerald-600" />;
    if (trend === 'down') return <ArrowDownIcon className="h-4 w-4 text-rose-600" />;
    return <span className="text-surface-muted-fg text-xs">--</span>;
  };

  const trendLabel = (trend: TrendDirection | null) => {
    if (trend === 'up') return t('subject.trendUp');
    if (trend === 'down') return t('subject.trendDown');
    if (trend === 'stable') return t('subject.trendStable');
    return 'Not recorded';
  };

  const passRateTextColor = (rate: number | null) => {
    if (rate === null) return 'text-surface-muted-fg bg-surface-accent';
    if (rate >= 80) return 'text-emerald-700 bg-emerald-100';
    if (rate >= 60) return 'text-amber-700 bg-amber-100';
    if (rate >= 50) return 'text-orange-700 bg-orange-100';
    return 'text-rose-700 bg-rose-100';
  };

  const comparisonColumns: DataGridColumn<SubjectPerformance>[] = [
    {
      key: 'subjectName',
      header: 'Subject',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5 text-primary-600" />
          <span className="font-medium text-surface-foreground">{value}</span>
        </div>
      ),
    },
    { key: 'studentCount', header: 'Students', sortable: true, align: 'center' },
    { key: 'examCount', header: 'Assessments', sortable: true, align: 'center' },
    { key: 'marksRecorded', header: 'Marks recorded', sortable: true, align: 'center' },
    {
      key: 'passRate',
      header: 'Pass rate',
      sortable: true,
      align: 'center',
      render: (value: number | null) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${passRateTextColor(value)}`}>
          {percent(value)}
        </span>
      ),
    },
    {
      key: 'averageScore',
      header: 'Avg score',
      sortable: true,
      align: 'center',
      render: (value: number | null, row: SubjectPerformance) => (
        <span className="text-sm font-medium">
          {score(value)}{' '}
          <span className="text-surface-muted-fg">
            (H: {row.highestScore === null ? '—' : `${row.highestScore}%`} / L: {row.lowestScore === null ? '—' : `${row.lowestScore}%`})
          </span>
        </span>
      ),
    },
    {
      key: 'medianScore',
      header: 'Median',
      sortable: true,
      align: 'center',
      render: (value: number | null) => <span className="text-sm">{score(value)}</span>,
    },
    {
      key: 'trend',
      header: 'Trend',
      sortable: true,
      align: 'center',
      render: (value: TrendDirection | null) => (
        <div className="flex items-center justify-center gap-1">
          {trendIcon(value)}
          <span className="text-xs text-surface-muted-fg">{trendLabel(value)}</span>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <ModuleDashboardShell
      title={t('subject.title')}
      subtitle="Subject averages from the marks the school has recorded; a pass rate appears only when the grading scale marks one."
      heroIcon={<BookOpenIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
    >
      <AnalyticsScopeCard scope={scopeState} period="optional">
        <div className="flex gap-2 md:justify-end">
          <Button
            variant={viewMode === 'cards' ? 'primary' : 'outline'}
            onClick={() => setViewMode('cards')}
            leftIcon={<ChartBarIcon className="h-4 w-4" />}
          >
            Cards
          </Button>
          <Button
            variant={viewMode === 'table' ? 'primary' : 'outline'}
            onClick={() => setViewMode('table')}
            leftIcon={<ChartPieIcon className="h-4 w-4" />}
          >
            Table
          </Button>
        </div>
      </AnalyticsScopeCard>

      {error !== null && (
        <AnalyticsEmptyCard title="Subject analysis" message="The academic record could not be read, so no subject figures are shown." />
      )}

      {error === null && !hasYear && (
        <AnalyticsEmptyCard title="Subject analysis" message="No academic year is set up, so there are no subjects to analyse." />
      )}

      {error === null && hasYear && !analytics.passRateRecorded && (
        <AnalyticsEmptyCard
          title="Pass rate"
          message="A pass rate is not recorded: no grading scale band in use marks a pass. The averages below come from recorded marks."
        />
      )}

      {error === null && hasYear && stats.lowPassSubjects.length > 0 && (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-rose-800">Low pass rate alert</h3>
              <p className="text-xs text-rose-700 mt-1">
                {stats.lowPassSubjects.length} subject{stats.lowPassSubjects.length > 1 ? 's' : ''} with a recorded pass rate below 50%:{' '}
                {stats.lowPassSubjects.map((subject) => subject.subjectName).join(', ')}
              </p>
            </div>
          </div>
        </Card>
      )}

      {error === null && hasYear && subjects.length === 0 && (
        <AnalyticsEmptyCard
          title="Subject analysis"
          message="No recorded mark falls in this scope, so there is no subject average to show."
        />
      )}

      {error === null && hasYear && subjects.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Card key={subject.subjectId} className="border-slate-200 bg-surface-card shadow-sm">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpenIcon className="h-5 w-5 text-primary-600" />
                    <h3 className="font-semibold text-surface-foreground">{subject.subjectName}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {trendIcon(subject.trend)}
                    <span className="text-xs text-surface-muted-fg">{trendLabel(subject.trend)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-surface-muted rounded-lg">
                    <p className="text-xs text-surface-muted-fg">Pass rate</p>
                    <p className={`text-xl font-bold ${subject.passRate === null ? 'text-surface-muted-fg' : subject.passRate >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {percent(subject.passRate)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-surface-muted rounded-lg">
                    <p className="text-xs text-surface-muted-fg">Avg score</p>
                    <p className="text-xl font-bold text-primary-600">{percent(subject.averageScore)}</p>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-surface-muted-fg">
                  <span>
                    Students: <strong className="text-surface-foreground">{subject.studentCount}</strong>
                  </span>
                  <span>
                    Assessments: <strong className="text-surface-foreground">{subject.examCount}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-surface-muted-fg">Highest</p>
                    <p className="font-semibold text-emerald-600">{score(subject.highestScore)}</p>
                  </div>
                  <div>
                    <p className="text-surface-muted-fg">Median</p>
                    <p className="font-semibold text-primary-600">{score(subject.medianScore)}</p>
                  </div>
                  <div>
                    <p className="text-surface-muted-fg">Lowest</p>
                    <p className="font-semibold text-rose-600">{score(subject.lowestScore)}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {error === null && hasYear && subjects.length > 0 && viewMode === 'table' && (
        <Card title={t('subject.compareSubjects')} className="border-slate-200 bg-surface-card shadow-sm">
          <DataGrid columns={comparisonColumns} data={subjects} loading={loading} sortable filterable />
        </Card>
      )}
    </ModuleDashboardShell>
  );
};

export const AnalyticsSubjectPageContent = AnalyticsSubjectPage;
export default AnalyticsSubjectPage;
