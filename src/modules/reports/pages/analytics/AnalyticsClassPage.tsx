// ABOUTME: The class analysis screen: each class group's recorded average, marks coverage and
// ABOUTME: subject breakdown, computed from canonical marks for the scope the filter bar selects.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AcademicCapIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  UserGroupIcon,
  UsersIcon,
} from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import ModuleDashboardShell, { DashboardMetric } from '@/components/ModuleDashboardShell';

import type { ClassPerformance, TrendDirection } from '../../data/analyticsTypes';
import { AnalyticsEmptyCard, AnalyticsScopeCard } from './AnalyticsScopeCard';
import { useReportAnalyticsScope } from './useReportAnalyticsScope';

const percent = (value: number | null): string => (value === null ? 'Not recorded' : `${value}%`);

const AnalyticsClassPage: React.FC = () => {
  const { t } = useTranslation('analytics');
  const { scopeState, analytics, hasYear, loading, error } = useReportAnalyticsScope('optional');
  const classPerformances = analytics.classPerformances;

  const [selectedClass, setSelectedClass] = useState<ClassPerformance | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const stats = useMemo(() => {
    const scored = classPerformances.filter((row) => row.averageScore !== null);
    const passed = classPerformances.filter((row) => row.passRate !== null);
    const attended = classPerformances.filter((row) => row.attendanceRate !== null);
    const trended = classPerformances.filter((row) => row.trend !== null);
    return {
      totalClasses: classPerformances.length,
      avgScore:
        scored.length === 0
          ? null
          : Math.round(scored.reduce((sum, row) => sum + (row.averageScore ?? 0), 0) / scored.length),
      avgPassRate:
        passed.length === 0
          ? null
          : Math.round(passed.reduce((sum, row) => sum + (row.passRate ?? 0), 0) / passed.length),
      avgAttendance:
        attended.length === 0
          ? null
          : Math.round(attended.reduce((sum, row) => sum + (row.attendanceRate ?? 0), 0) / attended.length),
      decliningClasses: trended.filter((row) => row.trend === 'down').length,
      trendedClasses: trended.length,
    };
  }, [classPerformances]);

  const metrics: DashboardMetric[] = [
    {
      key: 'total-classes',
      label: 'Total Classes',
      value: stats.totalClasses,
      icon: <UserGroupIcon className="h-6 w-6 text-primary-700" />,
    },
    {
      key: 'avg-score',
      label: t('class.averageScore'),
      value: percent(stats.avgScore),
      icon: <ChartBarIcon className="h-6 w-6 text-violet-700" />,
    },
    {
      key: 'avg-pass-rate',
      label: t('class.passRate'),
      value: percent(stats.avgPassRate),
      icon: <CheckCircleIcon className="h-6 w-6 text-emerald-700" />,
    },
    {
      key: 'declining',
      label: 'Declining Classes',
      value: stats.trendedClasses === 0 ? 'Not recorded' : stats.decliningClasses,
      description:
        stats.trendedClasses === 0
          ? 'No class has two periods of marks to compare'
          : `${stats.trendedClasses} class${stats.trendedClasses === 1 ? '' : 'es'} with a comparable trend`,
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-rose-700" />,
    },
  ];

  const trendInfo = (trend: TrendDirection | null) => {
    if (trend === 'up') {
      return { icon: <ArrowUpIcon className="h-4 w-4 text-emerald-600" />, label: t('class.trendUp'), bg: 'bg-emerald-100', text: 'text-emerald-700' };
    }
    if (trend === 'down') {
      return { icon: <ArrowDownIcon className="h-4 w-4 text-rose-600" />, label: t('class.trendDown'), bg: 'bg-rose-100', text: 'text-rose-700' };
    }
    if (trend === 'stable') {
      return { icon: <span className="text-surface-muted-fg text-xs">--</span>, label: t('class.trendStable'), bg: 'bg-surface-accent', text: 'text-surface-muted-fg' };
    }
    return { icon: <span className="text-surface-muted-fg text-xs">--</span>, label: 'Not recorded', bg: 'bg-surface-accent', text: 'text-surface-muted-fg' };
  };

  const topSubject = (classPerf: ClassPerformance): string => {
    const ranked = classPerf.subjectBreakdown
      .filter((subject) => subject.averageScore !== null)
      .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0));
    return ranked[0]?.subjectName ?? 'Not recorded';
  };

  const columns: DataGridColumn<ClassPerformance>[] = [
    {
      key: 'className',
      header: 'Class',
      sortable: true,
      render: (value: string, row: ClassPerformance) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
            <AcademicCapIcon className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <span className="font-medium text-surface-foreground">{value}</span>
            {row.streamName && <span className="block text-xs text-surface-muted-fg">{row.streamName}</span>}
          </div>
        </div>
      ),
    },
    { key: 'studentCount', header: 'Students', sortable: true, align: 'center' },
    {
      key: 'marksRecorded',
      header: 'Marks recorded',
      sortable: true,
      align: 'center',
      render: (value: number, row: ClassPerformance) => (
        <span className="text-xs text-surface-foreground">
          {value}
          {row.marksExpected === null ? '' : ` / ${row.marksExpected}`}
        </span>
      ),
    },
    {
      key: 'averageScore',
      header: 'Avg score',
      sortable: true,
      align: 'center',
      render: (value: number | null) =>
        value === null ? (
          <span className="text-xs text-surface-muted-fg">Not recorded</span>
        ) : (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              value >= 80 ? 'bg-emerald-100 text-emerald-800' : value >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {value}%
          </span>
        ),
    },
    {
      key: 'passRate',
      header: 'Pass rate',
      sortable: true,
      align: 'center',
      render: (value: number | null) =>
        value === null ? (
          <span className="text-xs text-surface-muted-fg">Not recorded</span>
        ) : (
          <span className="text-xs font-medium text-surface-foreground">{value}%</span>
        ),
    },
    {
      key: 'topSubject',
      header: 'Highest subject',
      sortable: false,
      render: (_value: unknown, row: ClassPerformance) => (
        <span className="text-xs text-emerald-700 font-medium">{topSubject(row)}</span>
      ),
    },
    {
      key: 'trend',
      header: 'Trend',
      sortable: true,
      align: 'center',
      render: (value: TrendDirection | null) => {
        const info = trendInfo(value);
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${info.bg} ${info.text}`}>
            {info.icon}
            {info.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: ClassPerformance) => (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<EyeIcon className="h-4 w-4" />}
          onClick={() => {
            setSelectedClass(row);
            setShowDetailModal(true);
          }}
        >
          Details
        </Button>
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
      title={t('class.title')}
      subtitle="Class-level performance and subject breakdowns from the marks the school has recorded."
      heroIcon={<UserGroupIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
    >
      <AnalyticsScopeCard scope={scopeState} period="optional" />

      {error !== null && (
        <AnalyticsEmptyCard title="Class analysis" message="The academic record could not be read, so no class figures are shown." />
      )}

      {error === null && !hasYear && (
        <AnalyticsEmptyCard title="Class analysis" message="No academic year is set up, so there are no class groups to analyse." />
      )}

      {error === null && hasYear && classPerformances.length === 0 && (
        <AnalyticsEmptyCard title="Class analysis" message="No class group has active enrolments in this scope." />
      )}

      {error === null && hasYear && classPerformances.length > 0 && (
        <>
          <Card title="Class overview" className="border-slate-200 bg-surface-card shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {classPerformances.map((row) => {
                const trend = trendInfo(row.trend);
                return (
                  <button
                    key={row.classId}
                    onClick={() => {
                      setSelectedClass(row);
                      setShowDetailModal(true);
                    }}
                    className="text-left p-3 rounded-lg border border-surface-border hover:border-primary-300 hover:bg-primary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AcademicCapIcon className="h-5 w-5 text-primary-600" />
                        <span className="font-semibold text-surface-foreground">
                          {row.className}
                          {row.streamName ? ` · ${row.streamName}` : ''}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${trend.bg} ${trend.text}`}>
                        {trend.icon}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-surface-muted-fg">Score</p>
                        <p className="font-semibold text-primary-600">{percent(row.averageScore)}</p>
                      </div>
                      <div>
                        <p className="text-surface-muted-fg">Pass</p>
                        <p className="font-semibold text-emerald-600">{percent(row.passRate)}</p>
                      </div>
                      <div>
                        <p className="text-surface-muted-fg">Attend</p>
                        <p className="font-semibold text-violet-600">{percent(row.attendanceRate)}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-surface-muted-fg">
                      <span className="flex items-center gap-1">
                        <UsersIcon className="h-3 w-3" />
                        {row.studentCount}
                      </span>
                      <span className="flex items-center gap-1">
                        Marks: {row.marksRecorded}
                        {row.marksExpected === null ? '' : ` / ${row.marksExpected}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title={t('class.compareClasses')} className="border-slate-200 bg-surface-card shadow-sm">
            <DataGrid columns={columns} data={classPerformances} loading={loading} sortable filterable />
          </Card>
        </>
      )}

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedClass
                ? `${selectedClass.className}${selectedClass.streamName ? ` · ${selectedClass.streamName}` : ''}`
                : 'Class details'}
            </DialogTitle>
            <DialogDescription>Recorded performance for this class group.</DialogDescription>
          </DialogHeader>

          {selectedClass && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-primary-50 rounded-lg">
                  <p className="text-xs text-surface-muted-fg">Students</p>
                  <p className="text-xl font-bold text-primary-700">{selectedClass.studentCount}</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-surface-muted-fg">Avg score</p>
                  <p className="text-xl font-bold text-emerald-700">{percent(selectedClass.averageScore)}</p>
                </div>
                <div className="text-center p-3 bg-violet-50 rounded-lg">
                  <p className="text-xs text-surface-muted-fg">Pass rate</p>
                  <p className="text-xl font-bold text-violet-700">{percent(selectedClass.passRate)}</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-surface-muted-fg">Attendance</p>
                  <p className="text-xl font-bold text-amber-700">{percent(selectedClass.attendanceRate)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-surface-foreground mb-3">{t('class.subjectBreakdown')}</h3>
                {selectedClass.subjectBreakdown.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg">No subject has a recorded mark for this class.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedClass.subjectBreakdown.map((subject) => (
                      <div key={subject.subjectId} className="flex items-center gap-3 p-2 rounded-lg bg-surface-muted">
                        <div className="w-32 text-sm font-medium text-surface-foreground">{subject.subjectName}</div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                (subject.averageScore ?? 0) >= 80 ? 'bg-emerald-500' : (subject.averageScore ?? 0) >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${subject.averageScore ?? 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <span className="text-surface-muted-fg">Avg: </span>
                          <span className="font-semibold">{percent(subject.averageScore)}</span>
                          <span className="text-surface-muted-fg mx-1">|</span>
                          <span className="text-surface-muted-fg">Pass: </span>
                          <span className="font-semibold">{percent(subject.passRate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-surface-foreground mb-3">{t('class.topPerformers')}</h3>
                {selectedClass.topPerformers.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg">No learner has a recorded mark in this class.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedClass.topPerformers.map((learner) => (
                      <div key={learner.enrolmentId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted">
                        <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                          #{learner.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-foreground truncate">{learner.learnerName}</p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">{percent(learner.averageScore)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-surface-foreground mb-3">{t('class.bottomPerformers')}</h3>
                {selectedClass.bottomPerformers.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg">No learner has a recorded mark in this class.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedClass.bottomPerformers.map((learner) => (
                      <div key={learner.enrolmentId} className="flex items-center gap-3 p-2 rounded-lg border border-rose-100 bg-rose-50">
                        <div className="h-7 w-7 rounded-full bg-rose-100 flex items-center justify-center">
                          <ExclamationTriangleIcon className="h-4 w-4 text-rose-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-foreground truncate">{learner.learnerName}</p>
                          <p className="text-xs text-surface-muted-fg">Lowest recorded average in this class</p>
                        </div>
                        <span className="text-sm font-semibold text-rose-600">{percent(learner.averageScore)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModuleDashboardShell>
  );
};

export const AnalyticsClassPageContent = AnalyticsClassPage;
export default AnalyticsClassPage;
