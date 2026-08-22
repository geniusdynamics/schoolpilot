import React, { useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { ChartBarIcon, CheckCircleIcon, ClockIcon, DocumentTextIcon } from '@/components/ui/icons';
import { useAssignmentsData } from '../../data/useAssignmentsData';
import { AssignmentStatus, SubmissionStatus } from '../../data/types';
import { useTranslation } from 'react-i18next';

interface AssignmentPerformance {
  id: string;
  title: string;
  subjectName: string | null | undefined;
  classStreamName: string | null | undefined;
  status: AssignmentStatus;
  totalSubmissions: number;
  submittedCount: number;
  gradedCount: number;
  submissionRate: number;
  avgScore: number | null;
  dueDate: string;
}

const AssignmentAnalyticsPage: React.FC = () => {
  const { t } = useTranslation('assignments');
  const { assignments, submissions, loading } = useAssignmentsData();

  // Overall analytics
  const overallStats = useMemo(() => {
    const totalAssignments = assignments.length;
    const totalSubmissions = submissions.length;
    const submittedCount = submissions.filter(
      s => s.status !== SubmissionStatus.PENDING_REVIEW
    ).length;
    const gradedCount = submissions.filter(
      s => s.status === SubmissionStatus.GRADED || s.status === SubmissionStatus.RETURNED
    ).length;
    const submissionRate = totalSubmissions > 0
      ? Math.round((submittedCount / totalSubmissions) * 100)
      : 0;
    const gradingRate = submittedCount > 0
      ? Math.round((gradedCount / submittedCount) * 100)
      : 0;
    const scores = submissions
      .filter(s => s.score !== null && s.score !== undefined)
      .map(s => s.score as number);
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    return {
      totalAssignments,
      totalSubmissions,
      submittedCount,
      gradedCount,
      submissionRate,
      gradingRate,
      avgScore,
    };
  }, [assignments, submissions]);

  // Submissions by status (for pie chart)
  const submissionsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(SubmissionStatus).forEach(status => {
      counts[status] = submissions.filter(s => s.status === status).length;
    });
    return counts;
  }, [submissions]);

  // Assignments by status
  const assignmentsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(AssignmentStatus).forEach(status => {
      counts[status] = assignments.filter(a => a.status === status).length;
    });
    return counts;
  }, [assignments]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const scores = submissions
      .filter(s => s.score !== null && s.score !== undefined && s.maxScore)
      .map(s => ({
        score: s.score as number,
        maxScore: s.maxScore as number,
      }));

    const percentages = scores.map(s => (s.score / s.maxScore) * 100);

    const ranges = [
      { label: '0-20%', min: 0, max: 20, count: 0, color: 'bg-red-500' },
      { label: '21-40%', min: 21, max: 40, count: 0, color: 'bg-orange-500' },
      { label: '41-60%', min: 41, max: 60, count: 0, color: 'bg-yellow-500' },
      { label: '61-80%', min: 61, max: 80, count: 0, color: 'bg-blue-500' },
      { label: '81-100%', min: 81, max: 100, count: 0, color: 'bg-green-500' },
    ];

    percentages.forEach(pct => {
      const range = ranges.find(r => pct >= r.min && pct <= r.max);
      if (range) range.count++;
    });

    return ranges;
  }, [submissions]);

  // Assignment performance summary
  const assignmentPerformance: AssignmentPerformance[] = useMemo(() => {
    return assignments.map(assignment => {
      const assignmentSubs = submissions.filter(s => s.assignmentId === assignment.id);
      const total = assignmentSubs.length;
      const submitted = assignmentSubs.filter(
        s => s.status !== SubmissionStatus.PENDING_REVIEW
      ).length;
      const graded = assignmentSubs.filter(
        s => s.status === SubmissionStatus.GRADED || s.status === SubmissionStatus.RETURNED
      ).length;
      const scores = assignmentSubs
        .filter(s => s.score !== null && s.score !== undefined)
        .map(s => s.score as number);
      const avg = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;

      return {
        id: assignment.id,
        title: assignment.title,
        subjectName: assignment.subjectName,
        classStreamName: assignment.classStreamName,
        status: assignment.status,
        totalSubmissions: total,
        submittedCount: submitted,
        gradedCount: graded,
        submissionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
        avgScore: avg,
        dueDate: assignment.dueDate,
      };
    });
  }, [assignments, submissions]);

  const performanceColumns: DataGridColumn<AssignmentPerformance>[] = [
    {
      key: 'title',
      header: t('assignment.fields.title'),
      sortable: true,
      filterable: true,
      width: 250,
      render: (value, item) => (
        <div>
          <span className="font-medium text-gray-900">{value}</span>
          {item.subjectName && (
            <p className="text-xs text-gray-500">{item.subjectName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'classStreamName',
      header: t('assignment.fields.class'),
      sortable: true,
      width: 120,
      render: (value) => value || 'N/A',
    },
    {
      key: 'totalSubmissions',
      header: 'Total',
      sortable: true,
      width: 80,
      render: (value) => <span className="text-sm">{value}</span>,
    },
    {
      key: 'submittedCount',
      header: 'Submitted',
      sortable: true,
      width: 100,
      render: (value, item) => (
        <span className="text-sm text-blue-600">{value} ({item.submissionRate}%)</span>
      ),
    },
    {
      key: 'gradedCount',
      header: 'Graded',
      sortable: true,
      width: 100,
      render: (value, item) => (
        <span className="text-sm text-green-600">
          {value} / {item.submittedCount}
        </span>
      ),
    },
    {
      key: 'avgScore',
      header: t('analytics.averageScore'),
      sortable: true,
      width: 120,
      render: (value) => value !== null && value !== undefined ? `${value}%` : '-',
    },
    {
      key: 'dueDate',
      header: t('assignment.fields.dueDate'),
      sortable: true,
      width: 130,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
    },
  ];

  const statusColors: Record<AssignmentStatus, string> = {
    [AssignmentStatus.DRAFT]: 'bg-gray-100 text-gray-800',
    [AssignmentStatus.PUBLISHED]: 'bg-blue-100 text-blue-800',
    [AssignmentStatus.ARCHIVED]: 'bg-orange-100 text-orange-800',
  };

  const submissionStatusColors: Record<SubmissionStatus, string> = {
    [SubmissionStatus.PENDING_REVIEW]: 'bg-gray-100 text-gray-800',
    [SubmissionStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
    [SubmissionStatus.LATE]: 'bg-orange-100 text-orange-800',
    [SubmissionStatus.GRADED]: 'bg-green-100 text-green-800',
    [SubmissionStatus.RETURNED]: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of assignment performance and submission analytics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="compact">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalAssignments}</p>
              <p className="text-xs text-gray-500">{t('assignment.plural')}</p>
            </div>
          </div>
        </Card>
        <Card variant="compact">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{overallStats.submissionRate}%</p>
              <p className="text-xs text-gray-500">{t('analytics.submissionRate')}</p>
            </div>
          </div>
        </Card>
        <Card variant="compact">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{overallStats.gradingRate}%</p>
              <p className="text-xs text-gray-500">Grading Rate</p>
            </div>
          </div>
        </Card>
        <Card variant="compact">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{overallStats.avgScore}</p>
              <p className="text-xs text-gray-500">{t('analytics.averageScore')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Submissions by Status - Pie Chart Placeholder */}
        <Card title="Submissions by Status">
          <div className="space-y-3">
            <div className="flex items-center justify-center py-8">
              {/* Pie Chart Placeholder */}
              <div className="relative w-40 h-40">
                <div className="absolute inset-0 rounded-full border-8 border-gray-100"></div>
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {(() => {
                    const total = Object.values(submissionsByStatus).reduce((a, b) => a + b, 0);
                    if (total === 0) return null;
                    let cumulativePercent = 0;
                    const colors: Record<string, string> = {
                      NOT_SUBMITTED: '#9CA3AF',
                      SUBMITTED: '#3B82F6',
                      LATE: '#F97316',
                      GRADED: '#22C55E',
                      RETURNED: '#A855F7',
                    };
                    return Object.entries(submissionsByStatus)
                      .filter(([, count]) => count > 0)
                      .map(([status, count]) => {
                        const percent = (count / total) * 100;
                        const dashArray = `${percent} ${100 - percent}`;
                        const dashOffset = -cumulativePercent;
                        cumulativePercent += percent;
                        return (
                          <circle
                            key={status}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke={colors[status] || '#ccc'}
                            strokeWidth="3"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                          />
                        );
                      });
                  })()}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">
                    {Object.values(submissionsByStatus).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(submissionsByStatus)
                .filter(([, count]) => count > 0)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${submissionStatusColors[status as SubmissionStatus]?.split(' ')[0] || 'bg-gray-300'}`}></span>
                    <span className="text-xs text-gray-600">
                      {t(`submission.status.${status}`)}: {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </Card>

        {/* Score Distribution */}
        <Card title={t('analytics.scoreDistribution')}>
          <div className="space-y-4">
            {scoreDistribution.map((range) => (
              <div key={range.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">{range.label}</span>
                  <span className="text-sm font-medium text-gray-900">{range.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${range.color}`}
                    style={{
                      width: `${
                        submissions.filter(s => s.score !== null && s.score !== undefined && s.maxScore).length > 0
                          ? Math.round(
                              (range.count / submissions.filter(s => s.score !== null && s.score !== undefined && s.maxScore).length) * 100
                            )
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Assignments by Status Bar Chart Placeholder */}
      <Card title="Assignments by Status">
        <div className="flex items-end space-x-4 h-40">
          {Object.entries(assignmentsByStatus).map(([status, count]) => {
            const maxCount = Math.max(...Object.values(assignmentsByStatus), 1);
            const height = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
            const barColors: Record<string, string> = {
              DRAFT: 'bg-gray-400',
              PUBLISHED: 'bg-blue-500',
              CLOSED: 'bg-orange-500',
              GRADED: 'bg-green-500',
            };
            return (
              <div key={status} className="flex-1 flex flex-col items-center space-y-2">
                <span className="text-sm font-medium text-gray-900">{count}</span>
                <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                  <div
                    className={`w-16 ${barColors[status] || 'bg-gray-300'} rounded-t-md transition-all duration-300`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  ></div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[status as AssignmentStatus] || ''}`}>
                  {t(`assignment.status.${status}`)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Assignment Performance Summary */}
      <Card
        title="Assignment Performance Summary"
        subtitle="Overview of how each assignment is performing"
      >
        <DataGrid
          columns={performanceColumns}
          data={assignmentPerformance}
          sortable
          filterable
          loading={loading}
          emptyState={
            <div className="text-center py-12">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('common.noData')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No assignments to analyze yet.
              </p>
            </div>
          }
        />
      </Card>
    </div>
  );
};

export default AssignmentAnalyticsPage;
