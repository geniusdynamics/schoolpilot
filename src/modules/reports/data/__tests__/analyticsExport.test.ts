// ABOUTME: Tests that the export preview narrows to the subject and class filters it shows: a
// ABOUTME: filtered row carries that intersection's own recorded average, never the school-wide one.

import { describe, expect, it } from 'vitest';

import type { AnalyticsResult, ClassPerformance, SubjectPerformance, TeacherAnalytics, TrendSeries } from '../analyticsTypes';
import { analyticsRowsToCsv, buildAnalyticsExportRows } from '../analyticsExport';

const series = (metric: 'performance' | 'passRate' | 'attendance', label: string, points: TrendSeries['points']): TrendSeries => ({
  metric,
  label,
  points,
  notRecordedReason: points.length === 0 ? 'Not recorded.' : null,
});

const classRow = (overrides: Partial<ClassPerformance> & Pick<ClassPerformance, 'classId' | 'className'>): ClassPerformance => ({
  streamName: null,
  averageScore: 60,
  passRate: null,
  studentCount: 2,
  marksRecorded: 4,
  marksExpected: 6,
  marksRecordedRate: 66.7,
  attendanceRate: null,
  assignmentCompletionRate: null,
  trend: null,
  subjectBreakdown: [],
  topPerformers: [],
  bottomPerformers: [],
  ...overrides,
});

const subjectRow = (overrides: Partial<SubjectPerformance> & Pick<SubjectPerformance, 'subjectId' | 'subjectName'>): SubjectPerformance => ({
  averageScore: null,
  passRate: null,
  totalStudents: 0,
  studentCount: 0,
  marksRecorded: 0,
  examCount: 0,
  highestScore: null,
  medianScore: null,
  lowestScore: null,
  trend: null,
  ...overrides,
});

const teacherRow = (overrides: Partial<TeacherAnalytics> & Pick<TeacherAnalytics, 'teacherId' | 'teacherName'>): TeacherAnalytics => ({
  subjects: [],
  subjectIds: [],
  classNames: [],
  classIds: [],
  totalClasses: 0,
  studentCount: 0,
  marksRecorded: 0,
  averageScore: null,
  passRate: null,
  attendanceRate: null,
  gradingBacklog: null,
  ...overrides,
});

const RESULT: AnalyticsResult = {
  classPerformances: [
    classRow({
      classId: 'cg-east',
      className: 'Grade 10',
      streamName: 'East',
      averageScore: 62,
      subjectBreakdown: [
        { subjectId: 'la-math', subjectName: 'Mathematics', averageScore: 55, passRate: null, marksRecorded: 2, studentCount: 2 },
        { subjectId: 'la-english', subjectName: 'English', averageScore: 80, passRate: null, marksRecorded: 2, studentCount: 2 },
      ],
    }),
    classRow({
      classId: 'cg-west',
      className: 'Grade 10',
      streamName: 'West',
      averageScore: 70,
      subjectBreakdown: [
        { subjectId: 'la-math', subjectName: 'Mathematics', averageScore: 65, passRate: null, marksRecorded: 2, studentCount: 2 },
      ],
    }),
  ],
  subjectPassRates: [
    subjectRow({ subjectId: 'la-math', subjectName: 'Mathematics', averageScore: 60, marksRecorded: 4, studentCount: 4, totalStudents: 4, examCount: 2 }),
    subjectRow({ subjectId: 'la-english', subjectName: 'English', averageScore: 80, marksRecorded: 2, studentCount: 2, totalStudents: 2, examCount: 1 }),
  ],
  teacherAnalytics: [
    teacherRow({
      teacherId: 'staff-1',
      teacherName: 'Grace Wekesa',
      subjects: ['Mathematics'],
      subjectIds: ['la-math'],
      classNames: ['Grade 10 · East'],
      classIds: ['cg-east'],
      totalClasses: 1,
      studentCount: 2,
      marksRecorded: 2,
      averageScore: 55,
    }),
  ],
  trends: {
    performance: series('performance', 'Performance', [
      { periodId: 'p1', periodName: 'Term 1', value: 60, change: null, marksRecorded: 2 },
    ]),
    passRate: series('passRate', 'Pass rate', []),
    attendance: series('attendance', 'Attendance', []),
  },
  periods: [],
  selectedPeriod: null,
  hasRecordedMarks: true,
  attendanceRecorded: false,
  passRateRecorded: false,
};

describe('export preview filters', () => {
  it('uses the chosen class’s subject breakdown, not the school-wide subject average', () => {
    const rows = buildAnalyticsExportRows(RESULT, 'subjects', { classId: 'cg-east' });
    expect(rows.map((row) => [row.Subject, row['Avg score']])).toEqual([
      ['English', '80%'],
      ['Mathematics', '55%'],
    ]);
  });

  it('uses the chosen subject’s class average when exporting classes', () => {
    const rows = buildAnalyticsExportRows(RESULT, 'classes', { subjectId: 'la-math' });
    expect(rows.map((row) => [row.Stream, row['Avg score']])).toEqual([
      ['East', '55%'],
      ['West', '65%'],
    ]);
  });

  it('drops a class that does not teach the chosen subject', () => {
    const rows = buildAnalyticsExportRows(RESULT, 'classes', { subjectId: 'la-english' });
    expect(rows.map((row) => row.Stream)).toEqual(['East']);
  });

  it('filters teachers by the subject and class they teach', () => {
    expect(buildAnalyticsExportRows(RESULT, 'teachers', { subjectId: 'la-math' })).toHaveLength(1);
    expect(buildAnalyticsExportRows(RESULT, 'teachers', { subjectId: 'la-english' })).toHaveLength(0);
    expect(buildAnalyticsExportRows(RESULT, 'teachers', { classId: 'cg-west' })).toHaveLength(0);
  });

  it('exports one row per recorded trend point', () => {
    const rows = buildAnalyticsExportRows(RESULT, 'trends', {});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ Metric: 'Performance', Period: 'Term 1', Value: '60%' });
  });

  it('quotes a CSV field that contains a comma or a quote', () => {
    const csv = analyticsRowsToCsv([{ id: '1', Teacher: 'Wekesa, "Grace"' }]);
    expect(csv.split('\n')[0]).toBe('Teacher');
    expect(csv.split('\n')[1]).toBe('"Wekesa, ""Grace"""');
  });
});
