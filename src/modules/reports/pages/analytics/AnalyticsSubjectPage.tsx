import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChartBarIcon,
  BookOpenIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChartPieIcon,
} from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select, { SelectOption } from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { DashboardMetric } from '@/components/ModuleDashboardShell';
import { useAnalyticsData } from '../../data/useAnalyticsData';
import type { SubjectPassRate, GradeDistribution } from '../data/types';

const AnalyticsSubjectPage: React.FC = () => {
  const { t } = useTranslation('analytics');
  const { subjectPassRates, loading, selectedPeriod } = useAnalyticsData();

  const [periodFilter, setPeriodFilter] = useState<string>(selectedPeriod?.type || 'term');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Aggregate stats
  const stats = useMemo(() => {
    const rates = subjectPassRates || [];
    if (rates.length === 0) return { avgPassRate: 0, avgScore: 0, lowPassSubjects: 0, totalSubjects: 0, totalStudents: 0 };
    const avgPassRate = Math.round(rates.reduce((s, sp) => s + (sp.passRate || 0), 0) / rates.length);
    const avgScore = Math.round(rates.reduce((s, sp) => s + (sp.averageScore || 0), 0) / rates.length);
    const lowPassSubjects = rates.filter((sp) => (sp.passRate || 0) < 50).length;
    const totalStudents = rates.reduce((s, sp) => s + (sp.totalStudents || 0), 0);
    return { avgPassRate, avgScore, lowPassSubjects, totalSubjects: rates.length, totalStudents };
  }, [subjectPassRates]);

  const metrics: DashboardMetric[] = [
    {
      key: 'total-subjects',
      label: 'Total Subjects',
      value: stats.totalSubjects,
      icon: <BookOpenIcon className="h-6 w-6 text-primary-700" />,
    },
    {
      key: 'avg-pass-rate',
      label: t('subject.passRate'),
      value: `${stats.avgPassRate}%`,
      icon: <CheckCircleIcon className="h-6 w-6 text-emerald-700" />,
    },
    {
      key: 'avg-score',
      label: t('subject.averageScore'),
      value: `${stats.avgScore}%`,
      icon: <ChartBarIcon className="h-6 w-6 text-violet-700" />,
    },
    {
      key: 'at-risk',
      label: 'At Risk Subjects',
      value: stats.lowPassSubjects,
      description: stats.lowPassSubjects > 0 ? 'Pass rate below 50%' : 'All subjects healthy',
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-rose-700" />,
    },
  ];

  const periodOptions: SelectOption[] = [
    { value: 'term', label: t('period.term') },
    { value: 'semester', label: t('period.semester') },
    { value: 'year', label: t('period.year') },
    { value: 'custom', label: t('period.custom') },
  ];

  const trendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <ArrowUpIcon className="h-4 w-4 text-emerald-600" />;
    if (trend === 'down') return <ArrowDownIcon className="h-4 w-4 text-rose-600" />;
    return <span className="text-surface-muted-fg text-xs">--</span>;
  };

  const trendLabel = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return t('subject.trendUp');
    if (trend === 'down') return t('subject.trendDown');
    return t('subject.trendStable');
  };

  const passRateColor = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 60) return 'bg-amber-500';
    if (rate >= 50) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const passRateTextColor = (rate: number) => {
    if (rate >= 80) return 'text-emerald-700 bg-emerald-100';
    if (rate >= 60) return 'text-amber-700 bg-amber-100';
    if (rate >= 50) return 'text-orange-700 bg-orange-100';
    return 'text-rose-700 bg-rose-100';
  };

  // Grade Distribution Bar Component
  const GradeDistributionBar: React.FC<{ distribution: GradeDistribution[] }> = ({ distribution }) => {
    if (!distribution || distribution.length === 0) return null;
    const total = distribution.reduce((s, d) => s + d.count, 0);
    return (
      <div className="space-y-1">
        <div className="flex rounded-lg overflow-hidden h-3 bg-surface-accent">
          {distribution.map((d) => (
            <div
              key={d.grade}
              className={`transition-all ${
                d.grade.startsWith('A') ? 'bg-emerald-500' :
                d.grade.startsWith('B') ? 'bg-primary-500' :
                d.grade.startsWith('C') ? 'bg-amber-500' :
                d.grade.startsWith('D') ? 'bg-orange-500' :
                'bg-rose-500'
              }`}
              style={{ width: `${total > 0 ? (d.count / total) * 100 : 0}%` }}
              title={`${d.grade}: ${d.count} (${d.percentage}%)`}
            />
          ))}
        </div>
        <div className="flex gap-2 text-xs text-surface-muted-fg">
          {distribution.map((d) => (
            <span key={d.grade} className="flex items-center gap-1">
              <span className={`inline-block w-2 h-2 rounded-full ${
                d.grade.startsWith('A') ? 'bg-emerald-500' :
                d.grade.startsWith('B') ? 'bg-primary-500' :
                d.grade.startsWith('C') ? 'bg-amber-500' :
                d.grade.startsWith('D') ? 'bg-orange-500' :
                'bg-rose-500'
              }`} />
              {d.grade}: {d.count}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Table columns
  const comparisonColumns: DataGridColumn<SubjectPassRate>[] = [
    {
      key: 'subjectName',
      header: 'Subject',
      sortable: true,
      render: (value: string, row: SubjectPassRate) => (
        <div className="flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5 text-primary-600" />
          <span className="font-medium text-surface-foreground">{value}</span>
        </div>
      ),
    },
    { key: 'studentCount', header: 'Students', sortable: true, align: 'center' },
    { key: 'examCount', header: 'Exams', sortable: true, align: 'center' },
    {
      key: 'passRate',
      header: 'Pass Rate',
      sortable: true,
      align: 'center',
      render: (value: number) => (
        <div className="flex flex-col items-center gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${passRateTextColor(value)}`}>
            {value}%
          </span>
          <div className="w-16 bg-gray-200 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${passRateColor(value)}`} style={{ width: `${value}%` }} />
          </div>
        </div>
      ),
    },
    {
      key: 'averageScore',
      header: 'Avg Score',
      sortable: true,
      align: 'center',
      render: (value: number, row: SubjectPassRate) => (
        <span className="text-sm font-medium">
          {value}% <span className="text-surface-muted-fg">(H: {row.highestScore} / L: {row.lowestScore})</span>
        </span>
      ),
    },
    {
      key: 'medianScore',
      header: 'Median',
      sortable: true,
      align: 'center',
    },
    {
      key: 'trend',
      header: 'Trend',
      sortable: true,
      align: 'center',
      render: (value: 'up' | 'down' | 'stable') => (
        <div className="flex items-center justify-center gap-1">
          {trendIcon(value)}
          <span className="text-xs text-surface-muted-fg">{trendLabel(value)}</span>
        </div>
      ),
    },
  ];

  // Low pass rate subjects
  const lowPassSubjects = subjectPassRates.filter((sp) => sp.passRate < 50);

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
      subtitle="Analyze subject performance, grade distributions, and identify areas needing academic intervention."
      heroIcon={<BookOpenIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
    >
      {/* Controls */}
      <Card className="border-slate-200 bg-surface-card shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-surface-muted-fg mb-1">Academic Period</label>
            <Select
              value={periodFilter}
              onChange={(val) => setPeriodFilter(val as string)}
              options={periodOptions}
            />
          </div>
          <div className="flex gap-2 ml-auto">
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
        </div>
      </Card>

      {/* At-Risk Subjects Alert */}
      {lowPassSubjects.length > 0 && (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-rose-800">Low Pass Rate Alert</h3>
              <p className="text-xs text-rose-700 mt-1">
                {lowPassSubjects.length} subject{lowPassSubjects.length > 1 ? 's' : ''} with pass rate below 50%:
                {' '}{lowPassSubjects.map((s) => s.subjectName).join(', ')}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Subject Performance Cards */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjectPassRates.map((subject) => (
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
                    <p className="text-xs text-surface-muted-fg">Pass Rate</p>
                    <p className={`text-xl font-bold ${subject.passRate >= 80 ? 'text-emerald-600' : subject.passRate >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {subject.passRate}%
                    </p>
                  </div>
                  <div className="text-center p-2 bg-surface-muted rounded-lg">
                    <p className="text-xs text-surface-muted-fg">Avg Score</p>
                    <p className="text-xl font-bold text-primary-600">{subject.averageScore}%</p>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-surface-muted-fg">
                  <span>Students: <strong className="text-surface-foreground">{subject.studentCount}</strong></span>
                  <span>Exams: <strong className="text-surface-foreground">{subject.examCount}</strong></span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-surface-muted-fg">Highest</p>
                    <p className="font-semibold text-emerald-600">{subject.highestScore}</p>
                  </div>
                  <div>
                    <p className="text-surface-muted-fg">Median</p>
                    <p className="font-semibold text-primary-600">{subject.medianScore}</p>
                  </div>
                  <div>
                    <p className="text-surface-muted-fg">Lowest</p>
                    <p className="font-semibold text-rose-600">{subject.lowestScore}</p>
                  </div>
                </div>

                {/* Grade Distribution */}
                {subject.gradeDistribution.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-surface-muted-fg mb-2">{t('subject.gradeDistribution')}</p>
                    <GradeDistributionBar distribution={subject.gradeDistribution} />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Subject Comparison Table */}
      {viewMode === 'table' && (
        <Card title={t('subject.compareSubjects')} className="border-slate-200 bg-surface-card shadow-sm">
          <DataGrid
            columns={comparisonColumns}
            data={subjectPassRates}
            loading={loading}
            sortable
            filterable
          />
        </Card>
      )}
    </ModuleDashboardShell>
  );
};

export const AnalyticsSubjectPageContent = AnalyticsSubjectPage;
export default AnalyticsSubjectPage;
