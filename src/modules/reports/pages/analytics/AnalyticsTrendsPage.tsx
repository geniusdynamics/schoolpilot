// ABOUTME: The analytics trends screen: one real point per period that recorded the chosen metric,
// ABOUTME: plotted and tabulated from canonical marks and attendance, with no synthesised history.

import React, { useMemo, useState } from 'react';

import {
  AcademicCapIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChartBarIcon,
  ChartPieIcon,
  CheckCircleIcon,
  UsersIcon,
} from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { DashboardMetric } from '@/components/ModuleDashboardShell';

import type { TrendMetric, TrendPoint } from '../../data/analyticsTypes';
import { AnalyticsEmptyCard, AnalyticsScopeCard } from './AnalyticsScopeCard';
import { useReportAnalyticsScope } from './useReportAnalyticsScope';

const METRICS: readonly { readonly id: TrendMetric; readonly label: string }[] = [
  { id: 'performance', label: 'Performance' },
  { id: 'passRate', label: 'Pass rate' },
  { id: 'attendance', label: 'Attendance' },
];

function metricIcon(metric: TrendMetric): React.ReactNode {
  if (metric === 'passRate') return <CheckCircleIcon className="h-6 w-6 text-emerald-700" />;
  if (metric === 'attendance') return <UsersIcon className="h-6 w-6 text-primary-700" />;
  return <AcademicCapIcon className="h-6 w-6 text-violet-700" />;
}

function directionOf(change: number | null): 'up' | 'down' | 'stable' | null {
  if (change === null) return null;
  if (change > 1) return 'up';
  if (change < -1) return 'down';
  return 'stable';
}

