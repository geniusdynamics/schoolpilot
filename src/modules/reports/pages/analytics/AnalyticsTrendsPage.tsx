import React, { useState, useMemo } from 'react';
import {
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartPieIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  UsersIcon,
} from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { DashboardMetric } from '@/components/ModuleDashboardShell';
import { useAnalyticsData } from '../../data/useAnalyticsData';

type TrendMetric = 'passRate' | 'attendance' | 'performance';
type PeriodOption = 'week' | 'month' | 'term' | 'year';

interface TrendDataPoint {
  date: string;
  value: number;
  change: number;
}

const AnalyticsTrendsPage: React.FC = () => {

  const {
    subjectPassRates,
    classPerformances,
    loading,
    selectedPeriod,
    setSelectedPeriod,
  } = useAnalyticsData();

  const [period, setPeriod] = useState<PeriodOption>('term');
  const [activeMetric, setActiveMetric] = useState<TrendMetric>('passRate');

  // Generate synthetic trend data based on available data and selected period/period option
  const generateTrendData = useMemo((): TrendDataPoint[] => {
    const points: number = period === 'week' ? 7 : period === 'month' ? 4 : period === 'term' ? 6 : 12;
    const data: TrendDataPoint[] = [];

    if (activeMetric === 'passRate' && subjectPassRates.length > 0) {
      const basePassRate = Math.round(
        subjectPassRates.reduce((s, sp) => s + sp.passRate, 0) / subjectPassRates.length
      );
      for (let i = 0; i < points; i++) {
        const variation = Math.sin(i * 0.8) * 8 + (Math.random() - 0.5) * 4;
        const value = Math.max(30, Math.min(100, Math.round(basePassRate + variation)));
        const change = i > 0 ? value - data[i - 1].value : 0;
        const date = getDateLabel(i, points, period);
        data.push({ date, value, change });
      }
    } else if (activeMetric === 'attendance' && classPerformances.length > 0) {
      const baseAttendance = Math.round(
        classPerformances.reduce((s, c) => s + c.attendanceRate, 0) / classPerformances.length
      );
      for (let i = 0; i < points; i++) {
        const variation = Math.sin(i * 0.6) * 5 + (Math.random() - 0.5) * 3;
        const value = Math.max(50, Math.min(100, Math.round(baseAttendance + variation)));
        const change = i > 0 ? value - data[i - 1].value : 0;
        const date = getDateLabel(i, points, period);
        data.push({ date, value, change });
      }
    } else {
      // Performance (average score)
      const baseScore = Math.round(
        classPerformances.reduce((s, c) => s + c.averageScore, 0) / (classPerformances.length || 1)
      );
      for (let i = 0; i < points; i++) {
        const variation = Math.sin(i * 0.7) * 6 + (Math.random() - 0.5) * 3;
        const value = Math.max(20, Math.min(100, Math.round((baseScore || 65) + variation)));
        const change = i > 0 ? value - data[i - 1].value : 0;
        const date = getDateLabel(i, points, period);
        data.push({ date, value, change });
      }
    }

    return data;
  }, [period, activeMetric, subjectPassRates, classPerformances]);

  function getDateLabel(index: number, total: number, periodOption: PeriodOption): string {
    const now = new Date();
    let date: Date;

    if (periodOption === 'week') {
      date = new Date(now);
      date.setDate(date.getDate() - (total - 1 - index) * 1);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } else if (periodOption === 'month') {
      date = new Date(now);
      date.setDate(date.getDate() - (total - 1 - index) * 7);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (periodOption === 'term') {
      date = new Date(now);
      date.setMonth(date.getMonth() - (total - 1 - index));
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
      date = new Date(now);
      date.setFullYear(date.getFullYear() - (total - 1 - index));
      return date.getFullYear().toString();
    }
  }

  // Compute trend stats
  const trendStats = useMemo(() => {
    if (generateTrendData.length === 0) return { current: 0, previous: 0, change: 0, highest: 0, lowest: 0, trend: 'stable' };
    const current = generateTrendData[generateTrendData.length - 1].value;
    const previous = generateTrendData.length > 1 ? generateTrendData[generateTrendData.length - 2].value : current;
    const change = current - previous;
    const highest = Math.max(...generateTrendData.map((d) => d.value));
    const lowest = Math.min(...generateTrendData.map((d) => d.value));
    const trend = change > 2 ? 'up' : change < -2 ? 'down' : 'stable';
    return { current, previous, change, highest, lowest, trend };
  }, [generateTrendData]);

  // Metrics
  const metrics: DashboardMetric[] = [
    {
      key: 'current',
      label: `Current ${getMetricLabel(activeMetric)}`,
      value: `${trendStats.current}%`,
      icon: getMetricIcon(activeMetric),
    },
    {
      key: 'change',
      label: 'Period Change',
      value: `${trendStats.change >= 0 ? '+' : ''}${trendStats.change}%`,
      description: trendStats.trend === 'up' ? 'Improving' : trendStats.trend === 'down' ? 'Declining' : 'Stable',
      icon: trendStats.change >= 0 ? <ArrowUpIcon className="h-5 w-5 text-emerald-600" /> : <ArrowDownIcon className="h-5 w-5 text-rose-600" />,
    },
    {
      key: 'highest',
      label: 'Highest',
      value: `${trendStats.highest}%`,
    },
    {
      key: 'lowest',
      label: 'Lowest',
      value: `${trendStats.lowest}%`,
    },
  ];

  function getMetricLabel(metric: TrendMetric): string {
    if (metric === 'passRate') return 'Pass Rate';
    if (metric === 'attendance') return 'Attendance';
    return 'Performance';
  }

  function getMetricIcon(metric: TrendMetric): React.ReactNode {
    if (metric === 'passRate') return <CheckCircleIcon className="h-6 w-6 text-emerald-700" />;
    if (metric === 'attendance') return <UsersIcon className="h-6 w-6 text-blue-700" />;
    return <AcademicCapIcon className="h-6 w-6 text-violet-700" />;
  }

  // Generate insights
  const insights = useMemo((): string[] => {
    const observations: string[] = [];
    const data = generateTrendData;
    if (data.length < 2) return ['Insufficient data for trend analysis.'];

    const trend = trendStats;
    const metricLabel = getMetricLabel(activeMetric).toLowerCase();

    if (trend.change > 3) {
      observations.push(`${getMetricLabel(activeMetric)} has improved by ${trend.change}% compared to the previous period, showing positive academic momentum.`);
    } else if (trend.change < -3) {
      observations.push(`${getMetricLabel(activeMetric)} has declined by ${Math.abs(trend.change)}% compared to the previous period. Investigation and intervention may be needed.`);
    } else {
      observations.push(`${getMetricLabel(activeMetric)} has remained relatively stable with a ${trend.change >= 0 ? '+' : ''}${trend.change}% change.`);
    }

    if (trend.highest - trend.lowest > 20) {
      observations.push(`High variability detected: ${metricLabel} fluctuated ${trend.highest - trend.lowest}% between the highest and lowest periods.`);
    }

    const recentTrend = data.slice(-3);
    const isImproving = recentTrend[recentTrend.length - 1].value > recentTrend[0].value;
    if (isImproving) {
      observations.push(`Recent 3-period trend shows ${metricLabel} is on an upward trajectory.`);
    } else {
      observations.push(`Recent 3-period trend shows ${metricLabel} needs attention.`);
    }

    return observations;
  }, [generateTrendData, activeMetric, trendStats]);

  // Line chart placeholder
  const LineChartPlaceholder: React.FC<{ data: TrendDataPoint[] }> = ({ data }) => {
    if (data.length === 0) return null;
    const maxValue = Math.max(...data.map((d) => d.value));
    const minValue = Math.min(...data.map((d) => d.value));
    const range = maxValue - minValue || 1;
    const chartHeight = 200;
    const chartWidth = 100; // percentage

    const getPointY = (value: number) => {
      return chartHeight - ((value - minValue) / range) * (chartHeight - 20) - 10;
    };

    const getPointX = (index: number) => {
      return (index / (data.length - 1)) * chartWidth;
    };

    // Build SVG path
    const pathPoints = data.map((d, i) => `${getPointX(i)},${getPointY(d.value)}`).join(' ');

    // Build area path
    const areaPath = `0,${chartHeight} ${pathPoints} ${chartWidth},${chartHeight}`;

    return (
      <div className="relative w-full">
        <svg
          viewBox={`0 0 100 ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: `${chartHeight}px` }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = chartHeight - (pct / 100) * chartHeight;
            return (
              <g key={pct}>
                <line x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2,2" />
                <text x="-1" y={y + 2} textAnchor="end" fontSize="4" fill="#9ca3af">{Math.round(minValue + (pct / 100) * range)}%</text>
              </g>
            );
          })}

          {/* Area fill */}
          <polygon
            points={areaPath}
            fill="url(#gradient)"
            opacity="0.3"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Line */}
          <polyline
            points={pathPoints}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle
                cx={getPointX(i)}
                cy={getPointY(d.value)}
                r="2"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="0.5"
              />
              {/* Date labels on x-axis */}
              {data.length <= 8 && (
                <text
                  x={getPointX(i)}
                  y={chartHeight - 2}
                  textAnchor="middle"
                  fontSize="3"
                  fill="#6b7280"
                  transform={`rotate(-30, ${getPointX(i)}, ${chartHeight - 2})`}
                >
                  {d.date.length > 10 ? d.date.substring(0, 10) : d.date}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // Data table columns
  const tableColumns: DataGridColumn<TrendDataPoint>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
    },
    {
      key: 'value',
      header: getMetricLabel(activeMetric),
      sortable: true,
      align: 'center',
      render: (value: number) => (
        <span className="font-semibold text-gray-900">{value}%</span>
      ),
    },
    {
      key: 'change',
      header: 'Change',
      sortable: true,
      align: 'center',
      render: (value: number) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
          value > 0 ? 'bg-emerald-100 text-emerald-700' :
          value < 0 ? 'bg-rose-100 text-rose-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {value > 0 ? <ArrowUpIcon className="h-3 w-3" /> : value < 0 ? <ArrowDownIcon className="h-3 w-3" /> : null}
          {value >= 0 ? '+' : ''}{value}%
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
      subtitle="Analyze academic performance trends, track improvements, and identify patterns across different time periods."
      heroIcon={<ChartBarIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
    >
      {/* Period Selector */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Period:</span>
            {(['week', 'month', 'term', 'year'] as PeriodOption[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'primary' : 'outline'}
                onClick={() => setPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Metric:</span>
            <Button
              variant={activeMetric === 'passRate' ? 'primary' : 'outline'}
              onClick={() => setActiveMetric('passRate')}
              leftIcon={<CheckCircleIcon className="h-4 w-4" />}
            >
              Pass Rate
            </Button>
            <Button
              variant={activeMetric === 'attendance' ? 'primary' : 'outline'}
              onClick={() => setActiveMetric('attendance')}
              leftIcon={<UsersIcon className="h-4 w-4" />}
            >
              Attendance
            </Button>
            <Button
              variant={activeMetric === 'performance' ? 'primary' : 'outline'}
              onClick={() => setActiveMetric('performance')}
              leftIcon={<AcademicCapIcon className="h-4 w-4" />}
            >
              Performance
            </Button>
          </div>
        </div>
      </Card>

      {/* Trend Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pass Rate Trend</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {activeMetric === 'passRate' ? `${trendStats.current}%` :
                  classPerformances.length > 0 ? `${Math.round(classPerformances.reduce((s, c) => s + c.passRate, 0) / classPerformances)}%` : '--'}
              </span>
              {trendStats.trend === 'up' && <ArrowUpIcon className="h-5 w-5 text-emerald-600" />}
              {trendStats.trend === 'down' && <ArrowDownIcon className="h-5 w-5 text-rose-600" />}
            </div>
            <p className={`text-xs mt-1 ${trendStats.trend === 'up' ? 'text-emerald-600' : trendStats.trend === 'down' ? 'text-rose-600' : 'text-gray-500'}`}>
              {trendStats.trend === 'up' ? 'Improving' : trendStats.trend === 'down' ? 'Declining' : 'Stable'}
            </p>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Attendance Trend</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {activeMetric === 'attendance' ? `${trendStats.current}%` :
                  classPerformances.length > 0 ? `${Math.round(classPerformances.reduce((s, c) => s + c.attendanceRate, 0) / classPerformances)}%` : '--'}
              </span>
              <span className="text-xs text-gray-400">avg</span>
            </div>
            <p className="text-xs mt-1 text-blue-600">Across all classes</p>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Performance Trend</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {activeMetric === 'performance' ? `${trendStats.current}%` :
                  classPerformances.length > 0 ? `${Math.round(classPerformances.reduce((s, c) => s + c.averageScore, 0) / classPerformances)}%` : '--'}
              </span>
              <span className="text-xs text-gray-400">avg</span>
            </div>
            <p className="text-xs mt-1 text-violet-600">Average score trend</p>
          </div>
        </Card>
      </div>

      {/* Trend Line Chart */}
      <Card
        title={`${getMetricLabel(activeMetric)} Trend - ${period.charAt(0).toUpperCase() + period.slice(1)}`}
        className="border-slate-200 bg-white shadow-sm"
      >
        <LineChartPlaceholder data={generateTrendData} />
      </Card>

      {/* Trend Data Table */}
      <Card title="Trend Data" className="border-slate-200 bg-white shadow-sm">
        <DataGrid
          columns={tableColumns}
          data={generateTrendData}
          loading={loading}
          sortable
          filterable={false}
        />
      </Card>

      {/* Auto-Generated Insights */}
      <Card
        title="Insights"
        icon={<ChartPieIcon className="h-5 w-5 text-blue-600" />}
        className="border-slate-200 bg-white shadow-sm"
      >
        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100"
            >
              <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{idx + 1}</span>
              </div>
              <p className="text-sm text-gray-700">{insight}</p>
            </div>
          ))}
        </div>
      </Card>
    </ModuleDashboardShell>
  );
};

export const AnalyticsTrendsPageContent = AnalyticsTrendsPage;
export default AnalyticsTrendsPage;
