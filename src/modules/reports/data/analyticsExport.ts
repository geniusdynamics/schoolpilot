// ABOUTME: The export preview arithmetic: builds CSV/JSON rows from the same computed analytics the
// ABOUTME: screens render, and makes the subject and class filters narrow the figures they name.

import type { AnalyticsResult, ClassPerformance, TrendDirection } from './analyticsTypes';

export type AnalyticsExportDataType = 'teachers' | 'subjects' | 'classes' | 'trends';

export interface AnalyticsExportFilters {
  readonly subjectId?: string;
  readonly classId?: string;
  readonly teacherId?: string;
}

/** A row as the preview grid and the CSV read it. `id` is the DataGrid key, never exported. */
export type AnalyticsExportRow = Readonly<Record<string, string>>;

const percent = (value: number | null): string => (value === null ? 'Not recorded' : `${value}%`);

const trendLabel = (trend: TrendDirection | null): string => {
  if (trend === 'up') return 'Improving';
  if (trend === 'down') return 'Declining';
  if (trend === 'stable') return 'Stable';
  return 'Not recorded';
};

function teacherRows(result: AnalyticsResult, filters: AnalyticsExportFilters): AnalyticsExportRow[] {
  return result.teacherAnalytics
    .filter((teacher) => filters.teacherId === undefined || filters.teacherId === '' || teacher.teacherId === filters.teacherId)
    .filter((teacher) => filters.subjectId === undefined || filters.subjectId === '' || teacher.subjectIds.includes(filters.subjectId))
    .filter((teacher) => filters.classId === undefined || filters.classId === '' || teacher.classIds.includes(filters.classId))
    .map((teacher) => ({
      id: teacher.teacherId,
      Teacher: teacher.teacherName,
      Subjects: teacher.subjects.join(', ') || '—',
      Classes: teacher.classNames.join(', ') || '—',
      Students: String(teacher.studentCount),
      'Marks recorded': String(teacher.marksRecorded),
      'Avg score': percent(teacher.averageScore),
      'Pass rate': percent(teacher.passRate),
      Attendance: percent(teacher.attendanceRate),
      'Grading backlog': teacher.gradingBacklog === null ? 'Not recorded' : String(teacher.gradingBacklog),
    }));
}

function subjectRows(result: AnalyticsResult, filters: AnalyticsExportFilters): AnalyticsExportRow[] {
  if (filters.classId !== undefined && filters.classId !== '') {
    const selected = result.classPerformances.find((row) => row.classId === filters.classId);
    if (selected === undefined) return [];
    return selected.subjectBreakdown
      .filter((subject) => filters.subjectId === undefined || filters.subjectId === '' || subject.subjectId === filters.subjectId)
      .sort((left, right) => left.subjectName.localeCompare(right.subjectName))
      .map((subject) => ({
        id: `${selected.classId}:${subject.subjectId}`,
        Class: `${selected.className}${selected.streamName ? ` · ${selected.streamName}` : ''}`,
        Subject: subject.subjectName,
        Students: String(subject.studentCount),
        'Marks recorded': String(subject.marksRecorded),
        'Avg score': percent(subject.averageScore),
        'Pass rate': percent(subject.passRate),
      }));
  }

  return result.subjectPassRates
    .filter((subject) => filters.subjectId === undefined || filters.subjectId === '' || subject.subjectId === filters.subjectId)
    .map((subject) => ({
      id: subject.subjectId,
      Subject: subject.subjectName,
      Students: String(subject.studentCount),
      Assessments: String(subject.examCount),
      'Marks recorded': String(subject.marksRecorded),
      'Avg score': percent(subject.averageScore),
      'Pass rate': percent(subject.passRate),
      Highest: subject.highestScore === null ? '—' : `${subject.highestScore}%`,
      Median: subject.medianScore === null ? '—' : `${subject.medianScore}%`,
      Lowest: subject.lowestScore === null ? '—' : `${subject.lowestScore}%`,
      Trend: trendLabel(subject.trend),
    }));
}

function classRows(result: AnalyticsResult, filters: AnalyticsExportFilters): AnalyticsExportRow[] {
  const rows: AnalyticsExportRow[] = [];
  for (const classPerformance of result.classPerformances) {
    if (filters.classId !== undefined && filters.classId !== '' && classPerformance.classId !== filters.classId) continue;
    const subject =
      filters.subjectId === undefined || filters.subjectId === ''
        ? undefined
        : classPerformance.subjectBreakdown.find((candidate) => candidate.subjectId === filters.subjectId);
    if (filters.subjectId !== undefined && filters.subjectId !== '' && subject === undefined) continue;
    rows.push(classRow(classPerformance, subject?.averageScore, subject?.passRate));
  }
  return rows;
}

function classRow(
  classPerformance: ClassPerformance,
  subjectAverage: number | null | undefined,
  subjectPassRate: number | null | undefined
): AnalyticsExportRow {
  return {
    id: classPerformance.classId,
    Class: classPerformance.className,
    Stream: classPerformance.streamName ?? '—',
    Students: String(classPerformance.studentCount),
    'Marks recorded': String(classPerformance.marksRecorded),
    'Marks expected': classPerformance.marksExpected === null ? 'Not recorded' : String(classPerformance.marksExpected),
    'Recorded rate': percent(classPerformance.marksRecordedRate),
    'Avg score': percent(subjectAverage === undefined ? classPerformance.averageScore : subjectAverage),
    'Pass rate': percent(subjectPassRate === undefined ? classPerformance.passRate : subjectPassRate),
    Attendance: percent(classPerformance.attendanceRate),
    Trend: trendLabel(classPerformance.trend),
  };
}

function trendRows(result: AnalyticsResult): AnalyticsExportRow[] {
  const rows: AnalyticsExportRow[] = [];
  for (const metric of ['performance', 'passRate', 'attendance'] as const) {
    const series = result.trends[metric];
    for (const point of series.points) {
      rows.push({
        id: `${metric}:${point.periodId}`,
        Metric: series.label,
        Period: point.periodName,
        Value: `${point.value}%`,
        Change: point.change === null ? '—' : `${point.change >= 0 ? '+' : ''}${point.change}%`,
        'Marks recorded': String(point.marksRecorded),
      });
    }
  }
  return rows;
}

/** The rows the preview shows and the file writes, already narrowed by the filters. */
export function buildAnalyticsExportRows(
  result: AnalyticsResult,
  dataType: AnalyticsExportDataType,
  filters: AnalyticsExportFilters = {}
): AnalyticsExportRow[] {
  switch (dataType) {
    case 'teachers':
      return teacherRows(result, filters);
    case 'subjects':
      return subjectRows(result, filters);
    case 'classes':
      return classRows(result, filters);
    case 'trends':
      return trendRows(result);
    default:
      return [];
  }
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** A CSV with a header row taken from the first row's keys, excluding the grid's `id`. */
export function analyticsRowsToCsv(rows: readonly AnalyticsExportRow[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]).filter((key) => key !== 'id');
  const lines = [columns.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column] ?? '')).join(','));
  }
  return lines.join('\n');
}
