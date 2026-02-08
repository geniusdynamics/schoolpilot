/**
 * Analytics Module
 * 
 * Dashboard and reporting system for SchoolPilot3.
 * 
 * @example
 * ```tsx
 * import { AnalyticsEngine, MetricCard, useAnalytics } from '@/analytics';
 * 
 * const engine = getAnalytics();
 * 
 * // Generate chart
 * const chartConfig = engine.generateChart(data, 'bar', {
 *   labelField: 'month',
 *   valueField: 'students',
 *   title: 'Student Enrollment'
 * });
 * 
 * // Calculate metrics
 * const metrics = engine.calculateMetrics(data, [
 *   'totalStudents',
 *   'averageAttendance',
 *   'passRate'
 * ]);
 * ```
 */

// Types
export type {
  ChartType,
  ChartData,
  ChartDataset,
  ChartConfig,
  ChartOptions,
  MetricCard,
  DashboardWidget,
  TableConfig,
  TableColumn,
  ListConfig,
  ListItem,
  Dashboard,
  Report,
  ReportParameter,
  ReportSchedule,
  AnalyticsQuery,
  AnalyticsResult,
} from './types';

// Engine
export { AnalyticsEngine, getAnalytics } from './AnalyticsEngine';

// Components
export { MetricCardComponent as MetricCard } from './components/MetricCard';