const LineChart: React.FC<{ readonly data: readonly TrendPoint[] }> = ({ data }) => {
  const minValue = Math.min(...data.map((point) => point.value));
  const maxValue = Math.max(...data.map((point) => point.value));
  const range = maxValue - minValue || 1;
  const chartHeight = 200;
  const chartWidth = 100;

  const pointY = (value: number) => chartHeight - ((value - minValue) / range) * (chartHeight - 20) - 10;
  const pointX = (index: number) => (data.length <= 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
  const pathPoints = data.map((point, index) => `${pointX(index)},${pointY(point.value)}`).join(' ');
  const areaPath = `0,${chartHeight} ${pathPoints} ${chartWidth},${chartHeight}`;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 100 ${chartHeight}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: `${chartHeight}px` }}
        role="img"
        aria-label="Recorded values by period"
      >
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = chartHeight - (pct / 100) * chartHeight;
          return (
            <g key={pct}>
              <line x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2,2" />
              <text x="-1" y={y + 2} textAnchor="end" fontSize="4" fill="#9ca3af">
                {Math.round(minValue + (pct / 100) * range)}%
              </text>
            </g>
          );
        })}

        <polygon points={areaPath} fill="url(#trend-gradient)" opacity="0.3" />

        <defs>
          <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>

        <polyline
          points={pathPoints}
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((point, index) => (
          <g key={point.periodId}>
            <circle cx={pointX(index)} cy={pointY(point.value)} r="2" fill="#6366f1" stroke="white" strokeWidth="0.5" />
            {data.length <= 8 && (
              <text
                x={pointX(index)}
                y={chartHeight - 2}
                textAnchor="middle"
                fontSize="3"
                fill="#6b7280"
                transform={`rotate(-30, ${pointX(index)}, ${chartHeight - 2})`}
              >
                {point.periodName.length > 12 ? `${point.periodName.slice(0, 12)}…` : point.periodName}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

const AnalyticsTrendsPage: React.FC = () => {
  const { scopeState, analytics, hasYear, loading, error } = useReportAnalyticsScope('optional');
  const [activeMetric, setActiveMetric] = useState<TrendMetric>('performance');

  const series = analytics.trends[activeMetric];
  const points = series.points;

  const stats = useMemo(() => {
    if (points.length === 0) {
      return { current: null, change: null, highest: null, lowest: null };
    }
    const current = points[points.length - 1].value;
    const previous = points.length > 1 ? points[points.length - 2].value : null;
    return {
      current,
      change: previous === null ? null : Math.round((current - previous) * 10) / 10,
      highest: Math.max(...points.map((point) => point.value)),
      lowest: Math.min(...points.map((point) => point.value)),
    };
  }, [points]);

  const direction = directionOf(stats.change);

  const metrics: DashboardMetric[] = [
    {
      key: 'current',
      label: `Current ${series.label}`,
      value: stats.current === null ? 'Not recorded' : `${stats.current}%`,
      icon: metricIcon(activeMetric),
    },
    {
      key: 'change',
      label: 'Period change',
      value: stats.change === null ? 'Not recorded' : `${stats.change >= 0 ? '+' : ''}${stats.change}%`,
      description:
        direction === null ? 'No earlier period recorded this metric' : direction === 'up' ? 'Improving' : direction === 'down' ? 'Declining' : 'Stable',
      icon:
        direction === 'down' ? (
          <ArrowDownIcon className="h-5 w-5 text-rose-600" />
        ) : (
          <ArrowUpIcon className={`h-5 w-5 ${direction === 'up' ? 'text-emerald-600' : 'text-surface-muted-fg'}`} />
        ),
    },
    {
      key: 'highest',
      label: 'Highest',
      value: stats.highest === null ? 'Not recorded' : `${stats.highest}%`,
    },
    {
      key: 'lowest',
      label: 'Lowest',
      value: stats.lowest === null ? 'Not recorded' : `${stats.lowest}%`,
    },
  ];

  const insights = useMemo((): string[] => {
    if (points.length === 0) {
      return [series.notRecordedReason ?? 'No period recorded this metric.'];
    }
    if (points.length < 2) {
      return [`Only ${points[0].periodName} has recorded ${series.label.toLowerCase()}; there is no earlier point to compare.`];
    }

    const last = points[points.length - 1];
    const previous = points[points.length - 2];
    const change = Math.round((last.value - previous.value) * 10) / 10;
    const observations = [
      change === 0
        ? `${series.label} is unchanged between ${previous.periodName} and ${last.periodName}.`
        : `${series.label} moved ${change > 0 ? 'up' : 'down'} ${Math.abs(change)} points between ${previous.periodName} and ${last.periodName}.`,
    ];

    if (stats.highest !== null && stats.lowest !== null && stats.highest - stats.lowest > 20) {
      observations.push(
        `The range across recorded periods is ${Math.round((stats.highest - stats.lowest) * 10) / 10} points, from ${stats.lowest}% to ${stats.highest}%.`
      );
    }

    const recent = points.slice(-3);
    if (recent.length === 3) {
      const recentChange = Math.round((recent[2].value - recent[0].value) * 10) / 10;
      observations.push(
        `Across the last three recorded periods (${recent[0].periodName} to ${recent[2].periodName}) the metric ${recentChange > 0 ? 'rose' : recentChange < 0 ? 'fell' : 'held'}${recentChange === 0 ? '' : ` by ${Math.abs(recentChange)} points`}.`
      );
    }

    return observations;
  }, [points, series.label, series.notRecordedReason, stats.highest, stats.lowest]);

  const tableColumns: DataGridColumn<TrendPoint>[] = [
    { key: 'periodName', header: 'Period', sortable: true },
    {
      key: 'value',
      header: series.label,
      sortable: true,
      align: 'center',
      render: (value: number) => <span className="font-semibold text-surface-foreground">{value}%</span>,
    },
    {
      key: 'change',
      header: 'Change',
      sortable: true,
      align: 'center',
      render: (value: number | null) =>
        value === null ? (
          <span className="text-xs text-surface-muted-fg">—</span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              value > 0 ? 'bg-emerald-100 text-emerald-700' : value < 0 ? 'bg-rose-100 text-rose-700' : 'bg-surface-accent text-surface-muted-fg'
            }`}
          >
            {value > 0 ? <ArrowUpIcon className="h-3 w-3" /> : value < 0 ? <ArrowDownIcon className="h-3 w-3" /> : null}
            {value >= 0 ? '+' : ''}
            {value}%
          </span>
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
      title="Trends Over Time"
      subtitle="Recorded performance, pass rate and attendance by period for the chosen academic year."
      heroIcon={<ChartBarIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
    >
      <AnalyticsScopeCard scope={scopeState} period="optional">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-surface-foreground">Metric:</span>
          {METRICS.map((metric) => (
            <Button
              key={metric.id}
              variant={activeMetric === metric.id ? 'primary' : 'outline'}
              onClick={() => setActiveMetric(metric.id)}
            >
              {metric.label}
            </Button>
          ))}
        </div>
      </AnalyticsScopeCard>

      {error !== null && <AnalyticsEmptyCard title="Trends" message="The academic record could not be read, so no trend is shown." />}

      {error === null && !hasYear && (
        <AnalyticsEmptyCard
          title="Trends"
          message="No academic year is set up, so there is no period to plot."
        />
      )}

      {error === null && hasYear && points.length === 0 && (
        <AnalyticsEmptyCard title={`${series.label} trend`} message={series.notRecordedReason ?? 'No period recorded this metric.'} />
      )}

      {error === null && hasYear && points.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['performance', 'attendance', 'passRate'] as TrendMetric[]).map((metric) => {
              const candidate = analytics.trends[metric];
              const last = candidate.points[candidate.points.length - 1];
              return (
                <Card key={metric} className="border-slate-200 bg-surface-card shadow-sm">
                  <div className="text-center">
                    <p className="text-xs font-medium text-surface-muted-fg uppercase tracking-wide">{candidate.label} trend</p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="text-2xl font-bold text-surface-foreground">
                        {last === undefined ? 'Not recorded' : `${last.value}%`}
                      </span>
                    </div>
                    <p className="text-xs mt-1 text-surface-muted-fg">
                      {last === undefined
                        ? (candidate.notRecordedReason ?? 'No period recorded this metric.')
                        : `Latest recorded: ${last.periodName}`}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card title={`${series.label} trend`} className="border-slate-200 bg-surface-card shadow-sm">
            <LineChart data={points} />
          </Card>

          <Card title="Trend data" className="border-slate-200 bg-surface-card shadow-sm">
            <DataGrid
              columns={tableColumns}
              data={points}
              loading={loading}
              sortable
              filterable={false}
              keyField="periodId"
            />
          </Card>

          <Card
            title="Observations"
            icon={<ChartPieIcon className="h-5 w-5 text-primary-600" />}
            className="border-slate-200 bg-surface-card shadow-sm"
          >
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-primary-50 border border-primary-100">
                  <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  <p className="text-sm text-surface-foreground">{insight}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </ModuleDashboardShell>
  );
};

export const AnalyticsTrendsPageContent = AnalyticsTrendsPage;
export default AnalyticsTrendsPage;
