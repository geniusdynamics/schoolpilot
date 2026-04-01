// ABOUTME: This service builds report rows from in-memory report definitions and runtime parameters.
// ABOUTME: It provides safe filtering, projection, sorting, and pagination without assuming a backend.

import { Report, ReportDatasetRow, ReportParameter } from '../data/types';

export class ReportBuilderService {
  async generateReport(report: Report, parameters: ReportParameter[]): Promise<ReportDatasetRow[]> {
    const sourceRows = [...(report.data || report.sourceRows || [])];
    const filteredRows = this.applyFilters(sourceRows, parameters);
    const sortedRows = this.applySorting(filteredRows, report, parameters);
    const projectedRows = this.applyProjection(sortedRows, report, parameters);
    return this.applyWindow(projectedRows, report, parameters);
  }

  private applyFilters(rows: ReportDatasetRow[], parameters: ReportParameter[]): ReportDatasetRow[] {
    const activeFilters = parameters.filter((parameter) =>
      parameter.enabled !== false && (parameter.target === 'filter' || parameter.target === undefined)
    );

    return rows.filter((row) => activeFilters.every((parameter) => this.matchesFilter(row, parameter)));
  }

  private applyProjection(rows: ReportDatasetRow[], report: Report, parameters: ReportParameter[]): ReportDatasetRow[] {
    const selectedKeys = parameters.find((parameter) => parameter.target === 'select')?.values as string[] | undefined;
    const columns = selectedKeys?.length
      ? selectedKeys.map((key) => report.columns?.find((column) => column.key === key) || { key })
      : report.columns || [];

    if (!columns.length) {
      return rows;
    }

    return rows.map((row) => columns.reduce<ReportDatasetRow>((accumulator, column) => {
      const sourceKey = column.sourceKey || column.key;
      accumulator[column.key] = row[sourceKey] ?? column.defaultValue ?? null;
      return accumulator;
    }, {}));
  }

  private applySorting(rows: ReportDatasetRow[], report: Report, parameters: ReportParameter[]): ReportDatasetRow[] {
    const sortParameter = parameters.find((parameter) => parameter.target === 'sort' && parameter.key);
    const sortBy = sortParameter?.key || report.sortBy;
    const direction = sortParameter?.direction || report.sortDirection || 'asc';
    const sortKey = this.resolveSortKey(sortBy, report);

    if (!sortBy) {
      return rows;
    }

    return [...rows].sort((leftRow, rightRow) => {
      const leftValue = this.normalizeSortValue(leftRow[sortKey]);
      const rightValue = this.normalizeSortValue(rightRow[sortKey]);
      const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
      return direction === 'desc' ? comparison * -1 : comparison;
    });
  }

  private resolveSortKey(sortBy: string | undefined, report: Report): string {
    if (!sortBy) {
      return '';
    }

    const matchingColumn = (report.columns || []).find((column) =>
      column.key === sortBy || column.sourceKey === sortBy
    );

    return matchingColumn?.sourceKey || sortBy;
  }

  private applyWindow(rows: ReportDatasetRow[], report: Report, parameters: ReportParameter[]): ReportDatasetRow[] {
    const limitParameter = parameters.find((parameter) => parameter.target === 'limit');
    const offsetParameter = parameters.find((parameter) => parameter.target === 'offset');
    const offset = Number(offsetParameter?.value ?? 0);
    const limit = Number(limitParameter?.value ?? report.limit ?? rows.length);
    return rows.slice(Math.max(offset, 0), Math.max(offset, 0) + Math.max(limit, 0));
  }

  private matchesFilter(row: ReportDatasetRow, parameter: ReportParameter): boolean {
    const operator = parameter.operator || 'eq';
    const rowValue = row[parameter.key];
    const filterValue = parameter.value;

    if (filterValue === undefined && operator !== 'in') {
      return true;
    }

    switch (operator) {
      case 'neq': return rowValue !== filterValue;
      case 'gt': return Number(rowValue) > Number(filterValue);
      case 'gte': return Number(rowValue) >= Number(filterValue);
      case 'lt': return Number(rowValue) < Number(filterValue);
      case 'lte': return Number(rowValue) <= Number(filterValue);
      case 'contains': return String(rowValue ?? '').toLowerCase().includes(String(filterValue ?? '').toLowerCase());
      case 'in': return (parameter.values || []).map(String).includes(String(rowValue));
      case 'between': {
        const [minimum, maximum] = parameter.values || [];
        return Number(rowValue) >= Number(minimum) && Number(rowValue) <= Number(maximum);
      }
      default: return rowValue === filterValue;
    }
  }

  private normalizeSortValue(value: unknown): string | number {
    if (typeof value === 'number') {
      return value;
    }

    const numericValue = Number(value);
    if (!Number.isNaN(numericValue) && value !== null && value !== '') {
      return numericValue;
    }

    return String(value ?? '').toLowerCase();
  }
}

