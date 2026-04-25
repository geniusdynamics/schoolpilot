// ABOUTME: This file defines shared report entity and report-builder contract types for the reports module.
// ABOUTME: It keeps report definitions, parameters, and generated row shapes consistent across report services and UI.

export interface ReportsEntity {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type ReportDatasetRow = Record<string, unknown>;

export type ReportParameterTarget = 'filter' | 'sort' | 'select' | 'limit' | 'offset';
export type ReportFilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
export type ReportSortDirection = 'asc' | 'desc';

export interface ReportColumnDefinition {
  key: string;
  sourceKey?: string;
  label?: string;
  defaultValue?: unknown;
}

export interface Report extends ReportsEntity {
  data?: ReportDatasetRow[];
  sourceRows?: ReportDatasetRow[];
  columns?: ReportColumnDefinition[];
  sortBy?: string;
  sortDirection?: ReportSortDirection;
  limit?: number;
}

export interface ReportParameter {
  key: string;
  value?: unknown;
  values?: unknown[];
  target?: ReportParameterTarget;
  operator?: ReportFilterOperator;
  enabled?: boolean;
  direction?: ReportSortDirection;
}

// === NEW TYPES FOR REPORTS PAGES (from inline mock data migration) ===

// Source: ClassListsPage.tsx
export interface GradeBreakdown {
  form: string;
  grades: Record<string, number>;
  entries: number;
  meanMarks: number;
  meanMarksDeviation: number;
  meanPoints: number;
  meanPointsDeviation: number;
  grade: string;
  subjectTeacher: string;
  tscNo: string;
  isSummary?: boolean;
}

export interface ClassChartData {
  name: string;
  mean: number;
}
