import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserGroupIcon,
  AcademicCapIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select, { SelectOption } from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import ModuleDashboardShell, { DashboardMetric } from '@/components/ModuleDashboardShell';
import { useAnalyticsData } from '../../data/useAnalyticsData';
import type { ClassPerformance } from '../data/types';

const AnalyticsClassPage: React.FC = () => {
  const { t } = useTranslation('analytics');
  const { classPerformances, loading, selectedPeriod, setSelectedPeriod } = useAnalyticsData();

  const [periodFilter, setPeriodFilter] = useState<string>(selectedPeriod?.type || 'term');
  const [selectedClass, setSelectedClass] = useState<ClassPerformance | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Aggregate stats
  const stats = useMemo(() => {
    if (classPerformances.length === 0) {
      return { totalClasses: 0, avgScore: 0, avgPassRate: 0, avgAttendance: 0, decliningClasses: 0 };
    }
    const avgScore = Math.round(classPerformances.reduce((s, c) => s + c.averageScore, 0) / classPerformances.length);
    const avgPassRate = Math.round(classPerformances.reduce((s, c) => s + c.passRate, 0) / classPerformances.length);
    const avgAttendance = Math.round(classPerformances.reduce((s, c) => s + c.attendanceRate, 0) / classPerformances.length);
    const decliningClasses = classPerformances.filter((c) => c.trend === 'down').length;
    return { totalClasses: classPerformances.length, avgScore, avgPassRate, avgAttendance, decliningClasses };
  }, [classPerformances]);

  const metrics: DashboardMetric[] = [
    {
      key: 'total-classes',
      label: 'Total Classes',
      value: stats.totalClasses,
      icon: <UserGroupIcon className="h-6 w-6 text-blue-700" />,
    },
    {
      key: 'avg-score',
      label: t('class.averageScore'),
      value: `${stats.avgScore}%`,
      icon: <ChartBarIcon className="h-6 w-6 text-violet-700" />,
    },
    {
      key: 'avg-pass-rate',
      label: t('class.passRate'),
      value: `${stats.avgPassRate}%`,
      icon: <CheckCircleIcon className="h-6 w-6 text-emerald-700" />,
    },
    {
      key: 'declining',
      label: 'Declining Classes',
      value: stats.decliningClasses,
      description: stats.decliningClasses > 0 ? 'Need attention' : 'All stable or improving',
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-rose-700" />,
    },
  ];

  const periodOptions: SelectOption[] = [
    { value: 'term', label: t('period.term') },
    { value: 'semester', label: t('period.semester') },
    { value: 'year', label: t('period.year') },
    { value: 'custom', label: t('period.custom') },
  ];

  const trendInfo = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') {
      return {
        icon: <ArrowUpIcon className="h-4 w-4 text-emerald-600" />,
        label: t('class.trendUp'),
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
      };
    }
    if (trend === 'down') {
      return {
        icon: <ArrowDownIcon className="h-4 w-4 text-rose-600" />,
        label: t('class.trendDown'),
        bg: 'bg-rose-100',
        text: 'text-rose-700',
      };
    }
    return {
      icon: <span className="text-gray-400 text-xs">--</span>,
      label: t('class.trendStable'),
      bg: 'bg-gray-100',
      text: 'text-gray-600',
    };
  };

  // Find the top subject for a class
  const getTopSubject = (classPerf: ClassPerformance): string => {
    if (!classPerf.subjectBreakdown || classPerf.subjectBreakdown.length === 0) return 'N/A';
    const sorted = [...classPerf.subjectBreakdown].sort((a, b) => b.passRate - a.passRate);
    return sorted[0].subjectName;
  };

  // DataGrid columns
  const columns: DataGridColumn<ClassPerformance>[] = [
    {
      key: 'className',
      header: 'Class',
      sortable: true,
      render: (value: string, row: ClassPerformance) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <AcademicCapIcon className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <span className="font-medium text-gray-900">{value}</span>
            {row.streamName && (
              <span className="block text-xs text-gray-500">{row.streamName}</span>
            )}
          </div>
        </div>
      ),
    },
    { key: 'studentCount', header: 'Students', sortable: true, align: 'center' },
    {
      key: 'averageScore',
      header: 'Avg Score',
      sortable: true,
      align: 'center',
      render: (value: number) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          value >= 80 ? 'bg-emerald-100 text-emerald-800' :
          value >= 60 ? 'bg-amber-100 text-amber-800' :
          'bg-rose-100 text-rose-800'
        }`}>
          {value}%
        </span>
      ),
    },
    {
      key: 'passRate',
      header: 'Pass Rate',
      sortable: true,
      align: 'center',
      render: (value: number) => (
        <div className="flex items-center gap-1 justify-center">
          <div className="w-12 bg-gray-200 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${
              value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-rose-500'
            }`} style={{ width: `${value}%` }} />
          </div>
          <span className="text-xs font-medium">{value}%</span>
        </div>
      ),
    },
    {
      key: 'topSubject',
      header: 'Top Subject',
      sortable: false,
      render: (_value: any, row: ClassPerformance) => {
        const top = getTopSubject(row);
        return <span className="text-xs text-emerald-700 font-medium">{top}</span>;
      },
    },
    {
      key: 'trend',
      header: 'Trend',
      sortable: true,
      align: 'center',
      render: (value: 'up' | 'down' | 'stable') => {
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
      key: 'needsAttention',
      header: 'Needs Attention',
      sortable: true,
      align: 'center',
      render: (_value: any, row: ClassPerformance) => {
        const count = row.bottomPerformers?.length || 0;
        if (count === 0) return <span className="text-xs text-gray-400">None</span>;
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            <ExclamationTriangleIcon className="h-3 w-3" />
            {count} student{count > 1 ? 's' : ''}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_value: any, row: ClassPerformance) => (
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

  // Class performance overview cards
  const overviewCards = useMemo(() => {
    return classPerformances.map((cp) => ({
      id: cp.classId,
      name: cp.className,
      stream: cp.streamName,
      students: cp.studentCount,
      avgScore: cp.averageScore,
      passRate: cp.passRate,
      attendance: cp.attendanceRate,
      trend: cp.trend,
      topPerformer: cp.topPerformers?.[0]?.studentName,
      strugglingCount: cp.bottomPerformers?.length || 0,
    }));
  }, [classPerformances]);

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
      subtitle="Monitor class-level performance, identify struggling students, and compare class outcomes across subjects."
      heroIcon={<UserGroupIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
    >
      {/* Period Filter */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Period</label>
            <Select
              value={periodFilter}
              onChange={(val) => setPeriodFilter(val as string)}
              options={periodOptions}
            />
          </div>
        </div>
      </Card>

      {/* Class Overview Cards */}
      <Card title="Class Overview" className="border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {overviewCards.map((card) => {
            const trend = trendInfo(card.trend);
            return (
              <button
                key={card.id}
                onClick={() => {
                  const found = classPerformances.find((c) => c.classId === card.id);
                  if (found) {
                    setSelectedClass(found);
                    setShowDetailModal(true);
                  }
                }}
                className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AcademicCapIcon className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">{card.name}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${trend.bg} ${trend.text}`}>
                    {trend.icon}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-gray-500">Score</p>
                    <p className="font-semibold text-blue-600">{card.avgScore}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pass</p>
                    <p className="font-semibold text-emerald-600">{card.passRate}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Attend</p>
                    <p className="font-semibold text-violet-600">{card.attendance}%</p>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <UsersIcon className="h-3 w-3" />
                    {card.students}
                  </span>
                  {card.strugglingCount > 0 && (
                    <span className="flex items-center gap-1 text-rose-600">
                      <ExclamationTriangleIcon className="h-3 w-3" />
                      {card.strugglingCount} at risk
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Class Comparison DataGrid */}
      <Card title={t('class.compareClasses')} className="border-slate-200 bg-white shadow-sm">
        <DataGrid
          columns={columns}
          data={classPerformances}
          loading={loading}
          sortable
          filterable
        />
      </Card>

      {/* Class Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedClass ? `${selectedClass.className}${selectedClass.streamName ? ` - ${selectedClass.streamName}` : ''}` : 'Class Details'}
            </DialogTitle>
            <DialogDescription>
              Detailed performance analysis for this class
            </DialogDescription>
          </DialogHeader>

          {selectedClass && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-500">Students</p>
                  <p className="text-xl font-bold text-blue-700">{selectedClass.studentCount}</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-gray-500">Avg Score</p>
                  <p className="text-xl font-bold text-emerald-700">{selectedClass.averageScore}%</p>
                </div>
                <div className="text-center p-3 bg-violet-50 rounded-lg">
                  <p className="text-xs text-gray-500">Pass Rate</p>
                  <p className="text-xl font-bold text-violet-700">{selectedClass.passRate}%</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-gray-500">Attendance</p>
                  <p className="text-xl font-bold text-amber-700">{selectedClass.attendanceRate}%</p>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('class.subjectBreakdown')}</h3>
                <div className="space-y-2">
                  {selectedClass.subjectBreakdown.map((sb) => (
                    <div key={sb.subjectId} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <div className="w-24 text-sm font-medium text-gray-700">{sb.subjectName}</div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              sb.passRate >= 80 ? 'bg-emerald-500' :
                              sb.passRate >= 60 ? 'bg-amber-500' :
                              'bg-rose-500'
                            }`}
                            style={{ width: `${sb.averageScore}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-gray-500">Avg: </span>
                        <span className="font-semibold">{sb.averageScore}%</span>
                        <span className="text-gray-400 mx-1">|</span>
                        <span className="text-gray-500">Pass: </span>
                        <span className="font-semibold">{sb.passRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 5 Students */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('class.topPerformers')}</h3>
                {selectedClass.topPerformers && selectedClass.topPerformers.length > 0 ? (
                  <div className="space-y-1">
                    {selectedClass.topPerformers.slice(0, 5).map((student) => (
                      <div key={student.studentId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                          #{student.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{student.studentName}</p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">{student.averageScore}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>

              {/* Struggling Students */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('class.bottomPerformers')}</h3>
                {selectedClass.bottomPerformers && selectedClass.bottomPerformers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClass.bottomPerformers.map((student) => {
                      const trendStyle =
                        student.trend === 'improving' ? 'text-emerald-600 bg-emerald-50' :
                        student.trend === 'declining' ? 'text-rose-600 bg-rose-50' :
                        'text-gray-600 bg-gray-50';
                      const trendLabel =
                        student.trend === 'improving' ? 'Improving' :
                        student.trend === 'declining' ? 'Declining' :
                        'Stable';
                      return (
                        <div key={student.studentId} className="flex items-center gap-3 p-2 rounded-lg border border-rose-100 bg-rose-50">
                          <div className="h-7 w-7 rounded-full bg-rose-100 flex items-center justify-center">
                            <ExclamationTriangleIcon className="h-4 w-4 text-rose-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{student.studentName}</p>
                            <p className="text-xs text-gray-500 truncate">
                              Struggling in: {student.subjects.join(', ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trendStyle}`}>
                              {trendLabel}
                            </span>
                            <span className="text-sm font-semibold text-rose-600">{student.averageScore}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No struggling students identified</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModuleDashboardShell>
  );
};

export default AnalyticsClassPage;
