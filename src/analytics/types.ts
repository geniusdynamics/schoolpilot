/**
 * Analytics Types
 * 
 * Type definitions for analytics and reporting system.
 */

export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'scatter';

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface ChartConfig {
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    title?: { display?: boolean; text?: string };
    legend?: { display?: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
    tooltip?: { enabled?: boolean };
  };
  scales?: {
    x?: { title?: { display?: boolean; text?: string } };
    y?: { title?: { display?: boolean; text?: string }; beginAtZero?: boolean };
  };
}

export interface MetricCard {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
  format?: 'number' | 'percentage' | 'currency' | 'date';
  prefix?: string;
  suffix?: string;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'list' | 'custom';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: ChartConfig | MetricCard | TableConfig | ListConfig;
  refreshInterval?: number; // seconds
}

export interface TableConfig {
  columns: TableColumn[];
  data: Record<string, any>[];
  pagination?: { page: number; pageSize: number; total: number };
  sortable?: boolean;
  filterable?: boolean;
}

export interface TableColumn {
  key: string;
  header: string;
  type?: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'badge';
  sortable?: boolean;
  width?: string;
}

export interface ListConfig {
  items: ListItem[];
  maxItems?: number;
  showMoreLink?: string;
}

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  value?: string | number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
  link?: string;
  timestamp?: Date;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: 'grid' | 'free';
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  type: 'attendance' | 'grades' | 'fees' | 'admissions' | 'custom';
  parameters: ReportParameter[];
  schedule?: ReportSchedule;
  lastRun?: Date;
}

export interface ReportParameter {
  name: string;
  type: 'date' | 'daterange' | 'select' | 'multiselect' | 'text' | 'number';
  label: string;
  required?: boolean;
  defaultValue?: any;
  options?: { label: string; value: any }[];
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:mm
  recipients: string[];
}

export interface AnalyticsQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange?: { start: Date; end: Date };
  groupBy?: string;
  sort?: { field: string; order: 'asc' | 'desc' };
  limit?: number;
}

export interface AnalyticsResult {
  data: Record<string, any>[];
  summary?: Record<string, number>;
  metadata: {
    queryTime: number;
    rowCount: number;
    cached?: boolean;
  };
}
